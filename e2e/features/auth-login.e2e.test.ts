/**
 * E2E Test: Login e gestione sessioni utente
 * Implements: e2e/features/auth-login.feature (BDD Gherkin)
 *
 * User Story: US-043, US-044
 * Epic: EPIC-011 (Authentication & Authorization)
 *
 * Infrastructure:
 * - Keycloak (realm: test, port 8091)
 * - Redis (port 6381)
 * - Auto-managed by test-infra-start.sh
 *
 * Scenarios:
 * 1. Login con credenziali valide → session in Redis
 * 2. Login con credenziali invalide → 401
 * 3. Accesso risorsa protetta con token → 200
 * 4. Accesso risorsa protetta senza token → 401
 */

import { test, type Test } from 'tap';
import Fastify, { type FastifyInstance } from 'fastify';
import gatewayPlugin from '../../services/gateway/src/index.js';
import { type GatewayConfig } from '../../services/gateway/src/config.js';
import Redis from 'ioredis';

interface TestContext {
  app: FastifyInstance;
  redis: Redis;
  baseUrl: string;
  keycloakUrl: string;
  redisUrl: string;
  realm: string;
  testUser: {
    username: string;
    password: string;
  };
}

/**
 * Setup test context with gateway + Keycloak + Redis
 */
async function setupTestContext(t: Test): Promise<TestContext> {
  // Infrastructure URLs (managed by test-infra-start.sh)
  const keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8091';
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6381';
  const realm = process.env.KEYCLOAK_REALM || 'test';

  // Build gateway with auth enabled
  const app = Fastify({ logger: false });
  const config: GatewayConfig = {
    features: {
      auth: true,
      telemetry: false,
      cache: false,
      rateLimit: false,
    },
    keycloakUrl,
    realm,
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'gateway-client',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || 'test-secret',
    redis: {
      host: new URL(redisUrl).hostname,
      port: Number(new URL(redisUrl).port) || 6379,
    },
  };
  await app.register(gatewayPlugin, config as any); // TypeScript workaround for Fastify plugin typing
  await app.ready();

  // Connect to Redis for session validation
  const redisUrlParsed = new URL(redisUrl);
  const redis = new Redis({
    host: redisUrlParsed.hostname,
    port: Number(redisUrlParsed.port) || 6379,
  });

  t.teardown(async () => {
    await redis.quit();
    await app.close();
  });

  return {
    app,
    redis,
    baseUrl: 'http://localhost:3000',
    keycloakUrl,
    redisUrl,
    realm,
    testUser: {
      username: process.env.TEST_USERNAME || 'testuser',
      password: process.env.TEST_PASSWORD || 'testpass',
    },
  };
}

/**
 * Helper: Perform login and return tokens
 */
async function performLogin(
  app: FastifyInstance,
  username: string,
  password: string,
): Promise<{
  statusCode: number;
  body: {
    accessToken?: string;
    refreshToken?: string;
    sessionId?: string;
    expiresIn?: number;
    error?: string;
    message?: string;
  };
}> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    headers: {
      'content-type': 'application/json',
    },
    payload: {
      username,
      password,
    },
  });

  return {
    statusCode: response.statusCode,
    body: response.json(),
  };
}

/**
 * Helper: Verify session exists in Redis
 */
async function getSessionFromRedis(
  redis: Redis,
  sessionId: string,
): Promise<unknown | null> {
  const sessionKey = `session:${sessionId}`;
  const sessionData = await redis.get(sessionKey);
  return sessionData ? JSON.parse(sessionData as string) : null;
}

// =============================================================================
// Scenario 1: Login con credenziali valide
// =============================================================================

test('Scenario: Login con credenziali valide → session in Redis', async t => {
  const ctx = await setupTestContext(t);

  // Quando l'utente effettua login con username "testuser" e password "testpass"
  const { statusCode, body } = await performLogin(
    ctx.app,
    ctx.testUser.username,
    ctx.testUser.password,
  );

  // Allora il login ha successo
  t.equal(statusCode, 200, 'Login should return 200');

  // E riceve un access token valido
  t.ok(body.accessToken, 'Should receive access token');
  t.type(body.accessToken, 'string', 'Access token should be string');
  t.ok(body.accessToken.startsWith('eyJ'), 'Access token should be JWT');

  // E riceve un refresh token valido
  t.ok(body.refreshToken, 'Should receive refresh token');
  t.type(body.refreshToken, 'string', 'Refresh token should be string');

  // E la sessione viene salvata in Redis
  t.ok(body.sessionId, 'Should receive session ID');
  const sessionData = await getSessionFromRedis(ctx.redis, body.sessionId);
  t.ok(sessionData, 'Session should exist in Redis');
  t.match(
    sessionData,
    {
      sessionId: body.sessionId,
      userId: ctx.testUser.username,
    },
    'Session should contain user data',
  );

  t.end();
});

// =============================================================================
// Scenario 2: Login con credenziali invalide
// =============================================================================

test('Scenario: Login con credenziali invalide → 401', async t => {
  const ctx = await setupTestContext(t);

  // Quando l'utente effettua login con username "testuser" e password "wrong"
  const { statusCode, body } = await performLogin(
    ctx.app,
    ctx.testUser.username,
    'wrong-password',
  );

  // Allora il login fallisce
  t.equal(statusCode, 401, 'Login should return 401');

  // E riceve un errore 401
  t.ok(body.error, 'Should receive error message');
  t.match(
    body.error.toLowerCase(),
    /invalid|unauthorized|credentials/,
    'Error message should indicate invalid credentials',
  );

  // E non viene creata alcuna sessione
  t.notOk(body.sessionId, 'Should not receive session ID');
  t.notOk(body.accessToken, 'Should not receive access token');
  t.notOk(body.refreshToken, 'Should not receive refresh token');

  t.end();
});

// =============================================================================
// Scenario 3: Accesso a risorsa protetta con token valido
// =============================================================================

test('Scenario: Accesso risorsa protetta con token → 200', async t => {
  const ctx = await setupTestContext(t);

  // Dato che l'utente ha effettuato login
  const { body: loginBody } = await performLogin(
    ctx.app,
    ctx.testUser.username,
    ctx.testUser.password,
  );
  const accessToken = loginBody.accessToken!;

  // Quando l'utente accede a "/api/protected" con il token
  const response = await ctx.app.inject({
    method: 'GET',
    url: '/api/protected',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  // Allora la richiesta ha successo
  t.equal(response.statusCode, 200, 'Request should return 200');

  // E riceve status 200
  const body = response.json();
  t.ok(body, 'Should receive response body');
  t.ok(body.user || body.data, 'Response should contain user or data');

  t.end();
});

// =============================================================================
// Scenario 4: Accesso a risorsa protetta senza token
// =============================================================================

test('Scenario: Accesso risorsa protetta senza token → 401', async t => {
  const ctx = await setupTestContext(t);

  // Quando l'utente accede a "/api/protected" senza token
  const response = await ctx.app.inject({
    method: 'GET',
    url: '/api/protected',
  });

  // Allora la richiesta fallisce
  t.equal(response.statusCode, 401, 'Request should return 401');

  // E riceve status 401
  const body = response.json();

  // E riceve messaggio "Missing or invalid token"
  t.ok(body.error || body.message, 'Should receive error message');
  const errorMsg = (body.error || body.message).toLowerCase();
  t.match(
    errorMsg,
    /missing|invalid|token|unauthorized/,
    'Error message should indicate missing or invalid token',
  );

  t.end();
});
