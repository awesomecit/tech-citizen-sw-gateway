import { test } from 'tap';
import Fastify from 'fastify';
import { keycloakPlugin, KeycloakPluginOptions } from '../src/keycloak.js';

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

test('Keycloak OIDC Plugin (US-039) - Plugin Registration - should register keycloak plugin successfully', async (t) => {
  const app = Fastify({ logger: false });
  await app.register(keycloakPlugin, mockKeycloakConfig);
  await app.ready();

  t.ok(app.hasDecorator('keycloak'), 'keycloak decorator is registered');

  await app.close();
});

test('Keycloak OIDC Plugin (US-039) - Plugin Registration - should expose /auth/login route', async (t) => {
  const app = Fastify({ logger: false });
  await app.register(keycloakPlugin, mockKeycloakConfig);
  await app.ready();

  const response = await app.inject({
    method: 'GET',
    url: '/auth/login',
  });

  // Should redirect to Keycloak
  t.ok([302, 303].includes(response.statusCode), 'response is a redirect');
  t.match(response.headers.location, 'http://localhost:8080', 'redirects to keycloak URL');
  t.match(response.headers.location, '/realms/healthcare-domain', 'contains realm path');
  t.match(response.headers.location, '/protocol/openid-connect/auth', 'contains OIDC auth path');

  await app.close();
});

test('Keycloak OIDC Plugin (US-039) - Plugin Registration - should expose /auth/callback route', async (t) => {
  const app = Fastify({ logger: false });
  await app.register(keycloakPlugin, mockKeycloakConfig);
  await app.ready();

  const routes = app.printRoutes();
  t.match(routes, /callback/, 'callback route is registered');

  await app.close();
});

test('Keycloak OIDC Plugin (US-039) - Plugin Registration - should expose /auth/logout route', async (t) => {
  const app = Fastify({ logger: false });
  await app.register(keycloakPlugin, mockKeycloakConfig);
  await app.ready();

  const routes = app.printRoutes();
  t.match(routes, /log/, 'routes contain "log"');
  t.match(routes, /out/, 'routes contain "out"');

  await app.close();
});

test('Keycloak OIDC Plugin (US-039) - OIDC Login Redirect - should redirect to Keycloak with correct query params', async (t) => {
  const app = Fastify({ logger: false });
  await app.register(keycloakPlugin, mockKeycloakConfig);
  await app.ready();

  const response = await app.inject({
    method: 'GET',
    url: '/auth/login',
  });

  const location = response.headers.location as string;
  t.ok(location, 'location header is present');

  const url = new URL(location);
  t.equal(url.searchParams.get('client_id'), 'gateway-client', 'client_id is correct');
  t.equal(url.searchParams.get('response_type'), 'code', 'response_type is code');
  t.equal(url.searchParams.get('redirect_uri'), 'http://localhost:3000/auth/callback', 'redirect_uri is correct');
  t.match(url.searchParams.get('scope') || '', /openid/, 'scope contains openid');
  t.ok(url.searchParams.get('state'), 'state parameter is present');

  await app.close();
});

test('Keycloak OIDC Plugin (US-039) - OIDC Login Redirect - should generate unique state parameter for CSRF protection', async (t) => {
  const app = Fastify({ logger: false });
  await app.register(keycloakPlugin, mockKeycloakConfig);
  await app.ready();

  const response1 = await app.inject({ method: 'GET', url: '/auth/login' });
  const response2 = await app.inject({ method: 'GET', url: '/auth/login' });

  const state1 = new URL(response1.headers.location as string).searchParams.get('state');
  const state2 = new URL(response2.headers.location as string).searchParams.get('state');

  t.not(state1, state2, 'state parameters are unique');

  await app.close();
});

test('Keycloak OIDC Plugin (US-039) - OIDC Callback Error Cases - should reject callback without authorization code', async (t) => {
  const app = Fastify({ logger: false });
  await app.register(keycloakPlugin, mockKeycloakConfig);
  await app.ready();

  const response = await app.inject({
    method: 'GET',
    url: '/auth/callback',
  });

  t.equal(response.statusCode, 400, 'status code is 400');
  const body = JSON.parse(response.body);
  t.match(body.error, /Missing authorization code/, 'error message mentions missing code');

  await app.close();
});

test('Keycloak OIDC Plugin (US-039) - OIDC Callback Error Cases - should reject callback without state parameter', async (t) => {
  const app = Fastify({ logger: false });
  await app.register(keycloakPlugin, mockKeycloakConfig);
  await app.ready();

  const response = await app.inject({
    method: 'GET',
    url: '/auth/callback?code=test-code',
  });

  t.equal(response.statusCode, 400, 'status code is 400');
  const body = JSON.parse(response.body);
  t.match(body.error, /Missing state parameter/, 'error message mentions missing state');

  await app.close();
});

test('Keycloak OIDC Plugin (US-039) - OIDC Callback Error Cases - should reject callback with invalid state (CSRF attack)', async (t) => {
  const app = Fastify({ logger: false });
  await app.register(keycloakPlugin, mockKeycloakConfig);
  await app.ready();

  const response = await app.inject({
    method: 'GET',
    url: '/auth/callback?code=test-code&state=invalid-state',
  });

  // CSRF attack should return 401 (authentication failed)
  t.equal(response.statusCode, 401, 'status code is 401');
  const body = JSON.parse(response.body);
  t.equal(body.error, 'Authentication failed', 'error is Authentication failed');

  await app.close();
});

test('Keycloak OIDC Plugin (US-039) - Logout - should expose logout endpoint', async (t) => {
  const app = Fastify({ logger: false });
  await app.register(keycloakPlugin, mockKeycloakConfig);
  await app.ready();

  const response = await app.inject({
    method: 'GET',
    url: '/auth/logout',
  });

  // Should redirect to Keycloak logout or home
  t.ok([302, 303].includes(response.statusCode), 'response is a redirect');

  await app.close();
});

test('Keycloak OIDC Plugin (US-039) - Protected Routes - should reject unauthenticated requests to protected routes', async (t) => {
  const app = Fastify({ logger: false });
  await app.register(keycloakPlugin, mockKeycloakConfig);

  // Register protected route BEFORE ready
  app.get('/api/protected', { preHandler: [app.authenticate] }, async () => {
    return { message: 'Protected resource' };
  });

  await app.ready();

  const response = await app.inject({
    method: 'GET',
    url: '/api/protected',
  });

  t.equal(response.statusCode, 401, 'status code is 401 for unauthenticated request');

  await app.close();
});
