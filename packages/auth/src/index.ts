/**
 * @tech-citizen/auth
 *
 * Reusable authentication plugin for Platformatic/Fastify services.
 * Provides JWT validation, Keycloak integration, and session management.
 *
 * @packageDocumentation
 */

import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import jwtPlugin from './plugins/jwt.js';
import './types.js';

/**
 * Parse Redis configuration from multiple sources
 */
function parseRedisConfig(opts: AuthPluginOptions) {
  if (opts.redis) {
    return opts.redis;
  }

  if (opts.redisUrl) {
    const url = new URL(opts.redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
    };
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380', 10),
    password: process.env.REDIS_PASSWORD || 'dev-redis-password',
  };
}

/**
 * Register Keycloak OIDC plugin with Redis session store
 */
async function registerKeycloakPlugin(fastify: any, opts: AuthPluginOptions) {
  fastify.log.info('Auth plugin: enableRoutes is TRUE, registering Keycloak');

  const redisConfig = parseRedisConfig(opts);
  fastify.log.info(
    { redis: { host: redisConfig.host, port: redisConfig.port } },
    'Keycloak plugin: connecting to Redis',
  );

  fastify.log.info('Auth plugin: BEFORE dynamic import keycloakPlugin');
  const keycloakModule = await import('./keycloak.js');
  const keycloakPlugin = keycloakModule.default || keycloakModule;
  fastify.log.info('Auth plugin: AFTER dynamic import, BEFORE register');

  await fastify.register(keycloakPlugin, {
    keycloakUrl: opts.keycloakUrl,
    realm: opts.realm,
    clientId: opts.clientId,
    clientSecret: opts.clientSecret || '',
    callbackUrl:
      process.env.CALLBACK_URL || 'http://localhost:3042/auth/callback',
    redis: redisConfig,
    sessionTTL: 3600,
  });

  fastify.log.info('Auth plugin: AFTER fastify.register(keycloakPlugin)');
}

/**
 * Authentication plugin options
 */
export interface AuthPluginOptions {
  /** Keycloak base URL (e.g., http://localhost:8080) */
  keycloakUrl: string;
  /** Keycloak realm name */
  realm: string;
  /** Keycloak client ID */
  clientId: string;
  /** Keycloak client secret */
  clientSecret?: string;
  /** Redis connection URL (optional, defaults to in-memory) */
  redisUrl?: string;
  /** Redis configuration (alternative to redisUrl) */
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  /** Enable /auth/* routes (true for auth-api, false for gateway) */
  enableRoutes?: boolean;
  /** JWT public key for validation (optional, fetched from Keycloak if not provided) */
  jwtPublicKey?: string;
}

/**
 * Main authentication plugin
 *
 * Registers JWT validation, Keycloak integration, and session management.
 * Optionally exposes /auth/* routes for user registration/login.
 *
 * @example
 * ```typescript
 * // Auth API mode (with routes)
 * await fastify.register(authPlugin, {
 *   keycloakUrl: 'http://localhost:8080',
 *   realm: 'techcitizen',
 *   clientId: 'auth-api',
 *   enableRoutes: true
 * });
 *
 * // Gateway mode (JWT validation only)
 * await fastify.register(authPlugin, {
 *   keycloakUrl: 'http://localhost:8080',
 *   realm: 'techcitizen',
 *   clientId: 'gateway',
 *   enableRoutes: false
 * });
 * ```
 */
const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (
  fastify,
  opts,
) => {
  // Validate required options
  if (!opts.keycloakUrl) {
    throw new Error('Missing required option: keycloakUrl');
  }
  if (!opts.realm) {
    throw new Error('Missing required option: realm');
  }
  if (!opts.clientId) {
    throw new Error('Missing required option: clientId');
  }

  fastify.log.info(
    { enableRoutes: opts.enableRoutes },
    'Auth plugin: checking enableRoutes flag',
  );

  // Register Keycloak OIDC plugin if routes enabled (US-039)
  if (opts.enableRoutes) {
    await registerKeycloakPlugin(fastify, opts);
  } else {
    // Register JWT plugin only - US-038
    await fastify.register(jwtPlugin, opts);
  }

  fastify.log.info(
    {
      realm: opts.realm,
      clientId: opts.clientId,
      enableRoutes: opts.enableRoutes,
    },
    'Auth plugin registered',
  );
};

export default fp(authPlugin, {
  name: '@tech-citizen/auth',
  fastify: '5.x',
});

// Export sub-plugins and schemas for advanced usage
export * from './plugins/jwt.js';
export * from './keycloak.js';
// TODO: Export session, user, token after US-040/041 implementation
