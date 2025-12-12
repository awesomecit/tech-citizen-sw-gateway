/**
 * Integration tests for RedisSessionAdapter
 * Uses REAL Redis container via testcontainers
 * Tests infrastructure layer with actual I/O operations
 */
import { test } from 'tap';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { Redis } from 'ioredis';
import { RedisSessionAdapter } from '../../src/infrastructure/adapters/redis-session.adapter.js';
import type { SessionData } from '../../src/domain/entities/session.entity.js';

test('RedisSessionAdapter - Integration Tests', async (t) => {
  let container: StartedTestContainer;
  let redis: Redis;
  let adapter: RedisSessionAdapter;

  t.before(async () => {
    // Start Redis container
    console.log('Starting Redis container...');
    container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(6379);

    redis = new Redis({
      host,
      port,
      lazyConnect: true,
    });

    await redis.connect();
    adapter = new RedisSessionAdapter(redis);
    console.log(`Redis container started at ${host}:${port}`);
  });

  t.after(async () => {
    await redis.quit();
    await container.stop();
    console.log('Redis container stopped');
  });

  t.beforeEach(async () => {
    // Clear Redis before each test
    await redis.flushdb();
  });

  await t.test('saveSession and getSession', async (t) => {
    const sessionId = 'test-session-123';
    const session: SessionData = {
      userId: 'user-123',
      userType: 'domain',
      email: 'test@example.com',
      accessToken: 'access-token-abc',
      refreshToken: 'refresh-token-xyz',
      expiresAt: Date.now() + 3600000,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    await adapter.saveSession(sessionId, session, 3600);

    const retrieved = await adapter.getSession(sessionId);
    t.ok(retrieved, 'session was retrieved');
    t.equal(retrieved?.userId, session.userId, 'userId matches');
    t.equal(retrieved?.email, session.email, 'email matches');
    t.equal(retrieved?.accessToken, session.accessToken, 'accessToken matches');
  });

  await t.test('getSession returns null for non-existent session', async (t) => {
    const retrieved = await adapter.getSession('non-existent');
    t.equal(retrieved, null, 'returns null for missing session');
  });

  await t.test('deleteSession removes session', async (t) => {
    const sessionId = 'delete-test';
    const session: SessionData = {
      userId: 'user-456',
      userType: 'domain',
      email: 'delete@example.com',
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 3600000,
      createdAt: Date.now(),
    };

    await adapter.saveSession(sessionId, session, 3600);
    const before = await adapter.getSession(sessionId);
    t.ok(before, 'session exists before delete');

    await adapter.deleteSession(sessionId);
    const after = await adapter.getSession(sessionId);
    t.equal(after, null, 'session is deleted');
  });

  await t.test('getTTL returns remaining time', async (t) => {
    const sessionId = 'ttl-test';
    const session: SessionData = {
      userId: 'user-789',
      userType: 'domain',
      email: 'ttl@example.com',
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 3600000,
      createdAt: Date.now(),
    };

    await adapter.saveSession(sessionId, session, 60); // 60 seconds

    const ttl = await adapter.getTTL(sessionId);
    t.ok(ttl > 0, 'TTL is positive');
    t.ok(ttl <= 60, 'TTL is <= 60 seconds');
  });

  await t.test('getTTL returns -2 for non-existent key', async (t) => {
    const ttl = await adapter.getTTL('non-existent');
    t.equal(ttl, -2, 'returns -2 for missing key');
  });

  await t.test('extendTTL updates expiration', async (t) => {
    const sessionId = 'extend-test';
    const session: SessionData = {
      userId: 'user-999',
      userType: 'domain',
      email: 'extend@example.com',
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 3600000,
      createdAt: Date.now(),
    };

    await adapter.saveSession(sessionId, session, 60); // Start with 60s
    const ttlBefore = await adapter.getTTL(sessionId);

    await adapter.extendTTL(sessionId, 3600); // Extend to 1 hour
    const ttlAfter = await adapter.getTTL(sessionId);

    t.ok(ttlBefore < ttlAfter, 'TTL was extended');
    t.ok(ttlAfter > 3500, 'TTL is close to 3600');
  });

  await t.test('session with TTL expires automatically', async (t) => {
    const sessionId = 'expire-test';
    const session: SessionData = {
      userId: 'user-expire',
      userType: 'domain',
      email: 'expire@example.com',
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 2000,
      createdAt: Date.now(),
    };

    await adapter.saveSession(sessionId, session, 2); // 2 seconds TTL

    const before = await adapter.getSession(sessionId);
    t.ok(before, 'session exists initially');

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const after = await adapter.getSession(sessionId);
    t.equal(after, null, 'session expired automatically');
  });

  await t.test('handles concurrent operations', async (t) => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      id: `concurrent-${i}`,
      data: {
        userId: `user-${i}`,
        userType: 'domain' as const,
        email: `user${i}@example.com`,
        accessToken: `token-${i}`,
        refreshToken: `refresh-${i}`,
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
      },
    }));

    // Save all sessions concurrently
    await Promise.all(
      sessions.map((s) => adapter.saveSession(s.id, s.data, 3600)),
    );

    // Retrieve all sessions concurrently
    const retrieved = await Promise.all(
      sessions.map((s) => adapter.getSession(s.id)),
    );

    t.equal(retrieved.length, 10, 'all sessions retrieved');
    t.ok(retrieved.every((s: SessionData | null) => s !== null), 'all sessions exist');
  });
});
