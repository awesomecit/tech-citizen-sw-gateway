/**
 * Keycloak Identity Provider Adapter
 * Implements OIDC protocol for Keycloak
 * Uses standard token endpoints for refresh, validation, and user info
 */
import type {
  IdentityProviderPort,
  TokenRefreshResult,
} from '../../application/ports/identity-provider.port.js';

export interface KeycloakConfig {
  /** Keycloak base URL (e.g., https://keycloak.example.com) */
  baseUrl: string;
  /** Realm name */
  realm: string;
  /** Client ID */
  clientId: string;
  /** Client secret (required for confidential clients) */
  clientSecret?: string;
  /** Request timeout in milliseconds (default: 5000) */
  timeout?: number;
}

interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface KeycloakIntrospectResponse {
  active: boolean;
  exp?: number;
  iat?: number;
  sub?: string;
}

interface KeycloakUserInfoResponse {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  [key: string]: unknown;
}

export class KeycloakIdentityAdapter implements IdentityProviderPort {
  private readonly config: Required<KeycloakConfig>;
  private readonly tokenEndpoint: string;
  private readonly introspectEndpoint: string;
  private readonly userInfoEndpoint: string;

  constructor(config: KeycloakConfig) {
    this.config = {
      ...config,
      timeout: config.timeout ?? 5000,
      clientSecret: config.clientSecret ?? '',
    };

    const realmPath = `/realms/${this.config.realm}/protocol/openid-connect`;
    this.tokenEndpoint = `${this.config.baseUrl}${realmPath}/token`;
    this.introspectEndpoint = `${this.config.baseUrl}${realmPath}/token/introspect`;
    this.userInfoEndpoint = `${this.config.baseUrl}${realmPath}/userinfo`;
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<TokenRefreshResult | null> {
    if (!refreshToken) {
      return null;
    }

    const params = this.buildRefreshTokenParams(refreshToken);
    const response = await this.fetchWithTimeout(this.tokenEndpoint, params);

    if (!response.ok) {
      if (response.status === 400 || response.status === 401) {
        return null;
      }
      throw new Error(
        `Keycloak token refresh failed: ${response.status} ${response.statusText}`,
      );
    }

    const data: KeycloakTokenResponse = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  private buildRefreshTokenParams(refreshToken: string): URLSearchParams {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
    });

    if (this.config.clientSecret) {
      params.append('client_secret', this.config.clientSecret);
    }

    return params;
  }

  private async fetchWithTimeout(
    url: string,
    params: URLSearchParams,
  ): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout,
      );

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error(
          `Keycloak request timeout after ${this.config.timeout}ms`,
        );
      }
      throw new Error(`Keycloak request error: ${(error as Error).message}`);
    }
  }

  async validateAccessToken(accessToken: string): Promise<boolean> {
    if (!accessToken) {
      return false;
    }

    const params = new URLSearchParams({
      token: accessToken,
      client_id: this.config.clientId,
    });

    if (this.config.clientSecret) {
      params.append('client_secret', this.config.clientSecret);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout,
      );

      const response = await fetch(this.introspectEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Keycloak token introspection failed: ${response.status} ${response.statusText}`,
        );
      }

      const data: KeycloakIntrospectResponse = await response.json();

      return data.active === true;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error(
          `Keycloak token introspection timeout after ${this.config.timeout}ms`,
        );
      }
      throw new Error(
        `Keycloak token introspection error: ${(error as Error).message}`,
      );
    }
  }

  async getUserInfo(accessToken: string): Promise<{
    userId: string;
    email: string;
    [key: string]: unknown;
  } | null> {
    if (!accessToken || !(await this.validateAccessToken(accessToken))) {
      return null;
    }

    const response = await this.fetchUserInfo(accessToken);

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error(
        `Keycloak user info failed: ${response.status} ${response.statusText}`,
      );
    }

    const data: KeycloakUserInfoResponse = await response.json();
    return this.buildUserInfo(data);
  }

  private async fetchUserInfo(accessToken: string): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout,
      );

      const response = await fetch(this.userInfoEndpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error(
          `Keycloak user info timeout after ${this.config.timeout}ms`,
        );
      }
      throw new Error(`Keycloak user info error: ${(error as Error).message}`);
    }
  }

  private buildUserInfo(data: KeycloakUserInfoResponse) {
    return {
      userId: data.sub,
      email: data.email ?? '',
      username: data.preferred_username,
      name: data.name,
      ...data,
    };
  }
}
