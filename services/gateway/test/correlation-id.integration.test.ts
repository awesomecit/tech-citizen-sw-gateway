/**
 * Integration tests for Correlation ID (X-Request-ID)
 * Tests request tracking across all routes
 */
import { test } from 'tap';
import Fastify, { type FastifyInstance } from 'fastify';
import plugin from '../src/index.js';

test('Gateway Correlation ID Integration', async t => {
  let app: FastifyInstance;

  t.beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(plugin, {
      config: { features: { telemetry: false, auth: false } },
    });
    await app.ready();
  });

  t.afterEach(async () => {
    await app.close();
  });

  await t.test('should generate X-Request-ID when not provided', async t => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    t.equal(response.statusCode, 200, 'returns 200 OK');
    t.ok(response.headers['x-request-id'], 'has X-Request-ID header');
    t.match(
      response.headers['x-request-id'],
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      'X-Request-ID is valid UUID',
    );
  });

  await t.test('should preserve custom X-Request-ID', async t => {
    const customRequestId = 'custom-request-id-12345';

    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-request-id': customRequestId,
      },
    });

    t.equal(response.statusCode, 200, 'returns 200 OK');
    t.equal(
      response.headers['x-request-id'],
      customRequestId,
      'preserves custom request ID',
    );
  });

  await t.test('should include requestId in all routes', async t => {
    const routes = ['/health', '/'];

    for (const route of routes) {
      const response = await app.inject({
        method: 'GET',
        url: route,
      });

      t.ok(
        response.headers['x-request-id'],
        `${route} has X-Request-ID header`,
      );
      t.match(
        response.headers['x-request-id'],
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        `${route} X-Request-ID is valid UUID`,
      );
    }
  });

  await t.test('should generate unique requestId for each request', async t => {
    const response1 = await app.inject({ method: 'GET', url: '/health' });
    const response2 = await app.inject({ method: 'GET', url: '/health' });

    const requestId1 = response1.headers['x-request-id'];
    const requestId2 = response2.headers['x-request-id'];

    t.ok(requestId1, 'first request has request ID');
    t.ok(requestId2, 'second request has request ID');
    t.not(requestId1, requestId2, 'request IDs are unique');
  });

  await t.test('should work with metrics endpoint', async t => {
    // Start Redis container for this test
    const { GenericContainer: Container } = await import('testcontainers');
    const redisContainer = await new Container('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    const redisPort = redisContainer.getMappedPort(6379);

    const appWithTelemetry = Fastify({ logger: false });
    await appWithTelemetry.register(plugin, {
      config: {
        features: { telemetry: true, auth: false },
        redis: { host: 'localhost', port: redisPort },
      },
    });
    await appWithTelemetry.ready();

    const customRequestId = 'test-correlation-id-12345';

    // Make request with custom requestId
    const response1 = await appWithTelemetry.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-request-id': customRequestId,
      },
    });

    t.equal(response1.statusCode, 200, 'health check succeeds');
    t.equal(
      response1.headers['x-request-id'],
      customRequestId,
      'preserves custom request ID',
    );

    // Verify metrics endpoint works independently
    const response2 = await appWithTelemetry.inject({
      method: 'GET',
      url: '/metrics',
    });

    t.equal(response2.statusCode, 200, 'metrics endpoint succeeds');
    t.ok(
      response2.headers['x-request-id'],
      'metrics request has its own request ID',
    );
    t.match(response2.body, /http_requests_total/, 'metrics recorded');

    await appWithTelemetry.close();
    await redisContainer.stop();
  });
});
