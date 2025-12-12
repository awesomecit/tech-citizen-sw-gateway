import type { FastifyInstance } from 'fastify';
import authPlugin from '@tech-citizen/auth';
import type { AuthProviderPort } from '../../application/ports/auth-provider.port.js';

export interface KeycloakAuthConfig {
  keycloakUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}

/**
 * Keycloak Auth Adapter
 * Implements authentication via Keycloak OIDC + Redis sessions
 */
export class KeycloakAuthAdapter implements AuthProviderPort {
  constructor(private config: KeycloakAuthConfig) {}

  async register(app: FastifyInstance): Promise<void> {
    app.log.info(
      {
        keycloakUrl: this.config.keycloakUrl,
        realm: this.config.realm,
        redis: this.config.redis,
      },
      'Registering Keycloak auth adapter',
    );

    await app.register(authPlugin, {
      keycloakUrl: this.config.keycloakUrl,
      realm: this.config.realm,
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redis: this.config.redis,
      enableRoutes: true,
    });
  }

  isEnabled(): boolean {
    return true;
  }

  getProviderName(): string {
    return 'KeycloakAuth';
  }
}
