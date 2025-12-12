import type { FastifyInstance } from 'fastify';
import type { GatewayContextEntity } from '../../domain/entities/gateway-context.entity.js';
import type { MetricsCollectorPort } from '../../application/ports/metrics-collector.port.js';

/**
 * Noop Metrics Adapter
 * Used when telemetry feature is disabled
 * Does nothing, no performance overhead
 */
export class NoopMetricsAdapter implements MetricsCollectorPort {
  async register(_app: FastifyInstance): Promise<void> {
    // No-op: do not register /metrics endpoint
  }

  recordRequest(
    _context: GatewayContextEntity,
    _statusCode: number,
    _duration: number,
  ): void {
    // No-op: do not record metrics
  }

  isEnabled(): boolean {
    return false;
  }

  getCollectorName(): string {
    return 'NoopMetrics';
  }
}
