import type { FastifyInstance } from 'fastify';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  register,
} from 'prom-client';
import type { GatewayContextEntity } from '../../domain/entities/gateway-context.entity.js';
import type { MetricsCollectorPort } from '../../application/ports/metrics-collector.port.js';

// Singleton metrics (avoid duplicate registration)
let metricsInitialized = false;
let httpRequestDuration: Histogram<string>;
let httpRequestsTotal: Counter<string>;

function initializeMetrics(): void {
  if (metricsInitialized) {
    return; // Already initialized
  }

  collectDefaultMetrics({ prefix: 'gateway_' });

  httpRequestDuration = new Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in milliseconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [10, 50, 100, 300, 500, 1000, 3000, 5000],
  });

  httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
  });

  metricsInitialized = true;
}

/**
 * Prometheus Metrics Adapter
 * Implements metrics collection with prom-client
 */
export class PrometheusMetricsAdapter implements MetricsCollectorPort {
  constructor() {
    // Initialize singleton metrics
    initializeMetrics();
  }

  async register(app: FastifyInstance): Promise<void> {
    // Register /metrics endpoint
    app.get('/metrics', async (_request, reply) => {
      reply.type('text/plain');
      return register.metrics();
    });
  }

  recordRequest(
    context: GatewayContextEntity,
    statusCode: number,
    duration: number,
  ): void {
    const route = context.url;
    const status = statusCode.toString();

    httpRequestDuration.labels(context.method, route, status).observe(duration);
    httpRequestsTotal.labels(context.method, route, status).inc();
  }

  isEnabled(): boolean {
    return metricsInitialized;
  }

  getCollectorName(): string {
    return 'PrometheusMetrics';
  }
}
