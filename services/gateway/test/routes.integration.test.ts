/**
 * Integration tests for Gateway Routes
 * Tests basic route functionality with real Redis container
 */
import { test } from 'tap';
import Fastify, { type FastifyInstance } from 'fastify';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import plugin from '../src/index.js';

test('Gateway Routes', async t => {
  let app: FastifyInstance;
  let redisContainer: StartedTestContainer;

  t.before(async () => {
    // Start Redis container for integration tests
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    const redisPort = redisContainer.getMappedPort(6379);

    app = Fastify({ logger: false });
    await app.register(plugin, {
      config: {
        features: { telemetry: false, auth: false },
        redis: { host: 'localhost', port: redisPort },
      },
    });
    await app.ready();
  });

  t.teardown(async () => {
    await app.close();
    await redisContainer.stop();
  });

  await t.test('GET /health returns 200', async t => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    t.equal(response.statusCode, 200, 'returns 200 OK');

    const body = response.json();
    t.equal(body.status, 'ok', 'status is ok');
    t.equal(body.service, 'api-gateway', 'service is api-gateway');
    t.equal(body.version, '1.0.0', 'version is 1.0.0');
    t.ok(body.timestamp, 'has timestamp');
    t.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/, 'timestamp is ISO 8601');
  });

  await t.test('GET / returns hello message', async t => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    t.equal(response.statusCode, 200, 'returns 200 OK');

    const body = response.json();
    t.equal(
      body.message,
      'API Gateway Suite - Hello World',
      'returns hello message',
    );
  });

  await t.test(
    'GET /api/protected with auth enabled requires token',
    async t => {
      const redisPort = redisContainer.getMappedPort(6379);

      console.log('🔍 Starting test with Redis port:', redisPort);

      const appWithAuth = Fastify({ logger: { level: 'debug' } });

      console.log('📝 Registering plugin with config:', {
        features: { telemetry: false, auth: true },
        keycloakUrl: 'http://localhost:8080',
        realm: 'test',
        clientId: 'test-client',
        redis: { host: 'localhost', port: redisPort },
      });

      await appWithAuth.register(plugin, {
        config: {
          features: { telemetry: false, auth: true },
          keycloakUrl: 'http://localhost:8080',
          realm: 'test',
          clientId: 'test-client',
          redis: { host: 'localhost', port: redisPort },
        },
      });

      console.log('⏳ Waiting for app.ready()...');
      await appWithAuth.ready();
      console.log('✅ App ready');

      const response = await appWithAuth.inject({
        method: 'GET',
        url: '/api/protected',
      });

      t.equal(
        response.statusCode,
        401,
        'returns 401 Unauthorized without token',
      );

      await appWithAuth.close();
    },
  );

  await t.test('POST /api/auth/login accepts credentials', async t => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: 'testuser',
        password: 'testpass',
      },
    });

    t.equal(response.statusCode, 200, 'returns 200 OK');

    const body = response.json();
    t.ok(body.sessionId, 'returns sessionId');
    t.ok(body.accessToken, 'returns accessToken');
    t.ok(body.refreshToken, 'returns refreshToken');
  });

  await t.test('POST /api/auth/login rejects missing credentials', async t => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {},
    });

    t.equal(response.statusCode, 400, 'returns 400 Bad Request');
  });

  await t.test('POST /api/auth/session creates session', async t => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/session',
      headers: {
        Authorization: 'Bearer mock-access-token',
      },
      payload: {
        refreshToken: 'mock-refresh-token',
      },
    });

    t.equal(response.statusCode, 200, 'returns 200 OK');

    const body = response.json();
    t.ok(body.sessionId, 'returns sessionId');
  });

  await t.test('POST /api/auth/logout invalidates session', async t => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        Authorization: 'Bearer mock-token',
        'X-Session-Id': 'test-session-id',
      },
    });

    t.equal(response.statusCode, 200, 'returns 200 OK');

    const body = response.json();
    t.equal(body.success, true, 'logout succeeds');
  });
});
