/**
 * Redis Adapter for Session Repository
 * Implements SessionRepositoryPort using ioredis
 * Infrastructure layer - depends on external Redis service
 */
import type { Redis } from 'ioredis';
import type { SessionData } from '../../domain/entities/session.entity.js';
import type { SessionRepositoryPort } from '../../application/ports/session-repository.port.js';

export class RedisSessionAdapter implements SessionRepositoryPort {
  constructor(private readonly redis: Redis) {}

  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = this.buildKey(sessionId);
    const data = await this.redis.get(key);

    if (!data) return null;

    try {
      return JSON.parse(data) as SessionData;
    } catch (error) {
      console.error('Failed to parse session data', { sessionId, error });
      return null;
    }
  }

  async saveSession(
    sessionId: string,
    session: SessionData,
    ttl: number,
  ): Promise<void> {
    const key = this.buildKey(sessionId);
    const data = JSON.stringify(session);
    await this.redis.setex(key, ttl, data);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = this.buildKey(sessionId);
    await this.redis.del(key);
  }

  async getTTL(sessionId: string): Promise<number> {
    const key = this.buildKey(sessionId);
    return await this.redis.ttl(key);
  }

  async extendTTL(sessionId: string, ttl: number): Promise<void> {
    const key = this.buildKey(sessionId);
    await this.redis.expire(key, ttl);
  }

  /**
   * Build Redis key with namespace prefix
   */
  private buildKey(sessionId: string): string {
    return `session:${sessionId}`;
  }
}
