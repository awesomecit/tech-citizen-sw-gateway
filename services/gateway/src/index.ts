import { type FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import {
  register,
  collectDefaultMetrics,
  Counter,
  Histogram,
} from 'prom-client';
import { randomUUID } from 'crypto';
import auth from '@tech-citizen/auth';
import { loadConfig, type GatewayConfig } from './config.js';

const authPlugin = auth.default || auth;

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  service: string;
  version: string;
}

interface HelloResponse {
  message: string;
}

// Prometheus metrics (initialized at module level)
collectDefaultMetrics({ prefix: 'gateway_' });

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [10, 50, 100, 300, 500, 1000, 3000, 5000],
});

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// Setup hooks for metrics and correlation ID
function setupHooks(app: FastifyInstance): void {
  // Correlation ID + start timer
  app.addHook('onRequest', async (request, reply) => {
    const requestId =
      (request.headers['x-request-id'] as string) || randomUUID();
    request.log = request.log.child({ requestId });
    reply.header('X-Request-ID', requestId);
    (request as unknown as { startTime: number }).startTime = Date.now();
  });

  // Record metrics
  app.addHook('onResponse', async (request, reply) => {
    const duration =
      Date.now() - (request as unknown as { startTime: number }).startTime;
    const route = request.routeOptions?.url || request.url;
    const status = reply.statusCode.toString();
    httpRequestDuration.labels(request.method, route, status).observe(duration);
    httpRequestsTotal.labels(request.method, route, status).inc();
  });

  // Cleanup resources
  app.addHook('onClose', async instance => {
    instance.log.info('Cleaning up resources...');
  });
}

export interface PluginOptions {
  config?: Partial<GatewayConfig>;
}

export async function plugin(
  app: FastifyInstance,
  opts: PluginOptions = {},
): Promise<void> {
  // Load configuration (opts.config overrides env vars)
  const config = loadConfig(opts.config);

  await app.register(sensible);
  setupHooks(app);

  // Feature: Authentication (Keycloak OIDC + JWT + Redis sessions)
  if (config.features.auth) {
    await app.register(authPlugin, {
      keycloakUrl: config.keycloakUrl!,
      realm: config.realm || 'healthcare-domain',
      clientId: config.clientId || 'gateway-client',
      clientSecret: config.clientSecret || 'gateway-client-secret-change-in-production',
      redisUrl: `redis://${config.redis?.host}:${config.redis?.port}`,
      enableRoutes: true,
    });
  } else {
    // Auth disabled: mock authenticate decorator
    if (!app.hasDecorator('authenticate')) {
      app.decorate('authenticate', async () => {
        // No-op when auth feature disabled
      });
    }
  }

  // Routes
  registerHealthRoute(app);
  registerProtectedRoute(app);
  
  // Feature: Telemetry (Prometheus metrics)
  if (config.features.telemetry) {
    registerMetricsRoute(app);
  }
}

function registerHealthRoute(app: FastifyInstance): void {
  app.get<{ Reply: HealthResponse }>('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      version: '1.0.0',
    };
  });

  app.get<{ Reply: HelloResponse }>('/', async () => {
    return { message: 'API Gateway Suite - Hello World' };
  });
}

function registerProtectedRoute(app: FastifyInstance): void {
  app.get(
    '/api/protected',
    { onRequest: [app.authenticate] },
    async request => {
      return {
        message: 'You are authenticated!',
        user: request.user,
      };
    },
  );
}

function registerMetricsRoute(app: FastifyInstance): void {
  app.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });
}

export default plugin;
