import type { FastifyInstance } from 'fastify';
import type { GatewayContextEntity } from '../../domain/entities/gateway-context.entity.js';

/**
 * Metrics Collector Port
 * Interface for telemetry/metrics adapters (Prometheus, OpenTelemetry, Noop, etc.)
 */
export interface MetricsCollectorPort {
  /**
   * Register metrics endpoint with Fastify instance
   */
  register(app: FastifyInstance): Promise<void>;

  /**
   * Record HTTP request metrics
   */
  recordRequest(
    context: GatewayContextEntity,
    statusCode: number,
    duration: number,
  ): void;

  /**
   * Check if metrics collection is enabled
   */
  isEnabled(): boolean;

  /**
   * Get collector name for logging
   */
  getCollectorName(): string;
}
