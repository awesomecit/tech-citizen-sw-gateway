/**
 * Custom errors for the auth domain
 */
export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
  }
}

export class SessionExpiredError extends Error {
  constructor(sessionId: string) {
    super(`Session expired: ${sessionId}`);
    this.name = 'SessionExpiredError';
  }
}

export class TokenRefreshError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(`Token refresh failed: ${message}`);
    this.name = 'TokenRefreshError';
  }
}

export class InvalidTokenError extends Error {
  constructor(message: string) {
    super(`Invalid token: ${message}`);
    this.name = 'InvalidTokenError';
  }
}
