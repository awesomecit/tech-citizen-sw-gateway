import type { FastifyInstance } from 'fastify';

/**
 * Auth Provider Port
 * Interface for authentication adapters (Keycloak, JWT, Noop, etc.)
 */
export interface AuthProviderPort {
  /**
   * Register authentication plugin with Fastify instance
   */
  register(app: FastifyInstance): Promise<void>;

  /**
   * Check if auth provider is enabled
   */
  isEnabled(): boolean;

  /**
   * Get provider name for logging
   */
  getProviderName(): string;
}
