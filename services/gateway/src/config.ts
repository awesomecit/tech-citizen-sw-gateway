/**
 * Gateway Configuration with Feature Flags
 * YAGNI: Only flags for features we actually have
 */

export interface FeatureFlags {
  auth: boolean;
  cache: boolean;
  telemetry: boolean;
  rateLimit: boolean;
}

export interface GatewayConfig {
  features: FeatureFlags;
  keycloakUrl?: string;
  realm?: string;
  clientId?: string;
  clientSecret?: string;
  jwtPublicKey?: string;
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}

const DEFAULT_FEATURES: FeatureFlags = {
  auth: true,
  cache: true,
  telemetry: true,
  rateLimit: false, // Not implemented yet
};

/**
 * Load configuration from environment or explicit options
 * @param options - Explicit configuration (overrides env vars)
 */
export function loadConfig(options?: Partial<GatewayConfig>): GatewayConfig {
  const features = loadFeatureFlags(options?.features);
  const config = buildConfig(options, features);
  validateConfig(config);
  return config;
}

function loadFeatureFlags(
  optionsFeatures?: Partial<FeatureFlags>,
): FeatureFlags {
  return {
    auth: parseBoolEnv(
      'GATEWAY_FEATURE_AUTH',
      optionsFeatures?.auth ?? DEFAULT_FEATURES.auth,
    ),
    cache: parseBoolEnv(
      'GATEWAY_FEATURE_CACHE',
      optionsFeatures?.cache ?? DEFAULT_FEATURES.cache,
    ),
    telemetry: parseBoolEnv(
      'GATEWAY_FEATURE_TELEMETRY',
      optionsFeatures?.telemetry ?? DEFAULT_FEATURES.telemetry,
    ),
    rateLimit: parseBoolEnv(
      'GATEWAY_FEATURE_RATE_LIMIT',
      optionsFeatures?.rateLimit ?? DEFAULT_FEATURES.rateLimit,
    ),
  };
}

function buildConfig(
  options: Partial<GatewayConfig> | undefined,
  features: FeatureFlags,
): GatewayConfig {
  return {
    features,
    keycloakUrl: options?.keycloakUrl ?? process.env.KEYCLOAK_URL,
    realm: options?.realm ?? process.env.KEYCLOAK_REALM,
    clientId: options?.clientId ?? process.env.KEYCLOAK_CLIENT_ID,
    clientSecret: options?.clientSecret ?? process.env.KEYCLOAK_CLIENT_SECRET,
    jwtPublicKey: options?.jwtPublicKey ?? process.env.JWT_PUBLIC_KEY,
    redis: options?.redis ?? {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
  };
}

function validateConfig(config: GatewayConfig): void {
  if (config.features.auth && !config.keycloakUrl) {
    throw new Error('Auth feature enabled but KEYCLOAK_URL not configured');
  }
}

/**
 * Parse boolean from env var with default fallback
 */
function parseBoolEnv(envVar: string, defaultValue: boolean): boolean {
  const value = process.env[envVar];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}
