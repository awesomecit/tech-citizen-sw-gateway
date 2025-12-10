import { type FastifyInstance, type FastifyRequest } from 'fastify';
import type { Redis } from 'ioredis';

export interface SessionData {
  userId: string;
  userType: 'domain' | 'service';
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  lastActivity?: number;
  createdAt?: number;
}

export interface SessionConfig {
  ttl: number;
  slidingWindowEnabled: boolean;
  slidingWindowThreshold: number;
  refreshThreshold: number;
  enableAutoRefresh: boolean;
}

const DEFAULT_CONFIG: SessionConfig = {
  ttl: 3600, // 1 hour
  slidingWindowEnabled: true,
  slidingWindowThreshold: 300, // 5 minutes - extend session if activity within last 5 min
  refreshThreshold: 300, // 5 minutes - refresh token if expires in less than 5 min
  enableAutoRefresh: true,
};

/**
 * Session Manager with sliding window and auto-refresh
 *
 * Features:
 * - Sliding window: Extends session TTL on user activity
 * - Auto-refresh: Refreshes access token before expiration
 * - Activity tracking: Records last user interaction
 */
export class SessionManager {
  private redis: Redis;
  private config: SessionConfig;
  private keycloakUrl: string;
  private clientId: string;
  private clientSecret: string;

  constructor(
    redis: Redis,
    config: Partial<SessionConfig> = {},
    keycloakConfig: { url: string; clientId: string; clientSecret: string },
  ) {
    this.redis = redis;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.keycloakUrl = keycloakConfig.url;
    this.clientId = keycloakConfig.clientId;
    this.clientSecret = keycloakConfig.clientSecret;
  }

  /**
   * Get session from Redis with activity tracking
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = `session:${sessionId}`;
    const data = await this.redis.get(key);

    if (!data) return null;

    const session: SessionData = JSON.parse(data);
    await this.tryRefreshToken(sessionId, session);

    const ttl = await this.calculateTTL(key, session);
    await this.updateSession(key, session, ttl);

    return session;
  }

  /**
   * Try to refresh token if needed
   */
  private async tryRefreshToken(
    sessionId: string,
    session: SessionData,
  ): Promise<void> {
    if (!this.config.enableAutoRefresh || !this.shouldRefreshToken(session)) {
      return;
    }

    try {
      const refreshed = await this.refreshAccessToken(session);
      if (refreshed) {
        session.accessToken = refreshed.accessToken;
        session.refreshToken = refreshed.refreshToken || session.refreshToken;
        session.expiresAt = refreshed.expiresAt;
        await this.saveSession(sessionId, session);
      }
    } catch (error) {
      console.warn('Token refresh failed, using existing token', error);
    }
  }

  /**
   * Calculate TTL based on sliding window policy
   */
  private async calculateTTL(
    key: string,
    session: SessionData,
  ): Promise<number> {
    if (!this.config.slidingWindowEnabled) {
      return this.config.ttl;
    }

    const now = Date.now();
    const timeSinceLastActivity =
      now - (session.lastActivity || session.createdAt || now);

    if (timeSinceLastActivity < this.config.slidingWindowThreshold * 1000) {
      return this.config.ttl; // Extend to full TTL
    }

    const existingTtl = await this.redis.ttl(key);
    return existingTtl > 0 ? existingTtl : this.config.ttl;
  }

  /**
   * Update session activity and save to Redis
   */
  private async updateSession(
    key: string,
    session: SessionData,
    ttl: number,
  ): Promise<void> {
    session.lastActivity = Date.now();
    await this.redis.setex(key, ttl, JSON.stringify(session));
  }

  /**
   * Save session to Redis
   */
  async saveSession(sessionId: string, session: SessionData): Promise<void> {
    const key = `session:${sessionId}`;
    const now = Date.now();

    if (!session.createdAt) {
      session.createdAt = now;
    }
    if (!session.lastActivity) {
      session.lastActivity = now;
    }

    await this.redis.setex(key, this.config.ttl, JSON.stringify(session));
  }

  /**
   * Delete session from Redis
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redis.del(key);
  }

  /**
   * Check if access token should be refreshed
   */
  private shouldRefreshToken(session: SessionData): boolean {
    const now = Date.now();
    const timeUntilExpiry = session.expiresAt - now;
    return timeUntilExpiry < this.config.refreshThreshold * 1000;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(session: SessionData): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
  } | null> {
    if (!session.refreshToken) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.keycloakUrl}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: session.refreshToken,
            client_id: this.clientId,
            client_secret: this.clientSecret,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const tokens = await response.json();

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      };
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  /**
   * Cleanup expired sessions (background job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    let count = 0;

    const keys = await this.redis.keys('session:*');

    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl === -1) {
        // No expiration set, delete stale session
        await this.redis.del(key);
        count++;
      }
    }

    return count;
  }
}

/**
 * Fastify plugin for session management
 */
export async function sessionManagerPlugin(
  fastify: FastifyInstance,
  opts: {
    redis: Redis;
    config?: Partial<SessionConfig>;
    keycloak: { url: string; clientId: string; clientSecret: string };
  },
): Promise<void> {
  const manager = new SessionManager(opts.redis, opts.config, opts.keycloak);

  fastify.decorate('sessionManager', manager);

  // Middleware to track activity
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const sessionId = (request as any).session?.id;
    if (sessionId) {
      // Activity tracking handled by getSession
      await manager.getSession(sessionId);
    }
  });

  // Cleanup job (run every hour)
  if (process.env.NODE_ENV !== 'test') {
    setInterval(
      async () => {
        const cleaned = await manager.cleanupExpiredSessions();
        if (cleaned > 0) {
          fastify.log.info({ cleaned }, 'Cleaned up expired sessions');
        }
      },
      60 * 60 * 1000,
    ); // 1 hour
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    sessionManager: SessionManager;
  }
}
