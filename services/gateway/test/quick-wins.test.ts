import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import plugin from '../src/index.js';

describe('Gateway Quick Wins - Metrics & Correlation ID', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(plugin);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Prometheus Metrics', () => {
    it('should expose /metrics endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/plain/);
    });

    it('should return Prometheus text format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics',
      });

      const body = response.body;

      // Check for default metrics
      expect(body).toContain('# HELP gateway_');
      expect(body).toContain('# TYPE gateway_');

      // Check for custom metrics
      expect(body).toContain('# HELP http_request_duration_ms');
      expect(body).toContain('# TYPE http_request_duration_ms histogram');
      expect(body).toContain('# HELP http_requests_total');
      expect(body).toContain('# TYPE http_requests_total counter');
    });

    it('should record request metrics', async () => {
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
      expect(body).toContain('http_request_duration_ms');
      expect(body).toContain('http_requests_total');
      expect(body).toContain('method="GET"');
      expect(body).toContain('route="/health"');
      expect(body).toContain('status="200"');
    });

    it('should have histogram buckets configured', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics',
      });

      const body = response.body;

      // Check for expected buckets (10, 50, 100, 300, 500, 1000, 3000, 5000)
      expect(body).toContain('le="10"');
      expect(body).toContain('le="50"');
      expect(body).toContain('le="100"');
      expect(body).toContain('le="300"');
      expect(body).toContain('le="500"');
      expect(body).toContain('le="1000"');
      expect(body).toContain('le="3000"');
      expect(body).toContain('le="5000"');
      expect(body).toContain('le="+Inf"');
    });
  });

  describe('Correlation ID', () => {
    it('should generate X-Request-ID if not provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('should preserve X-Request-ID from request header', async () => {
      const customRequestId = '12345678-1234-1234-1234-123456789abc';

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

    it('should include requestId in all routes', async () => {
      const routes = ['/health', '/'];

      for (const route of routes) {
        const response = await app.inject({
          method: 'GET',
          url: route,
        });

        expect(response.headers['x-request-id']).toBeDefined();
        expect(response.headers['x-request-id']).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
      }
    });

    it('should generate unique requestId for each request', async () => {
      const response1 = await app.inject({ method: 'GET', url: '/health' });
      const response2 = await app.inject({ method: 'GET', url: '/health' });

      const requestId1 = response1.headers['x-request-id'];
      const requestId2 = response2.headers['x-request-id'];

      expect(requestId1).toBeDefined();
      expect(requestId2).toBeDefined();
      expect(requestId1).not.toBe(requestId2);
    });
  });

  describe('Integration - Metrics + Correlation ID', () => {
    it('should record metrics with correlation ID', async () => {
      const customRequestId = 'test-correlation-id-12345';

      // Make request with custom requestId
      const response1 = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-request-id': customRequestId,
        },
      });

      expect(response1.statusCode).toBe(200);
      expect(response1.headers['x-request-id']).toBe(customRequestId);

      // Verify metrics endpoint works independently
      const response2 = await app.inject({
        method: 'GET',
        url: '/metrics',
      });

      expect(response2.statusCode).toBe(200);
      expect(response2.body).toContain('http_requests_total');
    });
  });
});
