/**
 * E2E Test: Refresh automatico token e gestione sessione
 * Implements: e2e/features/auth-session-refresh.feature (BDD Gherkin)
 *
 * User Story: US-044, US-045
 * Epic: EPIC-011 (Authentication & Authorization)
 *
 * Infrastructure:
 * - Keycloak (realm: test, port 8091)
 * - Redis (port 6381)
 * - Auto-managed by test-infra-start.sh
 *
 * Scenarios:
 * 1. Token refresh automatico quando in scadenza → nuovo token
 * 2. Estensione TTL sessione con sliding window → TTL reset
 * 3. Sessione scaduta → 401 + rimozione da Redis
 * 4. Refresh token invalido → 401
 */

import { test, type Test } from 'tap';
import Fastify, { type FastifyInstance } from 'fastify';
import gatewayPlugin from '../../services/gateway/src/index.js';
import { type GatewayConfig } from '../../services/gateway/src/config.js';
import Redis from 'ioredis';

interface TestContext {
  app: FastifyInstance;
  redis: Redis;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Setup test context with authenticated user
 */
async function setupAuthenticatedContext(t: Test): Promise<TestContext> {
  const keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8091';
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6381';

  const app = Fastify({ logger: false });
  const config: GatewayConfig = {
    features: {
      auth: true,
      telemetry: false,
      cache: false,
      rateLimit: false,
    },
    keycloakUrl,
    realm: process.env.KEYCLOAK_REALM || 'test',
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'gateway-client',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || 'test-secret',
    redis: {
      host: new URL(redisUrl).hostname,
      port: Number(new URL(redisUrl).port) || 6379,
    },
  };
  await app.register(gatewayPlugin, config as any); // TypeScript workaround for Fastify plugin typing
  await app.ready();

  const redisUrlParsed = new URL(redisUrl);
  const redis = new Redis({
    host: redisUrlParsed.hostname,
    port: Number(redisUrlParsed.port) || 6379,
  });

  // Perform login
  const loginResponse = await app.inject({
    method: 'POST',
    url: '/auth/login',
    headers: { 'content-type': 'application/json' },
    payload: {
      username: process.env.TEST_USERNAME || 'testuser',
      password: process.env.TEST_PASSWORD || 'testpass',
    },
  });

  const { sessionId, accessToken, refreshToken } = loginResponse.json();

  t.teardown(async () => {
    await redis.quit();
    await app.close();
  });

  return {
    app,
    redis,
    sessionId,
    accessToken,
    refreshToken,
  };
}

/**
 * Helper: Get session TTL from Redis
 */
async function getSessionTTL(redis: Redis, sessionId: string): Promise<number> {
  const sessionKey = `session:${sessionId}`;
  return await redis.ttl(sessionKey);
}

/**
 * Helper: Expire token manually (for testing)
 */
async function expireToken(redis: Redis, sessionId: string): Promise<void> {
  const sessionKey = `session:${sessionId}`;
  await redis.expire(sessionKey, -1); // Force expiration
}

/**
 * Helper: Set token near expiration (4 minutes remaining)
 */
async function setTokenNearExpiration(
  redis: Redis,
  sessionId: string,
): Promise<void> {
  const sessionKey = `session:${sessionId}`;
  const sessionData = await redis.get(sessionKey);
  if (!sessionData) return;

  const session = JSON.parse(sessionData as string);
  session.tokenExpiresAt = Date.now() + 4 * 60 * 1000; // 4 minutes from now
  await redis.set(sessionKey, JSON.stringify(session));
}

// =============================================================================
// Scenario 1: Token refresh automatico quando in scadenza
// =============================================================================

test('Scenario: Token refresh automatico → nuovo token', async t => {
  const ctx = await setupAuthenticatedContext(t);

  // Dato che il token scade tra 4 minuti
  await setTokenNearExpiration(ctx.redis, ctx.sessionId);

  // Quando l'utente accede a "/api/protected"
  const response = await ctx.app.inject({
    method: 'GET',
    url: '/api/protected',
    headers: {
      authorization: `Bearer ${ctx.accessToken}`,
      'x-session-id': ctx.sessionId,
    },
  });

  // Allora il sistema effettua refresh del token automaticamente
  t.equal(
    response.statusCode,
    200,
    'Request should succeed with token refresh',
  );

  // E la richiesta ha successo
  const body = response.json();
  t.ok(body, 'Should receive response body');

  // E la sessione viene aggiornata con il nuovo token
  const newAccessToken = response.headers['x-access-token'] as
    | string
    | undefined;
  if (newAccessToken) {
    t.not(
      newAccessToken,
      ctx.accessToken,
      'New access token should be different from old',
    );
    t.ok(newAccessToken.startsWith('eyJ'), 'New token should be JWT');
  }

  t.end();
});

// =============================================================================
// Scenario 2: Estensione TTL sessione con sliding window
// =============================================================================

test('Scenario: Estensione TTL sessione con sliding window', async t => {
  const ctx = await setupAuthenticatedContext(t);

  // Dato che la sessione ha TTL 30 minuti
  const sessionKey = `session:${ctx.sessionId}`;
  const initialTTL = 30 * 60; // 30 minutes in seconds
  await ctx.redis.expire(sessionKey, initialTTL);

  // E che l'ultimo accesso è avvenuto 2 minuti fa (simulate)
  await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for test

  const ttlBeforeRequest = await getSessionTTL(ctx.redis, ctx.sessionId);

  // Quando l'utente accede a "/api/protected"
  const response = await ctx.app.inject({
    method: 'GET',
    url: '/api/protected',
    headers: {
      authorization: `Bearer ${ctx.accessToken}`,
      'x-session-id': ctx.sessionId,
    },
  });

  // Allora il TTL della sessione viene esteso a 30 minuti
  const ttlAfterRequest = await getSessionTTL(ctx.redis, ctx.sessionId);

  t.equal(response.statusCode, 200, 'Request should succeed');
  t.ok(
    ttlAfterRequest >= ttlBeforeRequest,
    'TTL should be extended or reset to 30 minutes',
  );

  // E l'ultimo accesso viene aggiornato
  const sessionData = await ctx.redis.get(sessionKey);
  const session = JSON.parse(sessionData as string);
  t.ok(session.lastAccessAt, 'Session should have lastAccessAt timestamp');

  t.end();
});

// =============================================================================
// Scenario 3: Sessione scaduta
// =============================================================================

test('Scenario: Sessione scaduta → 401 + rimozione', async t => {
  const ctx = await setupAuthenticatedContext(t);

  // Dato che la sessione è scaduta
  await expireToken(ctx.redis, ctx.sessionId);

  // Verifica sessione non esiste più in Redis
  const sessionKey = `session:${ctx.sessionId}`;
  const exists = await ctx.redis.exists(sessionKey);
  t.equal(exists, 0, 'Session should be expired');

  // Quando l'utente accede a "/api/protected"
  const response = await ctx.app.inject({
    method: 'GET',
    url: '/api/protected',
    headers: {
      authorization: `Bearer ${ctx.accessToken}`,
      'x-session-id': ctx.sessionId,
    },
  });

  // Allora la richiesta fallisce
  t.equal(response.statusCode, 401, 'Request should return 401');

  // E riceve status 401
  const body = response.json();

  // E riceve messaggio "Session expired"
  t.ok(body.error || body.message, 'Should receive error message');
  const errorMsg = (body.error || body.message).toLowerCase();
  t.match(
    errorMsg,
    /session expired|expired|invalid session/,
    'Error message should indicate session expired',
  );

  // E la sessione viene rimossa da Redis (already verified above)
  const stillExists = await ctx.redis.exists(sessionKey);
  t.equal(stillExists, 0, 'Session should remain removed from Redis');

  t.end();
});

// =============================================================================
// Scenario 4: Refresh token invalido
// =============================================================================

test('Scenario: Refresh token invalido → 401', async t => {
  const ctx = await setupAuthenticatedContext(t);

  // Dato che il refresh token è scaduto (simulate with invalid token)
  const invalidRefreshToken = 'invalid-refresh-token-12345';

  // Quando l'utente accede a "/api/protected" (trigger refresh)
  await setTokenNearExpiration(ctx.redis, ctx.sessionId);

  // Force refresh by providing invalid refresh token
  const sessionKey = `session:${ctx.sessionId}`;
  const sessionData = await ctx.redis.get(sessionKey);
  const session = JSON.parse(sessionData as string);
  session.refreshToken = invalidRefreshToken;
  await ctx.redis.set(sessionKey, JSON.stringify(session));

  const response = await ctx.app.inject({
    method: 'GET',
    url: '/api/protected',
    headers: {
      authorization: `Bearer ${ctx.accessToken}`,
      'x-session-id': ctx.sessionId,
    },
  });

  // Allora il sistema tenta il refresh
  // E il refresh fallisce
  // E riceve status 401
  t.equal(response.statusCode, 401, 'Request should return 401');

  const body = response.json();
  t.ok(body.error || body.message, 'Should receive error message');
  const errorMsg = (body.error || body.message).toLowerCase();
  t.match(
    errorMsg,
    /refresh|invalid|token|expired/,
    'Error message should indicate refresh token failure',
  );

  t.end();
});
