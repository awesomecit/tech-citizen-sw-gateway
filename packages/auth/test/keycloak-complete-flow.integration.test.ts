import { describe, it, expect, beforeAll } from '@jest/globals';

/**
 * Complete Keycloak Authentication Flow Integration Tests
 *
 * Tests the full authentication lifecycle with REAL users and tokens:
 * - Login with password grant (Resource Owner Password Credentials)
 * - JWT token validation
 * - User info retrieval
 * - Token introspection
 * - Logout and token revocation
 *
 * Infrastructure managed by test:integration:infra wrapper (bash scripts)
 * Run: npm run test:integration:infra
 */
describe('Keycloak Complete Authentication Flow', () => {
  const KEYCLOAK_URL = 'http://localhost:8090';
  const REALM = 'healthcare-domain';
  const CLIENT_ID = 'test-client';

  const TEST_USERS = [
    {
      username: 'test@healthcare.local',
      password: 'Test1234!',
      expectedRole: 'patient',
      expectedFirstName: 'Test',
      expectedLastName: 'User',
    },
    {
      username: 'doctor@healthcare.local',
      password: 'Doctor1234!',
      expectedRole: 'doctor',
      expectedFirstName: 'Dr. John',
      expectedLastName: 'Smith',
    },
    {
      username: 'admin@healthcare.local',
      password: 'Admin1234!',
      expectedRole: 'system-admin',
      expectedFirstName: 'System',
      expectedLastName: 'Admin',
    },
  ];

  beforeAll(async () => {
    // Infrastructure managed by test:integration:infra wrapper
    // Quick verification that Keycloak is available
    const discoveryResponse = await fetch(
      `${KEYCLOAK_URL}/realms/${REALM}/.well-known/openid-configuration`,
    );
    expect(discoveryResponse.ok).toBe(true);
  }, 10000); // Quick verification

  describe('User Login (Password Grant)', () => {
    it.each(TEST_USERS)(
      'should authenticate $username with password grant',
      async ({ username, password }) => {
        const response = await fetch(
          `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: CLIENT_ID,
              username,
              password,
              grant_type: 'password',
            }),
          },
        );

        expect(response.ok).toBe(true);

        const tokens = await response.json();
        expect(tokens).toMatchObject({
          access_token: expect.any(String),
          refresh_token: expect.any(String),
          token_type: 'Bearer',
          expires_in: expect.any(Number),
        });

        // Verify access token is valid JWT
        const tokenParts = tokens.access_token.split('.');
        expect(tokenParts).toHaveLength(3); // header.payload.signature

        // Decode payload
        const payload = JSON.parse(
          Buffer.from(tokenParts[1], 'base64').toString(),
        );
        expect(payload).toMatchObject({
          sub: expect.any(String), // User UUID
          exp: expect.any(Number), // Expiration timestamp
          iat: expect.any(Number), // Issued at timestamp
          iss: `${KEYCLOAK_URL}/realms/${REALM}`,
        });

        // Verify token lifetime is approximately 5 minutes (300 seconds, with 1s tolerance)
        expect(tokens.expires_in).toBeGreaterThanOrEqual(299);
        expect(tokens.expires_in).toBeLessThanOrEqual(300);
      },
    );

    it('should reject login with invalid credentials', async () => {
      const response = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            username: 'test@healthcare.local',
            password: 'WrongPassword123!',
            grant_type: 'password',
          }),
        },
      );

      expect(response.status).toBe(401);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'invalid_grant',
        error_description: expect.stringContaining('Invalid user credentials'),
      });
    });

    it('should reject login with non-existent user', async () => {
      const response = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            username: 'nonexistent@healthcare.local',
            password: 'AnyPassword123!',
            grant_type: 'password',
          }),
        },
      );

      expect(response.status).toBe(401);

      const error = await response.json();
      expect(error.error).toBe('invalid_grant');
    });
  });

  describe('JWT Token Validation', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Get token for test user
      const response = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            username: 'test@healthcare.local',
            password: 'Test1234!',
            grant_type: 'password',
          }),
        },
      );
      const tokens = await response.json();
      accessToken = tokens.access_token;
    });

    it('should have valid JWT structure', () => {
      const parts = accessToken.split('.');
      expect(parts).toHaveLength(3);

      // Header
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      expect(header).toMatchObject({
        alg: 'RS256', // RSA signature
        typ: 'JWT',
      });

      // Payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload).toMatchObject({
        sub: expect.any(String),
        iss: `${KEYCLOAK_URL}/realms/${REALM}`,
        exp: expect.any(Number),
        iat: expect.any(Number),
      });
    });

    it('should have valid expiration time', () => {
      const payload = JSON.parse(
        Buffer.from(accessToken.split('.')[1], 'base64').toString(),
      );

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;

      // Should expire in approximately 5 minutes (with tolerance)
      expect(expiresIn).toBeGreaterThan(290);
      expect(expiresIn).toBeLessThanOrEqual(300);
    });

    it('should include issuer matching Keycloak realm', () => {
      const payload = JSON.parse(
        Buffer.from(accessToken.split('.')[1], 'base64').toString(),
      );

      expect(payload.iss).toBe(`${KEYCLOAK_URL}/realms/${REALM}`);
    });
  });

  describe('User Info Endpoint', () => {
    it.each(TEST_USERS)(
      'should retrieve user info for $username',
      async ({ username, password, expectedFirstName, expectedLastName }) => {
        // Login
        const tokenResponse = await fetch(
          `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: CLIENT_ID,
              username,
              password,
              grant_type: 'password',
              scope: 'openid profile email', // Request additional scopes
            }),
          },
        );
        const tokens = await tokenResponse.json();

        // Get user info
        const userInfoResponse = await fetch(
          `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/userinfo`,
          {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          },
        );

        expect(userInfoResponse.ok).toBe(true);

        const userInfo = await userInfoResponse.json();
        expect(userInfo).toMatchObject({
          sub: expect.any(String),
          email: username,
          email_verified: true,
          given_name: expectedFirstName,
          family_name: expectedLastName,
        });
      },
    );

    it('should reject userinfo request without token', async () => {
      const response = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/userinfo`,
      );

      expect(response.status).toBe(401);
    });

    it('should reject userinfo request with invalid token', async () => {
      const response = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/userinfo`,
        {
          headers: { Authorization: 'Bearer invalid.token.here' },
        },
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token using refresh token', async () => {
      // Login
      const loginResponse = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            username: 'test@healthcare.local',
            password: 'Test1234!',
            grant_type: 'password',
          }),
        },
      );
      const loginTokens = await loginResponse.json();

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh token
      const refreshResponse = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            refresh_token: loginTokens.refresh_token,
            grant_type: 'refresh_token',
          }),
        },
      );

      expect(refreshResponse.ok).toBe(true);

      const newTokens = await refreshResponse.json();
      expect(newTokens).toMatchObject({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
      });

      // New access token should be different
      expect(newTokens.access_token).not.toBe(loginTokens.access_token);
    });

    it('should reject refresh with invalid refresh token', async () => {
      const response = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            refresh_token: 'invalid.refresh.token',
            grant_type: 'refresh_token',
          }),
        },
      );

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe('invalid_grant');
    });
  });

  describe('Logout and Token Revocation', () => {
    it('should successfully logout user', async () => {
      // Login
      const loginResponse = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            username: 'test@healthcare.local',
            password: 'Test1234!',
            grant_type: 'password',
          }),
        },
      );
      const tokens = await loginResponse.json();

      // Logout
      const logoutResponse = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/logout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            refresh_token: tokens.refresh_token,
          }),
        },
      );

      expect(logoutResponse.status).toBe(204); // No content

      // Verify refresh token is revoked
      const refreshResponse = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            refresh_token: tokens.refresh_token,
            grant_type: 'refresh_token',
          }),
        },
      );

      expect(refreshResponse.status).toBe(400);

      const error = await refreshResponse.json();
      expect(error.error).toBe('invalid_grant');
    });

    it('should handle logout with already invalidated token gracefully', async () => {
      const response = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/logout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            refresh_token: 'already.invalidated.token',
          }),
        },
      );

      // Should not crash, may return 204 or 400 depending on implementation
      expect([204, 400]).toContain(response.status);
    });
  });

  describe('Role-Based Access', () => {
    it('should include realm roles in JWT for patient user', async () => {
      const response = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            username: 'test@healthcare.local',
            password: 'Test1234!',
            grant_type: 'password',
            scope: 'openid roles', // Request roles scope
          }),
        },
      );

      const tokens = await response.json();
      const payload = JSON.parse(
        Buffer.from(tokens.access_token.split('.')[1], 'base64').toString(),
      );

      expect(payload.realm_access).toBeDefined();
      expect(payload.realm_access.roles).toContain('patient');
      expect(payload.realm_access.roles).toContain('user');
    });

    it('should include realm roles in JWT for doctor user', async () => {
      const response = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            username: 'doctor@healthcare.local',
            password: 'Doctor1234!',
            grant_type: 'password',
            scope: 'openid roles',
          }),
        },
      );

      const tokens = await response.json();
      const payload = JSON.parse(
        Buffer.from(tokens.access_token.split('.')[1], 'base64').toString(),
      );

      expect(payload.realm_access).toBeDefined();
      expect(payload.realm_access.roles).toContain('doctor');
      expect(payload.realm_access.roles).toContain('user');
    });

    it('should include realm roles in JWT for admin user', async () => {
      const response = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            username: 'admin@healthcare.local',
            password: 'Admin1234!',
            grant_type: 'password',
            scope: 'openid roles',
          }),
        },
      );

      const tokens = await response.json();
      const payload = JSON.parse(
        Buffer.from(tokens.access_token.split('.')[1], 'base64').toString(),
      );

      expect(payload.realm_access).toBeDefined();
      expect(payload.realm_access.roles).toContain('system-admin');
      expect(payload.realm_access.roles).toContain('domain-admin');
      expect(payload.realm_access.roles).toContain('user');
    });
  });
});
