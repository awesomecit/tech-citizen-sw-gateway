/**
 * Unit tests for RefreshSessionUseCase
 * Uses MOCK adapters (no containers, fast tests)
 * Tests business logic orchestration
 */
import t from 'tap';
import { RefreshSessionUseCase } from '../../../src/application/use-cases/refresh-session.use-case.js';
import {
  SessionService,
  DEFAULT_SESSION_CONFIG,
} from '../../../src/domain/services/session.service.js';
import { MockIdentityAdapter } from '../../../src/infrastructure/adapters/mock-identity.adapter.js';
import type { SessionRepositoryPort } from '../../../src/application/ports/session-repository.port.js';
import type { SessionData } from '../../../src/domain/entities/session.entity.js';
import { createSession } from '../../../src/domain/entities/session.entity.js';

/**
 * In-memory mock repository for testing
 */
class MockSessionRepository implements SessionRepositoryPort {
  private sessions = new Map<string, { data: SessionData; ttl: number }>();

  async getSession(sessionId: string): Promise<SessionData | null> {
    return this.sessions.get(sessionId)?.data ?? null;
  }

  async saveSession(
    sessionId: string,
    session: SessionData,
    ttl: number,
  ): Promise<void> {
    this.sessions.set(sessionId, { data: session, ttl });
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async getTTL(sessionId: string): Promise<number> {
    const entry = this.sessions.get(sessionId);
    return entry ? entry.ttl : -2;
  }

  async extendTTL(sessionId: string, ttl: number): Promise<void> {
    const entry = this.sessions.get(sessionId);
    if (entry) {
      entry.ttl = ttl;
    }
  }

  reset(): void {
    this.sessions.clear();
  }
}

t.test('RefreshSessionUseCase', async t => {
  t.test('should return existing session when no refresh needed', async t => {
    const repo = new MockSessionRepository();
    const identity = new MockIdentityAdapter();
    const service = new SessionService(DEFAULT_SESSION_CONFIG);
    const useCase = new RefreshSessionUseCase(repo, identity, service);

    // Create session that expires far in the future (no refresh needed)
    const session = createSession('user-123', 'test@example.com', 'domain', {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 7200, // 2 hours
    });

    await repo.saveSession('session-123', session, 3600);

    const result = await useCase.execute('session-123');

    t.equal(result.wasRefreshed, false, 'should not refresh');
    t.equal(result.session.userId, 'user-123', 'should return correct session');
    t.equal(
      result.session.accessToken,
      'access-token',
      'should keep same token',
    );
  });

  t.test('should refresh tokens when nearing expiration', async t => {
    const repo = new MockSessionRepository();
    const identity = new MockIdentityAdapter();
    const service = new SessionService({
      ...DEFAULT_SESSION_CONFIG,
      refreshThreshold: 3600, // 1 hour threshold
    });
    const useCase = new RefreshSessionUseCase(repo, identity, service);

    // Create session that expires in 30 minutes (within threshold)
    const session = createSession('user-123', 'test@example.com', 'domain', {
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
      expiresIn: 1800, // 30 minutes
    });

    await repo.saveSession('session-123', session, 3600);

    const result = await useCase.execute('session-123');

    t.equal(result.wasRefreshed, true, 'should refresh');
    t.equal(result.session.userId, 'user-123', 'should keep user ID');
    t.equal(
      result.session.accessToken,
      'mock-access-token-1',
      'should have new token',
    );
    t.equal(
      result.session.refreshToken,
      'mock-refresh-token-1',
      'should have new refresh token',
    );
    t.not(
      result.session.accessToken,
      'old-access-token',
      'should not be old token',
    );
  });

  t.test('should throw SessionExpiredError for missing session', async t => {
    const repo = new MockSessionRepository();
    const identity = new MockIdentityAdapter();
    const service = new SessionService(DEFAULT_SESSION_CONFIG);
    const useCase = new RefreshSessionUseCase(repo, identity, service);

    await t.rejects(
      useCase.execute('non-existent-session'),
      /Session.*expired/i,
      'should throw SessionExpiredError',
    );
  });

  t.test('should throw SessionExpiredError for expired session', async t => {
    const repo = new MockSessionRepository();
    const identity = new MockIdentityAdapter();
    const service = new SessionService(DEFAULT_SESSION_CONFIG);
    const useCase = new RefreshSessionUseCase(repo, identity, service);

    // Create session that expired 1 hour ago
    const session = createSession('user-123', 'test@example.com', 'domain', {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: -3600, // Negative = expired
    });

    await repo.saveSession('session-123', session, 3600);

    await t.rejects(
      useCase.execute('session-123'),
      /Session.*expired/i,
      'should throw SessionExpiredError',
    );
  });

  t.test(
    'should throw TokenRefreshError when identity provider fails',
    async t => {
      const repo = new MockSessionRepository();
      const identity = new MockIdentityAdapter({ expireAfter: 0 }); // Always fail
      const service = new SessionService({
        ...DEFAULT_SESSION_CONFIG,
        refreshThreshold: 3600,
      });
      const useCase = new RefreshSessionUseCase(repo, identity, service);

      const session = createSession('user-123', 'test@example.com', 'domain', {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 1800, // 30 minutes (within threshold)
      });

      await repo.saveSession('session-123', session, 3600);

      await t.rejects(
        useCase.execute('session-123'),
        /Failed to refresh access token/,
        'should throw TokenRefreshError',
      );
    },
  );

  t.test('should extend TTL when sliding window enabled', async t => {
    const repo = new MockSessionRepository();
    const identity = new MockIdentityAdapter();
    const service = new SessionService({
      ...DEFAULT_SESSION_CONFIG,
      slidingWindowEnabled: true,
      slidingWindowThreshold: 3600, // 1 hour
    });
    const useCase = new RefreshSessionUseCase(repo, identity, service);

    // Create session with recent activity
    const session = createSession('user-123', 'test@example.com', 'domain', {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 7200, // 2 hours
    });
    session.lastActivity = Date.now() - 60_000; // Active 1 minute ago

    await repo.saveSession('session-123', session, 1800); // Start with lower TTL

    await useCase.execute('session-123');
    const finalTTL = await repo.getTTL('session-123');

    t.equal(finalTTL, DEFAULT_SESSION_CONFIG.ttl, 'should extend to full TTL');
  });

  t.test('should update lastActivity timestamp', async t => {
    const repo = new MockSessionRepository();
    const identity = new MockIdentityAdapter();
    const service = new SessionService(DEFAULT_SESSION_CONFIG);
    const useCase = new RefreshSessionUseCase(repo, identity, service);

    const session = createSession('user-123', 'test@example.com', 'domain', {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 7200,
    });
    const originalActivity = session.lastActivity!;

    await repo.saveSession('session-123', session, 3600);

    // Wait a bit to ensure timestamp changes
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await useCase.execute('session-123');

    t.ok(result.session.lastActivity, 'should have lastActivity');
    t.ok(
      result.session.lastActivity! > originalActivity,
      'should update lastActivity',
    );
  });
});
