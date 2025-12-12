/**
 * Refresh Session Use Case
 * Orchestrates session refresh flow using domain services and infrastructure ports
 * Pure business logic - no I/O, depends on abstractions (ports)
 */
import type { SessionData } from '../../domain/entities/session.entity.js';
import { SessionService } from '../../domain/services/session.service.js';
import {
  updateSessionTokens,
  updateSessionActivity,
} from '../../domain/entities/session.entity.js';
import type { SessionRepositoryPort } from '../ports/session-repository.port.js';
import type { IdentityProviderPort } from '../ports/identity-provider.port.js';
import {
  SessionExpiredError,
  TokenRefreshError,
} from '../../domain/errors/auth.errors.js';

export interface RefreshSessionResult {
  session: SessionData;
  wasRefreshed: boolean;
}

export class RefreshSessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly identityProvider: IdentityProviderPort,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Refresh session if needed (token expired or nearing expiration)
   * Extends session TTL on successful refresh
   */
  async execute(sessionId: string): Promise<RefreshSessionResult> {
    const session = await this.getValidSession(sessionId);

    if (!this.sessionService.shouldRefreshToken(session)) {
      return await this.handleNoRefreshNeeded(sessionId, session);
    }

    return await this.handleTokenRefresh(sessionId, session);
  }

  private async getValidSession(sessionId: string): Promise<SessionData> {
    const session = await this.sessionRepository.getSession(sessionId);
    if (!session || !this.sessionService.isSessionValid(session)) {
      throw new SessionExpiredError(sessionId);
    }
    return session;
  }

  private async handleNoRefreshNeeded(
    sessionId: string,
    session: SessionData,
  ): Promise<RefreshSessionResult> {
    const updatedSession = updateSessionActivity(session);

    if (this.sessionService.shouldExtendSession(updatedSession)) {
      const currentTTL = await this.sessionRepository.getTTL(sessionId);
      const newTTL = this.sessionService.calculateTTL(
        updatedSession,
        currentTTL,
      );
      await this.sessionRepository.extendTTL(sessionId, newTTL);
    }

    const ttl = this.sessionService.calculateTTL(updatedSession);
    await this.sessionRepository.saveSession(sessionId, updatedSession, ttl);

    return { session: updatedSession, wasRefreshed: false };
  }

  private async handleTokenRefresh(
    sessionId: string,
    session: SessionData,
  ): Promise<RefreshSessionResult> {
    const tokenResult = await this.identityProvider.refreshAccessToken(
      session.refreshToken,
    );
    if (!tokenResult || !tokenResult.refreshToken) {
      throw new TokenRefreshError('Failed to refresh access token');
    }

    const refreshedSession = updateSessionTokens(session, {
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresIn: tokenResult.expiresIn,
    });

    const ttl = this.sessionService.calculateTTL(refreshedSession);
    await this.sessionRepository.saveSession(sessionId, refreshedSession, ttl);

    return { session: refreshedSession, wasRefreshed: true };
  }
}
