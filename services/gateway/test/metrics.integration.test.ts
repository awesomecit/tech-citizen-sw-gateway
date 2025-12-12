/**
 * Integration tests for Prometheus Metrics
 * Tests /metrics endpoint and metric recording with Redis container
 */
import { test } from 'tap';
import Fastify, { type FastifyInstance } from 'fastify';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import plugin from '../src/index.js';

test('Gateway Metrics Integration', async t => {
  let app: FastifyInstance;
  let redisContainer: StartedTestContainer;

  t.before(async () => {
    // Start Redis container once for all tests
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();
  });

  t.teardown(async () => {
    await redisContainer.stop();
  });

  t.beforeEach(async () => {
    const redisPort = redisContainer.getMappedPort(6379);
    app = Fastify({ logger: false });
    await app.register(plugin, {
      config: {
        features: { telemetry: true, auth: false },
        redis: { host: 'localhost', port: redisPort },
      },
    });
    await app.ready();
  });

  t.afterEach(async () => {
    await app.close();
  });

  await t.test('should expose /metrics endpoint', async t => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    t.equal(response.statusCode, 200, 'returns 200 OK');
    t.match(
      response.headers['content-type'],
      /text\/plain/,
      'returns text/plain content type',
    );
  });

  await t.test('should return Prometheus text format', async t => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    const body = response.body;

    // Check for default metrics
    t.match(body, /# HELP gateway_/, 'contains default metrics help');
    t.match(body, /# TYPE gateway_/, 'contains default metrics type');

    // Check for custom metrics
    t.match(
      body,
      /# HELP http_request_duration_ms/,
      'contains request duration help',
    );
    t.match(
      body,
      /# TYPE http_request_duration_ms histogram/,
      'duration is histogram type',
    );
    t.match(body, /# HELP http_requests_total/, 'contains total requests help');
    t.match(
      body,
      /# TYPE http_requests_total counter/,
      'total is counter type',
    );
  });

  await t.test('should record request metrics', async t => {
    // Make a request to generate metrics
    await app.inject({
      method: 'GET',
      url: '/health',
    });

    // Fetch metrics
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    const body = response.body;

    // Check that HTTP metrics were recorded
    t.match(body, /http_request_duration_ms/, 'records request duration');
    t.match(body, /http_requests_total/, 'records total requests');
    t.match(body, /method="GET"/, 'labels method');
    t.match(body, /route="\/health"/, 'labels route');
    t.match(body, /status="200"/, 'labels status');
  });

  await t.test('should have histogram buckets configured', async t => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    const body = response.body;

    // Check for expected buckets (10, 50, 100, 300, 500, 1000, 3000, 5000)
    t.match(body, /le="10"/, 'has 10ms bucket');
    t.match(body, /le="50"/, 'has 50ms bucket');
    t.match(body, /le="100"/, 'has 100ms bucket');
    t.match(body, /le="300"/, 'has 300ms bucket');
    t.match(body, /le="500"/, 'has 500ms bucket');
    t.match(body, /le="1000"/, 'has 1000ms bucket');
    t.match(body, /le="3000"/, 'has 3000ms bucket');
    t.match(body, /le="5000"/, 'has 5000ms bucket');
  });

  await t.test('should not expose metrics when telemetry disabled', async t => {
    const redisPort = redisContainer.getMappedPort(6379);
    const appNoTelemetry = Fastify({ logger: false });
    await appNoTelemetry.register(plugin, {
      config: {
        features: { telemetry: false, auth: false },
        redis: { host: 'localhost', port: redisPort },
      },
    });
    await appNoTelemetry.ready();

    const response = await appNoTelemetry.inject({
      method: 'GET',
      url: '/metrics',
    });

    t.equal(response.statusCode, 404, 'metrics endpoint not found');

    await appNoTelemetry.close();
  });
});
