import type { FastifyInstance } from 'fastify';
import type { AuthProviderPort } from '../../application/ports/auth-provider.port.js';

/**
 * Noop Auth Adapter
 * Used when auth feature is disabled (minimal mode)
 * Provides no-op authenticate decorator
 */
export class NoopAuthAdapter implements AuthProviderPort {
  async register(app: FastifyInstance): Promise<void> {
    // Register no-op authenticate decorator if not already present
    if (!app.hasDecorator('authenticate')) {
      app.decorate('authenticate', async () => {
        // No-op: allow all requests through
      });
    }
  }

  isEnabled(): boolean {
    return false;
  }

  getProviderName(): string {
    return 'NoopAuth';
  }
}
