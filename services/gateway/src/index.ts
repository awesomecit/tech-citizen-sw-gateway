import { type FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import {
  register,
  collectDefaultMetrics,
  Counter,
  Histogram,
} from 'prom-client';
import { randomUUID } from 'crypto';
import authPlugin from '@tech-citizen/auth/plugin';

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  service: string;
  version: string;
}

interface HelloResponse {
  message: string;
}

const GRACEFUL_SHUTDOWN_TIMEOUT = 10000; // 10 seconds

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

// Graceful shutdown handler
async function gracefulShutdown(
  app: FastifyInstance,
  signal: string,
): Promise<void> {
  app.log.info(`Received ${signal}, starting graceful shutdown...`);
  await app.close();
  app.log.info('Graceful shutdown completed');
  process.exit(0);
}

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

export async function plugin(app: FastifyInstance): Promise<void> {
  await app.register(sensible);
  setupHooks(app);

  // Register authentication plugin (Keycloak OIDC + JWT)
  await app.register(authPlugin, {
    keycloakUrl: process.env.KEYCLOAK_URL || 'http://localhost:8090',
    realm: process.env.KEYCLOAK_REALM || 'healthcare-domain',
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'gateway-client',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6380',
    enableRoutes: true,
  });

  // Validazione precoce delle variabili critiche
  if (
    !process.env.KEYCLOAK_CLIENT_SECRET &&
    process.env.NODE_ENV === 'production'
  ) {
    throw new Error('KEYCLOAK_CLIENT_SECRET is required in production');
  }

  // Register signal handlers
  process.once('SIGTERM', () => gracefulShutdown(app, 'SIGTERM'));
  process.once('SIGINT', () => gracefulShutdown(app, 'SIGINT'));

  // Force exit if graceful shutdown timeout
  const shutdownTimer = setTimeout(() => {
    app.log.error(
      `Graceful shutdown timeout after ${GRACEFUL_SHUTDOWN_TIMEOUT}ms`,
    );
    process.exit(1);
  }, GRACEFUL_SHUTDOWN_TIMEOUT);
  shutdownTimer.unref();

  // Routes
  registerHealthRoute(app);
  registerProtectedRoute(app);
  registerMetricsRoute(app);
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
