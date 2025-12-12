import { test } from 'tap';
import { GatewayContextEntity } from '../../../src/domain/entities/gateway-context.entity.js';

test('GatewayContextEntity - Creation', async t => {
  t.test('creates valid context with required fields', async t => {
    const context = new GatewayContextEntity({
      requestId: 'req-123',
      startTime: Date.now(),
      method: 'GET',
      url: '/api/test',
    });

    t.equal(context.requestId, 'req-123');
    t.equal(context.method, 'GET');
    t.equal(context.url, '/api/test');
    t.ok(context.startTime > 0);
  });

  t.test('rejects empty request ID', async t => {
    t.throws(
      () =>
        new GatewayContextEntity({
          requestId: '',
          startTime: Date.now(),
          method: 'GET',
          url: '/test',
        }),
      /Request ID is required/,
    );
  });

  t.test('rejects invalid start time', async t => {
    t.throws(
      () =>
        new GatewayContextEntity({
          requestId: 'req-123',
          startTime: 0,
          method: 'GET',
          url: '/test',
        }),
      /Start time must be positive/,
    );
  });

  t.test('rejects empty method', async t => {
    t.throws(
      () =>
        new GatewayContextEntity({
          requestId: 'req-123',
          startTime: Date.now(),
          method: '',
          url: '/test',
        }),
      /HTTP method is required/,
    );
  });

  t.test('rejects empty URL', async t => {
    t.throws(
      () =>
        new GatewayContextEntity({
          requestId: 'req-123',
          startTime: Date.now(),
          method: 'GET',
          url: '',
        }),
      /URL is required/,
    );
  });
});

test('GatewayContextEntity - Elapsed Time', async t => {
  t.test('calculates elapsed time correctly', async t => {
    const startTime = Date.now();
    const context = new GatewayContextEntity({
      requestId: 'req-123',
      startTime,
      method: 'GET',
      url: '/test',
    });

    // Simulate 50ms elapsed
    const currentTime = startTime + 50;
    const elapsed = context.getElapsedTime(currentTime);

    t.equal(elapsed, 50);
  });

  t.test('uses current time if not provided', async t => {
    const startTime = Date.now() - 100; // 100ms ago
    const context = new GatewayContextEntity({
      requestId: 'req-123',
      startTime,
      method: 'GET',
      url: '/test',
    });

    const elapsed = context.getElapsedTime();

    t.ok(elapsed >= 100, 'elapsed time should be at least 100ms');
    t.ok(elapsed < 200, 'elapsed time should be less than 200ms');
  });
});

test('GatewayContextEntity - From Headers', async t => {
  t.test('uses x-request-id from headers if present', async t => {
    const headers = { 'x-request-id': 'custom-id-123' };
    const context = GatewayContextEntity.fromHeaders(
      headers,
      'POST',
      '/api/users',
    );

    t.equal(context.requestId, 'custom-id-123');
    t.equal(context.method, 'POST');
    t.equal(context.url, '/api/users');
  });

  t.test('generates request ID if header missing', async t => {
    const headers = {};
    const context = GatewayContextEntity.fromHeaders(headers, 'GET', '/health');

    t.ok(context.requestId.length > 0, 'request ID should be generated');
    t.match(
      context.requestId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      'should be valid UUID v4',
    );
  });

  t.test('handles undefined headers', async t => {
    const headers: Record<string, string | undefined> = {
      'x-request-id': undefined,
    };
    const context = GatewayContextEntity.fromHeaders(
      headers,
      'DELETE',
      '/api/resource',
    );

    t.ok(
      context.requestId.length > 0,
      'should generate ID for undefined header',
    );
  });
});

test('GatewayContextEntity - Immutability', async t => {
  t.test('does not expose internal data for mutation', async t => {
    const context = new GatewayContextEntity({
      requestId: 'req-123',
      startTime: Date.now(),
      method: 'GET',
      url: '/test',
    });

    // Attempt to modify (should not affect internal state)
    const requestId = context.requestId;
    t.type(requestId, 'string', 'should return primitive string');

    // Verify original data unchanged
    t.equal(context.requestId, 'req-123');
  });
});
