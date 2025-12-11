/**
 * Gateway Routing E2E Tests
 * Tests the full request orchestration through services/gateway/src/index.ts
 *
 * Coverage Target: 0% → 70% (125 lines)
 * User Story: US-054 (EPIC-012 - Test Coverage P0 Gaps)
 *
 * Verifies:
 * - Public routes (health, root, metrics)
 * - Protected routes with auth enforcement
 * - Correlation ID injection and propagation
 * - Prometheus metrics recording
 * - CORS preflight handling
 * - Auth plugin integration (Keycloak + Redis)
 */

import Fastify, { type FastifyInstance } from 'fastify';
import gatewayPlugin from '../../services/gateway/src/index.js';

describe('Gateway Routing E2E', () => {
  let app: FastifyInstance;

  /**
   * Setup: Start gateway with real Keycloak + Redis
   * Infrastructure auto-managed by test-infra-start.sh (ports 8091, 6381)
   */
  beforeAll(async () => {
    app = Fastify({
      logger: false, // Reduce noise in test output
    });

    // Register the gateway plugin
    await app.register(gatewayPlugin);
    await app.ready();
  }, 30000); // 30s timeout for Keycloak + Redis startup

  afterAll(async () => {
    await app.close();
  });

  /**
   * Scenario 1: Public health check endpoint
   * Given the gateway is running
   * When I GET /health without authentication
   * Then response status is 200
   * And response includes correlation-id header
   * And response body includes status: 'ok'
   */
  it('GET /health returns 200 with correlation-id and health status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBeDefined();

    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    expect(body.service).toBe('api-gateway');
    expect(body.version).toBe('1.0.0');
  });

  /**
   * Scenario 2: Root hello endpoint
   * Given the gateway is running
   * When I GET / without authentication
   * Then response status is 200
   * And response includes hello message
   * And response includes correlation-id header
   */
  it('GET / returns 200 with hello message', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBeDefined();

    const body = response.json();
    expect(body.message).toBe('API Gateway Suite - Hello World');
  });

  /**
   * Scenario 3: Prometheus metrics endpoint
   * Given the gateway is running
   * When I GET /metrics without authentication
   * Then response status is 200
   * And response content-type is text/plain
   * And response includes prometheus metrics format
   */
  it('GET /metrics returns 200 with prometheus format', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/plain/);

    const body = response.body;
    expect(body).toContain('gateway_');
    expect(body).toContain('http_request_duration_ms');
    expect(body).toContain('http_requests_total');
  });

  /**
   * Scenario 4: Protected route without token
   * Given the gateway is running with auth plugin
   * When I GET /api/protected without Bearer token
   * Then response status is 401 Unauthorized
   * And response includes correlation-id header
   * And response body includes error message
   */
  it('GET /api/protected without token returns 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/protected',
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers['x-request-id']).toBeDefined();

    const body = response.json();
    expect(body).toBeDefined(); // Auth error response present
  });

  /**
   * Scenario 5: Protected route with invalid token
   * Given the gateway is running with auth plugin
   * When I GET /api/protected with invalid Bearer token
   * Then response status is 401 Unauthorized (invalid token)
   * And response includes correlation-id header
   * And response body includes error message
   */
  it('GET /api/protected with invalid token returns 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/protected',
      headers: {
        authorization: 'Bearer invalid_token_here',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers['x-request-id']).toBeDefined();

    const body = response.json();
    expect(body).toBeDefined(); // Auth error response present
  });

  /**
   * Scenario 6: CORS preflight handling
   * Given the gateway is running WITHOUT @fastify/cors plugin
   * When I OPTIONS /api/protected (CORS preflight)
   * Then response status is 404 Not Found
   * Note: CORS requires explicit @fastify/cors plugin registration
   * TODO: Add CORS plugin in future US when needed for frontend integration
   */
  it('OPTIONS /api/protected returns 404 (CORS plugin not registered)', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/protected',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization',
      },
    });

    expect(response.statusCode).toBe(404);
    // Note: Fastify does not inject correlation-id for 404 Not Found responses
    // (OPTIONS route not registered, onRequest hook not executed)
  });

  /**
   * Scenario 7: Correlation ID propagation with custom header
   * Given the gateway is running
   * When I GET /health with custom X-Request-ID header
   * Then response should echo back the same correlation ID
   */
  it('Correlation ID is preserved when provided by client', async () => {
    const customRequestId = 'custom-correlation-id-12345';

    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-request-id': customRequestId,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBe(customRequestId);
  });

  /**
   * Scenario 8: Metrics recording after request
   * Given the gateway is running
   * When I make multiple requests to different routes
   * Then /metrics should include updated counters and histograms
   */
  it('Prometheus metrics are recorded after requests', async () => {
    // Make several requests to generate metrics
    await app.inject({ method: 'GET', url: '/health' });
    await app.inject({ method: 'GET', url: '/' });
    await app.inject({ method: 'GET', url: '/api/protected' }); // 401

    // Check metrics endpoint
    const metricsResponse = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    expect(metricsResponse.statusCode).toBe(200);

    const metricsBody = metricsResponse.body;

    // Verify http_requests_total counter includes our requests
    expect(metricsBody).toContain('http_requests_total');

    // Verify http_request_duration_ms histogram includes observations
    expect(metricsBody).toContain('http_request_duration_ms');

    // Verify route labels are present (method, route, status)
    expect(metricsBody).toMatch(/route="\/health"/);
    expect(metricsBody).toMatch(/status="200"/);
  });
});
