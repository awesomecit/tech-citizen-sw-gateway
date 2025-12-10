import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Redis from 'ioredis';
import { SessionManager, type SessionData } from '../src/session-manager';

describe('SessionManager (Real Redis)', () => {
  let redis: Redis;
  let sessionManager: SessionManager;

  beforeEach(async () => {
    // Use real Redis on test port
    redis = new Redis({
      host: 'localhost',
      port: 6381,
      password: 'dev-redis-password',
      db: 15, // Use dedicated DB for tests
    });

    // Flush test DB before each test
    await redis.flushdb();

    sessionManager = new SessionManager(
      redis,
      {
        ttl: 3600,
        slidingWindowEnabled: true,
        slidingWindowThreshold: 300,
        refreshThreshold: 300,
        enableAutoRefresh: false, // Disable for unit tests
      },
      {
        url: 'http://localhost:8091/realms/healthcare-domain',
        clientId: 'test-client',
        clientSecret: 'test-secret',
      },
    );
  });

  afterEach(async () => {
    await redis.flushdb();
    await redis.quit();
  });

  describe('saveSession', () => {
    it('should save session to Redis with TTL', async () => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresAt: Date.now() + 3600000,
      };

      await sessionManager.saveSession('session-123', session);

      const saved = await redis.get('session:session-123');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed.userId).toBe('user-123');
      expect(parsed.createdAt).toBeDefined();
      expect(parsed.lastActivity).toBeDefined();

      const ttl = await redis.ttl('session:session-123');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('should preserve createdAt on subsequent saves', async () => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        createdAt: 1000000,
      };

      await sessionManager.saveSession('session-123', session);

      const saved = JSON.parse((await redis.get('session:session-123'))!);
      expect(saved.createdAt).toBe(1000000);
    });
  });

  describe('getSession', () => {
    it('should return null for non-existent session', async () => {
      const session = await sessionManager.getSession('nonexistent');
      expect(session).toBeNull();
    });

    it('should return session data', async () => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
      };

      await sessionManager.saveSession('session-123', session);

      const retrieved = await sessionManager.getSession('session-123');
      expect(retrieved).toBeTruthy();
      expect(retrieved!.userId).toBe('user-123');
      expect(retrieved!.lastActivity).toBeDefined();
    });

    it('should update lastActivity on get', async () => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        lastActivity: Date.now() - 10000,
      };

      await sessionManager.saveSession('session-123', session);

      const before = Date.now();
      const retrieved = await sessionManager.getSession('session-123');

      expect(retrieved!.lastActivity).toBeGreaterThanOrEqual(before);
    });
  });

  describe('deleteSession', () => {
    it('should delete session from Redis', async () => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
      };

      await sessionManager.saveSession('session-123', session);
      expect(await redis.get('session:session-123')).toBeTruthy();

      await sessionManager.deleteSession('session-123');
      expect(await redis.get('session:session-123')).toBeNull();
    });
  });

  describe('sliding window', () => {
    it('should extend TTL on recent activity', async () => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        lastActivity: Date.now() - 60000, // 1 minute ago
      };

      await sessionManager.saveSession('session-123', session);

      // Manually set lower TTL
      await redis.expire('session:session-123', 100);

      // Get session (should trigger sliding window)
      await sessionManager.getSession('session-123');

      const ttl = await redis.ttl('session:session-123');
      expect(ttl).toBeGreaterThan(100);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('should not extend TTL if activity is old', async () => {
      const manager = new SessionManager(
        redis,
        {
          ttl: 3600,
          slidingWindowEnabled: true,
          slidingWindowThreshold: 60, // 1 minute threshold
          refreshThreshold: 300,
          enableAutoRefresh: false,
        },
        {
          url: 'http://localhost:8090/realms/test',
          clientId: 'test',
          clientSecret: 'secret',
        },
      );

      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        lastActivity: Date.now() - 120000, // 2 minutes ago (beyond threshold)
        createdAt: Date.now() - 120000,
      };

      await manager.saveSession('session-123', session);
      await redis.expire('session:session-123', 100);

      await manager.getSession('session-123');

      const ttl = await redis.ttl('session:session-123');
      expect(ttl).toBeLessThanOrEqual(100);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove sessions without TTL', async () => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
      };

      // Save session and remove TTL (simulate stale session)
      await redis.set('session:stale-123', JSON.stringify(session));

      const cleaned = await sessionManager.cleanupExpiredSessions();
      expect(cleaned).toBe(1);

      const exists = await redis.exists('session:stale-123');
      expect(exists).toBe(0);
    });

    it('should not remove sessions with valid TTL', async () => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
      };

      await sessionManager.saveSession('session-123', session);

      const cleaned = await sessionManager.cleanupExpiredSessions();
      expect(cleaned).toBe(0);

      const exists = await redis.exists('session:session-123');
      expect(exists).toBe(1);
    });
  });
});
