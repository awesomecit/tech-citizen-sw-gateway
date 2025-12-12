import { test } from 'tap';
import Fastify, { type FastifyInstance } from 'fastify';
import { ComposeGatewayUseCase } from '../../../src/application/use-cases/compose-gateway.use-case.js';
import type { AuthProviderPort } from '../../../src/application/ports/auth-provider.port.js';
import type { MetricsCollectorPort } from '../../../src/application/ports/metrics-collector.port.js';
import type { GatewayContextEntity } from '../../../src/domain/entities/gateway-context.entity.js';

// Mock Auth Provider
class MockAuthProvider implements AuthProviderPort {
  registerCalled = false;
  enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  async register(app: FastifyInstance): Promise<void> {
    this.registerCalled = true;
    if (!app.hasDecorator('authenticate')) {
      app.decorate('authenticate', async () => {
        // Mock authenticate
      });
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getProviderName(): string {
    return 'MockAuth';
  }
}

// Mock Metrics Collector
class MockMetricsCollector implements MetricsCollectorPort {
  registerCalled = false;
  recordedRequests: Array<{
    context: GatewayContextEntity;
    statusCode: number;
    duration: number;
  }> = [];
  enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  async register(app: FastifyInstance): Promise<void> {
    this.registerCalled = true;
    app.get('/metrics', async () => ({ metrics: 'mock' }));
  }

  recordRequest(
    context: GatewayContextEntity,
    statusCode: number,
    duration: number,
  ): void {
    this.recordedRequests.push({ context, statusCode, duration });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getCollectorName(): string {
    return 'MockMetrics';
  }
}

test('ComposeGatewayUseCase - Auth Enabled', async t => {
  t.test('registers auth provider when enabled', async t => {
    const app = Fastify({ logger: false });
    const authProvider = new MockAuthProvider(true);
    const metricsCollector = new MockMetricsCollector(false);

    const useCase = new ComposeGatewayUseCase({
      authProvider,
      metricsCollector,
    });
    await useCase.execute(app);

    t.equal(
      authProvider.registerCalled,
      true,
      'should call auth provider register',
    );
    t.ok(
      app.hasDecorator('authenticate'),
      'should have authenticate decorator',
    );

    await app.close();
  });

  t.test('registers noop auth when disabled', async t => {
    const app = Fastify({ logger: false });
    const authProvider = new MockAuthProvider(false);
    const metricsCollector = new MockMetricsCollector(false);

    const useCase = new ComposeGatewayUseCase({
      authProvider,
      metricsCollector,
    });
    await useCase.execute(app);

    t.equal(
      authProvider.registerCalled,
      true,
      'should still call register for noop decorator',
    );
    t.ok(
      app.hasDecorator('authenticate'),
      'should have noop authenticate decorator',
    );

    await app.close();
  });
});

test('ComposeGatewayUseCase - Metrics Enabled', async t => {
  t.test('registers metrics collector when enabled', async t => {
    const app = Fastify({ logger: false });
    const authProvider = new MockAuthProvider(false);
    const metricsCollector = new MockMetricsCollector(true);

    const useCase = new ComposeGatewayUseCase({
      authProvider,
      metricsCollector,
    });
    await useCase.execute(app);

    t.equal(
      metricsCollector.registerCalled,
      true,
      'should call metrics collector register',
    );

    // Verify /metrics endpoint exists
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });
    t.equal(response.statusCode, 200);

    await app.close();
  });

  t.test('does not register metrics when disabled', async t => {
    const app = Fastify({ logger: false });
    const authProvider = new MockAuthProvider(false);
    const metricsCollector = new MockMetricsCollector(false);

    const useCase = new ComposeGatewayUseCase({
      authProvider,
      metricsCollector,
    });
    await useCase.execute(app);

    t.equal(
      metricsCollector.registerCalled,
      false,
      'should not call metrics register',
    );

    await app.close();
  });
});

test('ComposeGatewayUseCase - Hooks Setup', async t => {
  t.test('sets correlation ID on requests', async t => {
    const app = Fastify({ logger: false });
    const authProvider = new MockAuthProvider(false);
    const metricsCollector = new MockMetricsCollector(false);

    const useCase = new ComposeGatewayUseCase({
      authProvider,
      metricsCollector,
    });
    await useCase.execute(app);

    // Register test route
    app.get('/test', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/test',
    });

    t.ok(response.headers['x-request-id'], 'should have X-Request-ID header');

    await app.close();
  });

  t.test('preserves custom correlation ID from header', async t => {
    const app = Fastify({ logger: false });
    const authProvider = new MockAuthProvider(false);
    const metricsCollector = new MockMetricsCollector(false);

    const useCase = new ComposeGatewayUseCase({
      authProvider,
      metricsCollector,
    });
    await useCase.execute(app);

    app.get('/test', async () => ({ ok: true }));

    const customId = 'custom-request-id-123';
    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { 'x-request-id': customId },
    });

    t.equal(
      response.headers['x-request-id'],
      customId,
      'should preserve custom ID',
    );

    await app.close();
  });

  t.test('records metrics on response', async t => {
    const app = Fastify({ logger: false });
    const authProvider = new MockAuthProvider(false);
    const metricsCollector = new MockMetricsCollector(true);

    const useCase = new ComposeGatewayUseCase({
      authProvider,
      metricsCollector,
    });
    await useCase.execute(app);

    app.get('/test', async () => ({ ok: true }));

    await app.inject({
      method: 'GET',
      url: '/test',
    });

    t.equal(
      metricsCollector.recordedRequests.length,
      1,
      'should record 1 request',
    );
    const recorded = metricsCollector.recordedRequests[0];
    t.equal(recorded.statusCode, 200);
    t.equal(recorded.context.method, 'GET');
    t.equal(recorded.context.url, '/test');
    t.ok(recorded.duration >= 0, 'duration should be non-negative');

    await app.close();
  });
});

test('ComposeGatewayUseCase - Integration', async t => {
  t.test('works with all features enabled', async t => {
    const app = Fastify({ logger: false });
    const authProvider = new MockAuthProvider(true);
    const metricsCollector = new MockMetricsCollector(true);

    const useCase = new ComposeGatewayUseCase({
      authProvider,
      metricsCollector,
    });
    await useCase.execute(app);

    app.get('/test', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/test',
    });

    t.equal(response.statusCode, 200);
    t.ok(response.headers['x-request-id']);
    t.equal(authProvider.registerCalled, true);
    t.equal(metricsCollector.registerCalled, true);
    t.equal(metricsCollector.recordedRequests.length, 1);

    await app.close();
  });

  t.test('works with all features disabled (minimal mode)', async t => {
    const app = Fastify({ logger: false });
    const authProvider = new MockAuthProvider(false);
    const metricsCollector = new MockMetricsCollector(false);

    const useCase = new ComposeGatewayUseCase({
      authProvider,
      metricsCollector,
    });
    await useCase.execute(app);

    app.get('/test', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/test',
    });

    t.equal(response.statusCode, 200);
    t.ok(response.headers['x-request-id'], 'correlation ID should still work');
    t.equal(
      metricsCollector.recordedRequests.length,
      0,
      'should not record metrics',
    );

    await app.close();
  });
});
