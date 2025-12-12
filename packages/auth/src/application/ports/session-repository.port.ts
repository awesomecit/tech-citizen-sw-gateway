/**
 * Port (Interface) for Session Repository
 * Defines the contract for session storage operations
 * Infrastructure adapters (Redis, Memcached, etc.) implement this interface
 */
import type { SessionData } from '../../domain/entities/session.entity.js';

export interface SessionRepositoryPort {
  /**
   * Retrieve session by ID
   * @returns Session data or null if not found
   */
  getSession(sessionId: string): Promise<SessionData | null>;

  /**
   * Save session with TTL
   * @param sessionId - Unique session identifier
   * @param session - Session data to store
   * @param ttl - Time-to-live in seconds
   */
  saveSession(
    sessionId: string,
    session: SessionData,
    ttl: number,
  ): Promise<void>;

  /**
   * Delete session
   * @param sessionId - Session identifier to delete
   */
  deleteSession(sessionId: string): Promise<void>;

  /**
   * Get remaining TTL for session
   * @returns TTL in seconds, -1 if expired, -2 if not found
   */
  getTTL(sessionId: string): Promise<number>;

  /**
   * Update session TTL without modifying data
   * @param sessionId - Session identifier
   * @param ttl - New TTL in seconds
   */
  extendTTL(sessionId: string, ttl: number): Promise<void>;
}
