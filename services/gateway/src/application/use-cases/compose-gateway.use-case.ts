import type { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import { GatewayContextEntity } from '../../domain/entities/gateway-context.entity.js';
import type { AuthProviderPort } from '../ports/auth-provider.port.js';
import type { MetricsCollectorPort } from '../ports/metrics-collector.port.js';

export interface ComposeGatewayDependencies {
  authProvider: AuthProviderPort;
  metricsCollector: MetricsCollectorPort;
}

/**
 * Compose Gateway Use Case
 * Orchestrates gateway setup: hooks, adapters, routes
 * Depends on ports (interfaces), not concrete implementations
 */
export class ComposeGatewayUseCase {
  constructor(private deps: ComposeGatewayDependencies) {}

  async execute(app: FastifyInstance): Promise<void> {
    // Register base plugins
    await app.register(sensible);

    // Setup hooks (correlation ID + metrics recording)
    this.setupHooks(app);

    // Register adapters if enabled
    if (this.deps.authProvider.isEnabled()) {
      app.log.info(
        { provider: this.deps.authProvider.getProviderName() },
        'Registering auth provider',
      );
      await this.deps.authProvider.register(app);
    } else {
      // Auth disabled: register noop decorator
      await this.deps.authProvider.register(app);
      app.log.info('Auth disabled, using noop authenticate decorator');
    }

    if (this.deps.metricsCollector.isEnabled()) {
      app.log.info(
        { collector: this.deps.metricsCollector.getCollectorName() },
        'Registering metrics collector',
      );
      await this.deps.metricsCollector.register(app);
    } else {
      app.log.info('Metrics disabled, no telemetry collection');
    }
  }

  private setupHooks(app: FastifyInstance): void {
    // Correlation ID + start timer
    app.addHook('onRequest', async (request, reply) => {
      const headers = request.headers as Record<string, string | undefined>;
      const context = GatewayContextEntity.fromHeaders(
        headers,
        request.method,
        request.url,
      );

      // Attach to request for later use
      (
        request as unknown as { gatewayContext: GatewayContextEntity }
      ).gatewayContext = context;

      // Set correlation ID header
      reply.header('X-Request-ID', context.requestId);

      // Update logger with correlation ID
      request.log = request.log.child({ requestId: context.requestId });
    });

    // Record metrics on response (only if enabled)
    app.addHook('onResponse', async (request, reply) => {
      const context = (
        request as unknown as { gatewayContext: GatewayContextEntity }
      ).gatewayContext;
      if (!context) {
        return; // Should never happen, but safety check
      }

      const duration = context.getElapsedTime();

      // Structured logging for future Loki export
      request.log.info(
        {
          requestId: context.requestId,
          method: context.method,
          url: context.url,
          statusCode: reply.statusCode,
          duration,
          userId: (request as { user?: { sub?: string } }).user?.sub,
        },
        'HTTP request completed',
      );

      // Only record if metrics collector is enabled
      if (this.deps.metricsCollector.isEnabled()) {
        this.deps.metricsCollector.recordRequest(
          context,
          reply.statusCode,
          duration,
        );
      }
    });

    // Cleanup resources
    app.addHook('onClose', async instance => {
      instance.log.info('Cleaning up gateway resources...');
    });
  }
}
