/**
 * Port (Interface) for Identity Provider
 * Defines the contract for OAuth/OIDC operations
 * Infrastructure adapters (Keycloak, Auth0, etc.) implement this interface
 */

export interface TokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number; // seconds
}

export interface IdentityProviderPort {
  /**
   * Refresh access token using refresh token
   * @param refreshToken - Current refresh token
   * @returns New token pair or null if refresh failed
   */
  refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult | null>;

  /**
   * Validate access token
   * @param accessToken - Token to validate
   * @returns true if valid, false otherwise
   */
  validateAccessToken(accessToken: string): Promise<boolean>;

  /**
   * Get user info from access token
   * @param accessToken - Valid access token
   * @returns User information or null if invalid
   */
  getUserInfo(accessToken: string): Promise<{
    userId: string;
    email: string;
    [key: string]: unknown;
  } | null>;
}
