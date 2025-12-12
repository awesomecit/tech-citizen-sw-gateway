/**
 * Unit tests for SessionService (Domain Layer)
 * Pure logic tests - NO infrastructure, NO mocks needed
 * These tests run in milliseconds
 */
import { test } from 'tap';
import {
  SessionService,
  DEFAULT_SESSION_CONFIG,
} from '../../../src/domain/services/session.service.js';
import type { SessionData } from '../../../src/domain/entities/session.entity.js';

test('SessionService - Domain Logic', async (t) => {
  const service = new SessionService(DEFAULT_SESSION_CONFIG);

  await t.test('isSessionValid', async (t) => {
    await t.test('returns false for null session', async (t) => {
      t.equal(service.isSessionValid(null), false, 'null session is invalid');
    });

    await t.test('returns false for expired session', async (t) => {
      const expiredSession: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() - 10000, // Expired 10s ago
        createdAt: Date.now() - 3600000,
        lastActivity: Date.now() - 10000,
      };

      t.equal(service.isSessionValid(expiredSession), false, 'expired session is invalid');
    });

    await t.test('returns true for valid session', async (t) => {
      const validSession: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000, // Expires in 1 hour
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      t.equal(service.isSessionValid(validSession), true, 'valid session is valid');
    });
  });

  await t.test('shouldRefreshToken', async (t) => {
    await t.test('returns false if auto-refresh disabled', async (t) => {
      const serviceNoRefresh = new SessionService({
        ...DEFAULT_SESSION_CONFIG,
        enableAutoRefresh: false,
      });

      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 60000, // 1 minute
        createdAt: Date.now(),
      };

      t.equal(serviceNoRefresh.shouldRefreshToken(session), false, 'refresh disabled');
    });

    await t.test('returns true if expires within threshold', async (t) => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 60000, // 1 minute (< 5 min threshold)
        createdAt: Date.now(),
      };

      t.equal(service.shouldRefreshToken(session), true, 'should refresh soon-to-expire token');
    });

    await t.test('returns false if expires beyond threshold', async (t) => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 600000, // 10 minutes (> 5 min threshold)
        createdAt: Date.now(),
      };

      t.equal(service.shouldRefreshToken(session), false, 'no refresh needed yet');
    });

    await t.test('returns false if already expired', async (t) => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() - 10000, // Expired
        createdAt: Date.now() - 3600000,
      };

      t.equal(service.shouldRefreshToken(session), false, 'cannot refresh expired token');
    });
  });

  await t.test('shouldExtendSession', async (t) => {
    await t.test('returns false if sliding window disabled', async (t) => {
      const serviceNoSliding = new SessionService({
        ...DEFAULT_SESSION_CONFIG,
        slidingWindowEnabled: false,
      });

      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      t.equal(serviceNoSliding.shouldExtendSession(session), false, 'sliding window disabled');
    });

    await t.test('returns true if recent activity', async (t) => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
        lastActivity: Date.now() - 60000, // 1 minute ago (< 5 min threshold)
      };

      t.equal(service.shouldExtendSession(session), true, 'recent activity extends session');
    });

    await t.test('returns false if stale activity', async (t) => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now() - 3600000,
        lastActivity: Date.now() - 600000, // 10 minutes ago (> 5 min threshold)
      };

      t.equal(service.shouldExtendSession(session), false, 'stale activity does not extend');
    });
  });

  await t.test('calculateTTL', async (t) => {
    await t.test('returns configured TTL if sliding window disabled', async (t) => {
      const serviceNoSliding = new SessionService({
        ...DEFAULT_SESSION_CONFIG,
        slidingWindowEnabled: false,
        ttl: 7200,
      });

      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      t.equal(serviceNoSliding.calculateTTL(session), 7200, 'returns configured TTL');
    });

    await t.test('returns full TTL if recent activity', async (t) => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
        lastActivity: Date.now() - 60000, // Recent
      };

      t.equal(service.calculateTTL(session), 3600, 'extends to full TTL');
    });

    await t.test('returns current TTL if stale activity', async (t) => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now() - 3600000,
        lastActivity: Date.now() - 600000, // Stale
      };

      t.equal(service.calculateTTL(session, 1800), 1800, 'keeps current TTL');
    });
  });

  await t.test('getTimeUntilExpiry', async (t) => {
    await t.test('returns positive time for valid session', async (t) => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 300000, // 5 minutes
        createdAt: Date.now(),
      };

      const timeLeft = service.getTimeUntilExpiry(session);
      t.ok(timeLeft > 0, 'time left is positive');
      t.ok(timeLeft <= 300000, 'time left is <= 5 minutes');
    });

    await t.test('returns 0 for expired session', async (t) => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() - 10000, // Expired
        createdAt: Date.now() - 3600000,
      };

      t.equal(service.getTimeUntilExpiry(session), 0, 'expired session returns 0');
    });
  });

  await t.test('isSessionExpiringSoon', async (t) => {
    await t.test('returns true if expires within threshold', async (t) => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 60000, // 1 minute (< 5 min threshold)
        createdAt: Date.now(),
      };

      t.equal(service.isSessionExpiringSoon(session), true, 'session expiring soon');
    });

    await t.test('returns false if expires beyond threshold', async (t) => {
      const session: SessionData = {
        userId: 'user-123',
        userType: 'domain',
        email: 'test@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 600000, // 10 minutes (> 5 min threshold)
        createdAt: Date.now(),
      };

      t.equal(service.isSessionExpiringSoon(session), false, 'session not expiring soon');
    });
  });
});
