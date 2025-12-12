import { type FastifyInstance } from 'fastify';
import { loadConfig, type GatewayConfig } from './config.js';
import { registerAuthRoutes } from './routes/auth.js';
import { FeatureManagerService } from './domain/services/feature-manager.service.js';
import { ComposeGatewayUseCase } from './application/use-cases/compose-gateway.use-case.js';
import { KeycloakAuthAdapter } from './infrastructure/adapters/keycloak-auth.adapter.js';
import { NoopAuthAdapter } from './infrastructure/adapters/noop-auth.adapter.js';
import { PrometheusMetricsAdapter } from './infrastructure/adapters/prometheus-metrics.adapter.js';
import { NoopMetricsAdapter } from './infrastructure/adapters/noop-metrics.adapter.js';

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  service: string;
  version: string;
}

interface HelloResponse {
  message: string;
}

/**
 * Create auth adapter based on feature flags
 */
function createAuthAdapter(config: GatewayConfig) {
  const featureManager = new FeatureManagerService();

  if (featureManager.shouldEnableAuth(config.features, config.keycloakUrl)) {
    return new KeycloakAuthAdapter({
      keycloakUrl: config.keycloakUrl!,
      realm: config.realm || 'healthcare-domain',
      clientId: config.clientId || 'gateway-client',
      clientSecret:
        config.clientSecret || 'gateway-client-secret-change-in-production',
      redis: config.redis,
    });
  }

  return new NoopAuthAdapter();
}

/**
 * Create metrics adapter based on feature flags
 */
function createMetricsAdapter(config: GatewayConfig) {
  const featureManager = new FeatureManagerService();

  if (featureManager.shouldEnableTelemetry(config.features)) {
    return new PrometheusMetricsAdapter();
  }

  return new NoopMetricsAdapter();
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

  // Create adapters based on feature flags (Hexagonal Architecture)
  const authAdapter = createAuthAdapter(config);
  const metricsAdapter = createMetricsAdapter(config);

  // Log enabled features
  const featureManager = new FeatureManagerService();
  const enabledFeatures = featureManager.getEnabledFeatures(
    config.features,
    config.keycloakUrl,
    config.redis?.host,
  );

  app.log.info(
    {
      features: enabledFeatures,
      minimalMode: featureManager.isMinimalMode(config.features),
      authProvider: authAdapter.getProviderName(),
      metricsCollector: metricsAdapter.getCollectorName(),
    },
    'Gateway starting with configuration',
  );

  // Compose gateway using Use Case (orchestration)
  const composeGateway = new ComposeGatewayUseCase({
    authProvider: authAdapter,
    metricsCollector: metricsAdapter,
  });

  await composeGateway.execute(app);

  // Register application routes
  registerHealthRoute(app);
  registerProtectedRoute(app);
  await registerAuthRoutes(app); // E2E test endpoints
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

export default plugin;
