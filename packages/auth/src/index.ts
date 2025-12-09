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

  // TODO: Register plugins (jwt, keycloak, session)
  // TODO: Register routes if enableRoutes === true

  // Register JWT plugin - US-038
  await fastify.register(jwtPlugin, opts);

  fastify.log.info(
    { realm: opts.realm, clientId: opts.clientId },
    'Auth plugin registered',
  );
};

export default fp(authPlugin, {
  name: '@tech-citizen/auth',
  fastify: '5.x',
});

// Export sub-plugins and schemas for advanced usage
export * from './plugins/jwt.js';
// TODO: Export keycloak, session, user, token after US-039/040/041 implementation
