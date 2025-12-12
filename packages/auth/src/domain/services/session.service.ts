import type { SessionData } from '../entities/session.entity.js';

export interface SessionConfig {
  ttl: number; // Session TTL in seconds
  slidingWindowEnabled: boolean; // Extend TTL on activity?
  slidingWindowThreshold: number; // Activity threshold in seconds
  refreshThreshold: number; // Refresh token if expires within X seconds
  enableAutoRefresh: boolean;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  ttl: 3600, // 1 hour
  slidingWindowEnabled: true,
  slidingWindowThreshold: 300, // 5 minutes
  refreshThreshold: 300, // 5 minutes
  enableAutoRefresh: true,
};

/**
 * Session Service - Pure Business Logic
 * NO I/O operations, NO dependencies on infrastructure
 * All methods are pure functions or operate on in-memory data
 */
export class SessionService {
  constructor(private readonly config: SessionConfig = DEFAULT_SESSION_CONFIG) {}

  /**
   * Determine if a session is valid (not expired)
   * Pure logic: no I/O
   */
  isSessionValid(session: SessionData | null): boolean {
    if (!session) return false;
    return session.expiresAt > Date.now();
  }

  /**
   * Determine if the token should be refreshed
   * (expires within refreshThreshold seconds)
   */
  shouldRefreshToken(session: SessionData): boolean {
    if (!this.config.enableAutoRefresh) return false;

    const now = Date.now();
    const timeUntilExpiry = session.expiresAt - now;
    const thresholdMs = this.config.refreshThreshold * 1000;

    return timeUntilExpiry < thresholdMs && timeUntilExpiry > 0;
  }

  /**
   * Determine if session TTL should be extended (sliding window)
   * Based on recent activity
   */
  shouldExtendSession(session: SessionData): boolean {
    if (!this.config.slidingWindowEnabled) return false;

    const lastActivity = session.lastActivity ?? session.createdAt ?? 0;
    const timeSinceActivity = Date.now() - lastActivity;
    const thresholdMs = this.config.slidingWindowThreshold * 1000;

    return timeSinceActivity < thresholdMs;
  }

  /**
   * Calculate new TTL for session based on activity
   * Returns TTL in seconds
   */
  calculateTTL(session: SessionData, currentTTL?: number): number {
    if (!this.config.slidingWindowEnabled) {
      return this.config.ttl;
    }

    // If recent activity, extend to full TTL
    if (this.shouldExtendSession(session)) {
      return this.config.ttl;
    }

    // Otherwise, keep existing TTL or default
    return currentTTL ?? this.config.ttl;
  }

  /**
   * Get time until session expires (in milliseconds)
   */
  getTimeUntilExpiry(session: SessionData): number {
    return Math.max(0, session.expiresAt - Date.now());
  }

  /**
   * Check if session is about to expire (within threshold)
   */
  isSessionExpiringSoon(session: SessionData): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry(session);
    return timeUntilExpiry < this.config.refreshThreshold * 1000;
  }
}
