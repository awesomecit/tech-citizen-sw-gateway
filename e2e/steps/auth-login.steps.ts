/**
 * E2E Step Definitions for Auth Login Flow
 * Uses Testcontainers for Keycloak + Redis
 */
import {
  Before,
  After,
  Given,
  When,
  Then,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import { expect } from 'chai';
import fetch, { Response } from 'node-fetch';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Redis } from 'ioredis';

setDefaultTimeout(60000); // 1 minute for container startup

interface TestWorld {
  gatewayUrl: string;
  keycloakContainer?: StartedTestContainer;
  redisContainer?: StartedTestContainer;
  redisClient?: Redis;
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  lastResponse?: Response;
}

const world: TestWorld = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:3000',
};

// Setup: Start containers before all scenarios
Before(async function (this: TestWorld) {
  console.log('🐳 Starting test containers...');

  // Start Redis
  world.redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();

  const redisPort = world.redisContainer.getMappedPort(6379);
  world.redisClient = new Redis({
    host: 'localhost',
    port: redisPort,
  });

  // Start Keycloak
  world.keycloakContainer = await new GenericContainer(
    'quay.io/keycloak/keycloak:26.0',
  )
    .withEnvironment({
      KEYCLOAK_ADMIN: 'admin',
      KEYCLOAK_ADMIN_PASSWORD: 'admin',
    })
    .withCommand(['start-dev'])
    .withExposedPorts(8080)
    .start();

  console.log('✅ Test containers ready');
});

// Teardown: Stop containers after all scenarios
After(async function (this: TestWorld) {
  console.log('🧹 Cleaning up test containers...');

  if (world.redisClient) {
    await world.redisClient.quit();
  }

  if (world.redisContainer) {
    await world.redisContainer.stop();
  }

  if (world.keycloakContainer) {
    await world.keycloakContainer.stop();
  }

  console.log('✅ Cleanup complete');
});

// Given steps
Given('che il gateway è in esecuzione', async function (this: TestWorld) {
  const response = await fetch(`${world.gatewayUrl}/health`);
  expect(response.status).to.equal(200);
});

Given(
  'che Keycloak è configurato con realm {string}',
  async function (this: TestWorld, realm: string) {
    const { setupKeycloakRealm } = await import('../helpers/keycloak-setup.js');
    const keycloakPort = world.keycloakContainer?.getMappedPort(8080);
    const keycloakUrl = `http://localhost:${keycloakPort}`;

    await setupKeycloakRealm(
      {
        adminUrl: keycloakUrl,
        adminUser: 'admin',
        adminPassword: 'admin',
        realm,
        clientId: 'test-client',
        redirectUris: ['http://localhost:3000/*'],
      },
      [], // Users created in separate step
    );
  },
);

Given(
  'che esiste un utente {string} con password {string}',
  async function (this: TestWorld, username: string, password: string) {
    const { setupKeycloakRealm } = await import('../helpers/keycloak-setup.js');
    const keycloakPort = world.keycloakContainer?.getMappedPort(8080);
    const keycloakUrl = `http://localhost:${keycloakPort}`;

    await setupKeycloakRealm(
      {
        adminUrl: keycloakUrl,
        adminUser: 'admin',
        adminPassword: 'admin',
        realm: 'test',
        clientId: 'test-client',
        redirectUris: ['http://localhost:3000/*'],
      },
      [
        {
          username,
          password,
          email: `${username}@test.local`,
          firstName: 'Test',
          lastName: 'User',
        },
      ],
    );
  },
);

Given("che l'utente ha effettuato login", async function (this: TestWorld) {
  const response = await fetch(`${world.gatewayUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'testuser',
      password: 'testpass',
    }),
  });

  expect(response.status).to.equal(200);
  const data = await response.json();
  world.accessToken = data.accessToken;
  world.refreshToken = data.refreshToken;
  world.sessionId = data.sessionId;
});

// When steps
When(
  "l'utente effettua login con username {string} e password {string}",
  async function (this: TestWorld, username: string, password: string) {
    const { loginUser } = await import('../helpers/keycloak-setup.js');
    const keycloakPort = world.keycloakContainer?.getMappedPort(8080);
    const keycloakUrl = `http://localhost:${keycloakPort}`;

    try {
      const tokens = await loginUser(
        keycloakUrl,
        'test',
        'test-client',
        username,
        password,
      );
      world.accessToken = tokens.accessToken;
      world.refreshToken = tokens.refreshToken;

      // Call gateway to create session
      world.lastResponse = await fetch(`${world.gatewayUrl}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (world.lastResponse.ok) {
        const data = (await world.lastResponse.json()) as { sessionId: string };
        world.sessionId = data.sessionId;
      }
    } catch (error) {
      // Store error response for "Then" assertions
      world.lastResponse = {
        ok: false,
        status: 401,
      } as Response;
    }
  },
);

When(
  "l'utente accede a {string} con il token",
  async function (this: TestWorld, path: string) {
    world.lastResponse = await fetch(`${world.gatewayUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${world.accessToken}`,
      },
    });
  },
);

When(
  "l'utente accede a {string} senza token",
  async function (this: TestWorld, path: string) {
    world.lastResponse = await fetch(`${world.gatewayUrl}${path}`);
  },
);

// Then steps
Then('il login ha successo', async function (this: TestWorld) {
  expect(world.lastResponse?.status).to.equal(200);
});

Then('il login fallisce', async function (this: TestWorld) {
  expect(world.lastResponse?.status).to.equal(401);
});

Then('riceve un access token valido', async function (this: TestWorld) {
  const data = await world.lastResponse?.json();
  expect(data.accessToken).to.be.a('string');
  expect(data.accessToken.length).to.be.greaterThan(0);
  world.accessToken = data.accessToken;
});

Then('riceve un refresh token valido', async function (this: TestWorld) {
  const data = await world.lastResponse?.json();
  expect(data.refreshToken).to.be.a('string');
  expect(data.refreshToken.length).to.be.greaterThan(0);
  world.refreshToken = data.refreshToken;
});

Then('la sessione viene salvata in Redis', async function (this: TestWorld) {
  const data = await world.lastResponse?.json();
  const sessionKey = `session:${data.sessionId}`;
  const session = await world.redisClient?.get(sessionKey);
  expect(session).to.not.be.null;
});

Then(
  'riceve un errore {int}',
  async function (this: TestWorld, statusCode: number) {
    expect(world.lastResponse?.status).to.equal(statusCode);
  },
);

Then('non viene creata alcuna sessione', async function (this: TestWorld) {
  const keys = await world.redisClient?.keys('session:*');
  expect(keys?.length).to.equal(0);
});

Then('la richiesta ha successo', async function (this: TestWorld) {
  expect(world.lastResponse?.status).to.equal(200);
});

Then('la richiesta fallisce', async function (this: TestWorld) {
  expect(world.lastResponse?.status).to.be.greaterThanOrEqual(400);
});

Then(
  'riceve status {int}',
  async function (this: TestWorld, statusCode: number) {
    expect(world.lastResponse?.status).to.equal(statusCode);
  },
);

Then(
  'riceve messaggio {string}',
  async function (this: TestWorld, message: string) {
    const data = await world.lastResponse?.json();
    expect(data.message).to.include(message);
  },
);
