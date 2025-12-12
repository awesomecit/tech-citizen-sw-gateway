/**
 * Mock Identity Provider Adapter
 * For unit tests and development without real identity provider
 * Implements IdentityProviderPort with configurable behavior
 */
import type {
  IdentityProviderPort,
  TokenRefreshResult,
} from '../../application/ports/identity-provider.port.js';

export interface MockIdentityConfig {
  alwaysValid?: boolean;
  expireAfter?: number;
  simulateNetworkError?: boolean;
  tokenTTL?: number;
}

const NETWORK_ERROR_MESSAGE =
  'Mock network error: Identity provider unreachable';

export class MockIdentityAdapter implements IdentityProviderPort {
  private callCount = 0;
  private config: Required<MockIdentityConfig>;

  constructor(config: MockIdentityConfig = {}) {
    this.config = {
      alwaysValid: config.alwaysValid ?? true,
      expireAfter: config.expireAfter ?? Number.MAX_SAFE_INTEGER,
      simulateNetworkError: config.simulateNetworkError ?? false,
      tokenTTL: config.tokenTTL ?? 3600,
    };
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<TokenRefreshResult | null> {
    this.callCount++;

    if (this.config.simulateNetworkError) {
      throw new Error(NETWORK_ERROR_MESSAGE);
    }

    if (this.callCount > this.config.expireAfter) {
      return null;
    }

    if (!refreshToken) {
      return null;
    }

    return {
      accessToken: `mock-access-token-${this.callCount}`,
      refreshToken: `mock-refresh-token-${this.callCount}`,
      expiresIn: this.config.tokenTTL,
    };
  }

  async validateAccessToken(accessToken: string): Promise<boolean> {
    if (this.config.simulateNetworkError) {
      throw new Error(NETWORK_ERROR_MESSAGE);
    }

    if (!accessToken || accessToken === 'invalid-token') {
      return false;
    }

    if (this.callCount > this.config.expireAfter) {
      return false;
    }

    return this.config.alwaysValid;
  }

  async getUserInfo(accessToken: string): Promise<{
    userId: string;
    email: string;
    [key: string]: unknown;
  } | null> {
    if (this.config.simulateNetworkError) {
      throw new Error(NETWORK_ERROR_MESSAGE);
    }

    if (!accessToken || !(await this.validateAccessToken(accessToken))) {
      return null;
    }

    return {
      userId: 'mock-user-123',
      email: 'mock-user@example.com',
      name: 'Mock User',
      roles: ['user'],
    };
  }

  reset(): void {
    this.callCount = 0;
  }

  getCallCount(): number {
    return this.callCount;
  }
}
