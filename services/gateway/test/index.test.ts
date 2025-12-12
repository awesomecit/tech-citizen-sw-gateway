// Unit tests for gateway plugin with tap (coverage-enabled)
// Tests business logic WITHOUT Redis/Keycloak infrastructure

import { test } from 'tap';
import Fastify, { type FastifyInstance } from 'fastify';
import plugin from '../src/index.js';

test('Gateway Plugin - Unit Tests', async (t) => {
  let app: FastifyInstance;

  t.beforeEach(async () => {
    // Fresh Fastify instance for each test
    app = Fastify({ logger: false });

    // Register REAL gateway plugin with features disabled (no infra needed)
    await app.register(plugin, {
      config: {
        features: {
          auth: false,      // No Redis/Keycloak
          cache: false,     // No Redis
          telemetry: true,  // Prometheus metrics enabled
          rateLimit: false,
        },
      },
    });
    await app.ready();
  });

  t.afterEach(async () => {
    await app.close();
  });

  await t.test('Health endpoint', async (t) => {
    await t.test('returns 200 OK with health status', async (t) => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      t.equal(res.statusCode, 200, 'status is 200');
      
      const json = res.json();
      t.equal(json.status, 'ok', 'status is ok');
      t.equal(json.service, 'api-gateway', 'service name correct');
      t.equal(json.version, '1.0.0', 'version correct');
      t.match(json.timestamp, /^\d{4}-\d{2}-\d{2}T/, 'timestamp is ISO 8601');
    });

    await t.test('includes valid ISO 8601 timestamp', async (t) => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      const json = res.json();
      const timestamp = new Date(json.timestamp);
      t.not(timestamp.toString(), 'Invalid Date', 'timestamp is valid');
    });
  });

  await t.test('Root endpoint (Hello World)', async (t) => {
    await t.test('returns welcome message', async (t) => {
      const res = await app.inject({ method: 'GET', url: '/' });
      t.equal(res.statusCode, 200, 'status is 200');
      t.same(res.json(), { message: 'API Gateway Suite - Hello World' }, 'message correct');
    });

    await t.test('returns JSON content-type', async (t) => {
      const res = await app.inject({ method: 'GET', url: '/' });
      t.match(res.headers['content-type'], /application\/json/, 'content-type is JSON');
    });
  });

  await t.test('Metrics endpoint', async (t) => {
    await t.test('exposes /metrics with Prometheus format', async (t) => {
      const res = await app.inject({ method: 'GET', url: '/metrics' });
      t.equal(res.statusCode, 200, 'status is 200');
      t.match(res.headers['content-type'], /text\/plain/, 'content-type is text/plain');
    });

    await t.test('includes default Node.js metrics', async (t) => {
      const res = await app.inject({ method: 'GET', url: '/metrics' });
      const body = res.body;
      t.match(body, /process_cpu/, 'includes process CPU metrics');
      t.match(body, /gateway_/, 'includes gateway prefix');
    });
  });

  await t.test('Correlation ID (X-Request-ID)', async (t) => {
    await t.test('adds X-Request-ID if missing', async (t) => {
      const res = await app.inject({ method: 'GET', url: '/' });
      t.ok(res.headers['x-request-id'], 'X-Request-ID is present');
      t.match(
        res.headers['x-request-id'],
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        'X-Request-ID is valid UUID v4'
      );
    });

    await t.test('preserves existing X-Request-ID', async (t) => {
      const requestId = 'test-correlation-123';
      const res = await app.inject({
        method: 'GET',
        url: '/',
        headers: { 'x-request-id': requestId },
      });
      t.equal(res.headers['x-request-id'], requestId, 'preserves custom request ID');
    });

    await t.test('generates unique IDs per request', async (t) => {
      const res1 = await app.inject({ method: 'GET', url: '/health' });
      const res2 = await app.inject({ method: 'GET', url: '/' });
      
      t.ok(res1.headers['x-request-id'], 'first request has ID');
      t.ok(res2.headers['x-request-id'], 'second request has ID');
      t.not(res1.headers['x-request-id'], res2.headers['x-request-id'], 'IDs are unique');
    });
  });

  await t.test('HTTP method support', async (t) => {
    await t.test('supports GET on root endpoint', async (t) => {
      const res = await app.inject({ method: 'GET', url: '/' });
      t.equal(res.statusCode, 200, 'GET / returns 200');
    });

    await t.test('rejects POST on root endpoint', async (t) => {
      const res = await app.inject({ method: 'POST', url: '/' });
      t.equal(res.statusCode, 404, 'POST / returns 404 (not registered)');
    });

    await t.test('supports GET on health endpoint', async (t) => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      t.equal(res.statusCode, 200, 'GET /health returns 200');
    });
  });

  await t.test('Error handling (404)', async (t) => {
    await t.test('returns 404 for non-existent routes', async (t) => {
      const res = await app.inject({ method: 'GET', url: '/non-existent' });
      t.equal(res.statusCode, 404, 'returns 404');
    });

    await t.test('returns JSON error for 404', async (t) => {
      const res = await app.inject({ method: 'GET', url: '/invalid' });
      t.match(res.headers['content-type'], /application\/json/, 'error is JSON');
      t.ok(res.json().error, 'error object present');
    });
  });

  await t.test('Request hooks execution', async (t) => {
    await t.test('onRequest hook adds correlation ID', async (t) => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      t.ok(res.headers['x-request-id'], 'correlation ID added by hook');
    });

    await t.test('onResponse hook executes without errors', async (t) => {
      const res = await app.inject({ method: 'GET', url: '/' });
      t.equal(res.statusCode, 200, 'request completes successfully');
    });

    await t.test('hooks handle multiple concurrent requests', async (t) => {
      const [res1, res2, res3] = await Promise.all([
        app.inject({ method: 'GET', url: '/health' }),
        app.inject({ method: 'GET', url: '/' }),
        app.inject({ method: 'GET', url: '/metrics' }),
      ]);
      
      t.equal(res1.statusCode, 200, 'first request succeeds');
      t.equal(res2.statusCode, 200, 'second request succeeds');
      t.equal(res3.statusCode, 200, 'third request succeeds');
      
      t.not(res1.headers['x-request-id'], res2.headers['x-request-id'], 'unique IDs preserved');
    });
  });
});
