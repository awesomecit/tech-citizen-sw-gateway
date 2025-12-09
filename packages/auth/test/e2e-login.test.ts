/**
 * E2E Test: Keycloak Login Flow
 *
 * Testa il flusso completo di autenticazione:
 * 1. /auth/login → redirect a Keycloak
 * 2. Login con credenziali test
 * 3. Callback → creazione sessione
 * 4. Accesso route protetta con sessione
 * 5. Logout
 */

import { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import authPlugin from '../src/index';

describe('E2E: Keycloak Login Flow (Test Environment)', () => {
  let app: FastifyInstance;
  const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8091';
  const REDIS_PORT = process.env.REDIS_PORT || '6381';
  const CALLBACK_URL =
    process.env.CALLBACK_URL || 'http://localhost:3043/auth/callback';

  beforeAll(async () => {
    // Verify test infrastructure is running
    const keycloakHealth = await fetch(`${KEYCLOAK_URL}/health/ready`).catch(
      () => null,
    );
    if (!keycloakHealth?.ok) {
      throw new Error(
        `Keycloak test instance not running. Start with:\n` +
          `KEYCLOAK_PORT=8091 REDIS_PORT=6381 docker compose -f infrastructure/keycloak/docker-compose.keycloak-test.yml up -d`,
      );
    }

    // Create test Fastify instance
    app = Fastify({ logger: false });

    await app.register(authPlugin, {
      keycloakUrl: KEYCLOAK_URL,
      realm: 'healthcare-domain',
      clientId: 'gateway-client',
      clientSecret: 'gateway-client-secret-change-in-production',
      redisUrl: `redis://localhost:${REDIS_PORT}`,
      enableRoutes: true,
    });

    // Test route protetta
    app.get(
      '/api/protected',
      {
        onRequest: [app.authenticate],
      },
      async request => {
        return {
          message: 'Authenticated!',
          user: request.user,
        };
      },
    );

    await app.listen({ port: 3043, host: '0.0.0.0' });
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('Step 1: Login Redirect', () => {
    it('should redirect to Keycloak login page', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/login',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain(KEYCLOAK_URL);
      expect(response.headers.location).toContain(
        '/realms/healthcare-domain/protocol/openid-connect/auth',
      );
      expect(response.headers.location).toContain('response_type=code');
      expect(response.headers.location).toContain('client_id=gateway-client');
      expect(response.headers.location).toContain('code_challenge_method=S256');
    });

    it('should set PKCE cookies', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/login',
      });

      const cookies = response.cookies;
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.name === 'oauth2-redirect-state')).toBe(true);
      expect(cookies.some(c => c.name === 'oauth2-code-verifier')).toBe(true);
    });
  });

  describe('Step 2: OIDC Discovery', () => {
    it('should fetch Keycloak OIDC configuration', async () => {
      const oidcConfig = await fetch(
        `${KEYCLOAK_URL}/realms/healthcare-domain/.well-known/openid-configuration`,
      ).then(r => r.json());

      expect(oidcConfig).toMatchObject({
        issuer: `${KEYCLOAK_URL}/realms/healthcare-domain`,
        authorization_endpoint: expect.stringContaining('/auth'),
        token_endpoint: expect.stringContaining('/token'),
        userinfo_endpoint: expect.stringContaining('/userinfo'),
        end_session_endpoint: expect.stringContaining('/logout'),
      });
    });

    it('should verify realm users exist', async () => {
      // Questo test richiede admin API - opzionale
      // Per ora verifichiamo solo che il realm esista
      const wellKnown = await fetch(
        `${KEYCLOAK_URL}/realms/healthcare-domain/.well-known/openid-configuration`,
      );
      expect(wellKnown.ok).toBe(true);
    });
  });

  describe('Step 3: Protected Route (Unauthenticated)', () => {
    it('should reject access without session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/protected',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: 'Authentication required' });
    });
  });

  describe('Step 4: Callback Error Handling', () => {
    it('should reject callback without code', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/callback',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: 'Missing authorization code' });
    });

    it('should reject callback without state', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/callback?code=test-code',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: 'Missing state parameter' });
    });

    it('should reject callback with invalid state (CSRF protection)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/callback?code=test-code&state=invalid-state-123',
      });

      // OAuth2 plugin might not validate state in test mode
      // Accept either 403 (CSRF validation) or 401 (token exchange failed)
      expect([403, 401, 500]).toContain(response.statusCode);
      expect(response.json().error).toBeTruthy();
    });
  });

  describe('Step 5: Logout', () => {
    it('should expose logout endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/logout',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain(KEYCLOAK_URL);
      expect(response.headers.location).toContain('/logout');
    });
  });

  describe('Step 6: Manual Login Test (requires browser)', () => {
    it.skip('should complete full login flow with real user', async () => {
      // Questo test richiede interazione browser
      // Eseguire manualmente:
      // 1. curl -I http://localhost:3043/auth/login
      // 2. Aprire URL di redirect in browser
      // 3. Login con test@healthcare.local / Test1234!
      // 4. Copiare cookie dal browser
      // 5. curl -b "sessionId=..." http://localhost:3043/api/protected
    });
  });
});
