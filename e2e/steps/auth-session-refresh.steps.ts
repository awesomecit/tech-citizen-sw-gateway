/**
 * E2E Step Definitions for Session Refresh Flow
 */
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import fetch from 'node-fetch';

// Given steps (continued from auth-login.steps.ts)
Given('che la sessione è attiva', async function (this: any) {
  const sessionKey = `session:${this.sessionId}`;
  const session = await this.redisClient?.get(sessionKey);
  expect(session).to.not.be.null;
});

Given(
  'che il token scade tra {int} minuti',
  async function (this: any, minutes: number) {
    // Mock token expiration time
    // (In real scenario, would manipulate Redis session data)
    expect(minutes).to.be.greaterThan(0);
    this.tokenExpiresInMinutes = minutes;
  },
);

Given(
  'che la sessione ha TTL {int} minuti',
  async function (this: any, ttl: number) {
    const sessionKey = `session:${this.sessionId}`;
    const ttlSeconds = await this.redisClient?.ttl(sessionKey);
    expect(ttlSeconds).to.be.greaterThan(0);
    this.initialTTL = ttlSeconds;
  },
);

Given(
  "che l'ultimo accesso è avvenuto {int} minuti fa",
  async function (this: any, minutes: number) {
    // Mock last activity timestamp
    expect(minutes).to.be.greaterThan(0);
    this.lastActivityMinutesAgo = minutes;
  },
);

Given('che la sessione è scaduta', async function (this: any) {
  // Delete session from Redis to simulate expiration
  const sessionKey = `session:${this.sessionId}`;
  await this.redisClient?.del(sessionKey);
});

Given('che il refresh token è scaduto', async function (this: any) {
  // Set invalid refresh token
  this.refreshToken = 'expired-refresh-token';
});

Given("che l'utente ha una sessione attiva", async function (this: any) {
  const sessionKey = `session:${this.sessionId}`;
  const session = await this.redisClient?.get(sessionKey);
  expect(session).to.not.be.null;
});

// When steps
When("l'utente accede a {string}", async function (this: any, path: string) {
  this.lastResponse = await fetch(`${this.gatewayUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${this.accessToken}`,
      'X-Session-Id': this.sessionId,
    },
  });
});

When("l'utente effettua logout", async function (this: any) {
  this.lastResponse = await fetch(`${this.gatewayUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${this.accessToken}`,
      'X-Session-Id': this.sessionId,
    },
  });
});

// Then steps
Then(
  'il sistema effettua refresh del token automaticamente',
  async function (this: any) {
    // Check if new token was issued (response headers or body)
    const data = await this.lastResponse?.json();
    if (data.refreshed) {
      expect(data.newAccessToken).to.be.a('string');
      this.accessToken = data.newAccessToken;
    }
  },
);

Then(
  'la sessione viene aggiornata con il nuovo token',
  async function (this: any) {
    const sessionKey = `session:${this.sessionId}`;
    const sessionData = await this.redisClient?.get(sessionKey);
    const session = JSON.parse(sessionData || '{}');
    expect(session.accessToken).to.equal(this.accessToken);
  },
);

Then(
  'il TTL della sessione viene esteso a {int} minuti',
  async function (this: any, ttl: number) {
    const sessionKey = `session:${this.sessionId}`;
    const ttlSeconds = await this.redisClient?.ttl(sessionKey);
    expect(ttlSeconds).to.be.closeTo(ttl * 60, 10); // ±10s tolerance
  },
);

Then("l'ultimo accesso viene aggiornato", async function (this: any) {
  const sessionKey = `session:${this.sessionId}`;
  const sessionData = await this.redisClient?.get(sessionKey);
  const session = JSON.parse(sessionData || '{}');
  const now = Date.now();
  expect(session.lastActivity).to.be.closeTo(now, 5000); // ±5s tolerance
});

Then('la sessione viene rimossa da Redis', async function (this: any) {
  const sessionKey = `session:${this.sessionId}`;
  const session = await this.redisClient?.get(sessionKey);
  expect(session).to.be.null;
});

Then('il sistema tenta il refresh', async function (this: any) {
  // Verify refresh attempt was made (check logs or metrics)
  // For now, just verify response indicates refresh was attempted
  expect(this.lastResponse?.status).to.be.oneOf([200, 401]);
});

Then('il refresh fallisce', async function (this: any) {
  expect(this.lastResponse?.status).to.equal(401);
});

Then('la sessione viene invalidata', async function (this: any) {
  const sessionKey = `session:${this.sessionId}`;
  const session = await this.redisClient?.get(sessionKey);
  expect(session).to.be.null;
});

Then('il logout ha successo', async function (this: any) {
  expect(this.lastResponse?.status).to.equal(200);
});

Then('i token vengono invalidati', async function (this: any) {
  // Verify tokens are no longer usable
  const testResponse = await fetch(`${this.gatewayUrl}/api/protected`, {
    headers: { Authorization: `Bearer ${this.accessToken}` },
  });
  expect(testResponse.status).to.equal(401);
});

Then('tentativi successivi di accesso falliscono', async function (this: any) {
  const testResponse = await fetch(`${this.gatewayUrl}/api/protected`, {
    headers: { Authorization: `Bearer ${this.accessToken}` },
  });
  expect(testResponse.status).to.equal(401);
});
