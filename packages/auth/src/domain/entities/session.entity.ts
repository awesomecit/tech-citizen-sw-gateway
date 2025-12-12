/**
 * Session Entity
 * Pure domain object representing a user session
 */
export interface SessionData {
  userId: string;
  userType: 'domain' | 'service';
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
  lastActivity?: number; // Unix timestamp in milliseconds
  createdAt?: number; // Unix timestamp in milliseconds
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/**
 * Create a new session entity
 */
export function createSession(
  userId: string,
  email: string,
  userType: 'domain' | 'service',
  tokens: TokenPair,
): SessionData {
  const now = Date.now();
  return {
    userId,
    userType,
    email,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: now + tokens.expiresIn * 1000,
    createdAt: now,
    lastActivity: now,
  };
}

/**
 * Update session with new tokens
 */
export function updateSessionTokens(
  session: SessionData,
  tokens: TokenPair,
): SessionData {
  return {
    ...session,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
    lastActivity: Date.now(),
  };
}

/**
 * Update session activity timestamp
 */
export function updateSessionActivity(session: SessionData): SessionData {
  return {
    ...session,
    lastActivity: Date.now(),
  };
}
