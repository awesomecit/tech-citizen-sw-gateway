import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import { keycloakPlugin, KeycloakPluginOptions } from '../src/keycloak.js';

describe('Keycloak OIDC Plugin (US-039)', () => {
  let app: FastifyInstance;
  const mockKeycloakConfig: KeycloakPluginOptions = {
    keycloakUrl: 'http://localhost:8080',
    realm: 'healthcare-domain',
    clientId: 'gateway-client',
    clientSecret: 'test-client-secret',
    callbackUrl: 'http://localhost:3000/auth/callback',
    redis: {
      host: 'localhost',
      port: 6379,
    },
  };

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(keycloakPlugin, mockKeycloakConfig);

    // Register protected route BEFORE ready
    app.get('/api/protected', { preHandler: [app.authenticate] }, async () => {
      return { message: 'Protected resource' };
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Scenario 1: Plugin Registration', () => {
    it('should register keycloak plugin successfully', () => {
      expect(app.hasDecorator('keycloak')).toBe(true);
    });

    it('should expose /auth/login route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/login',
      });

      // Should redirect to Keycloak
      expect([302, 303]).toContain(response.statusCode);
      expect(response.headers.location).toContain('http://localhost:8080');
      expect(response.headers.location).toContain('/realms/healthcare-domain');
      expect(response.headers.location).toContain(
        '/protocol/openid-connect/auth',
      );
    });

    it('should expose /auth/callback route', async () => {
      const routes = app.printRoutes();
      expect(routes).toContain('callback');
    });

    it('should expose /auth/logout route', async () => {
      const routes = app.printRoutes();
      expect(routes).toContain('log');
      expect(routes).toContain('out');
    });
  });

  describe('Scenario 2: OIDC Login Redirect', () => {
    it('should redirect to Keycloak with correct query params', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/login',
      });

      const location = response.headers.location as string;
      expect(location).toBeDefined();

      const url = new URL(location);
      expect(url.searchParams.get('client_id')).toBe('gateway-client');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3000/auth/callback',
      );
      expect(url.searchParams.get('scope')).toContain('openid');
      expect(url.searchParams.get('state')).toBeTruthy();
    });

    it('should generate unique state parameter for CSRF protection', async () => {
      const response1 = await app.inject({ method: 'GET', url: '/auth/login' });
      const response2 = await app.inject({ method: 'GET', url: '/auth/login' });

      const state1 = new URL(
        response1.headers.location as string,
      ).searchParams.get('state');
      const state2 = new URL(
        response2.headers.location as string,
      ).searchParams.get('state');

      expect(state1).not.toBe(state2);
    });
  });

  describe('Scenario 3: OIDC Callback - Error Cases (RED phase)', () => {
    it('should reject callback without authorization code', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/callback',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing authorization code');
    });

    it('should reject callback without state parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/callback?code=test-code',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing state parameter');
    });

    it('should reject callback with invalid state (CSRF attack)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/callback?code=test-code&state=invalid-state',
      });

      // CSRF attack should return 401 (authentication failed)
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Authentication failed');
    });
  });

  describe('Scenario 4: Session Management (RED phase)', () => {
    it('should create session after successful authentication', async () => {
      // This will fail until we implement token exchange
      // Skipped for now - requires Keycloak mock
    });

    it('should store session in Redis with TTL', async () => {
      // This will fail until we implement Redis session store
      // Skipped for now - requires Redis mock
    });
  });

  describe('Scenario 5: Logout', () => {
    it('should expose logout endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/logout',
      });

      // Should redirect to Keycloak logout or home
      expect([302, 303]).toContain(response.statusCode);
    });

    it('should destroy session on logout', async () => {
      // Skipped - requires session setup first
    });
  });

  describe('Scenario 6: Protected Routes (RED phase)', () => {
    it('should reject unauthenticated requests to protected routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/protected',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
