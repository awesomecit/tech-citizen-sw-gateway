import { describe, it, expect } from '@jest/globals';
import { createTestSuite, waitForService } from '@tech-citizen/test-helpers';

/**
 * Example integration test using test-helpers
 * Demonstrates automatic setup/teardown with parallel execution support
 */
describe('Keycloak Integration (with test-helpers)', () => {
  // Automatic environment setup/teardown
  const ctx = createTestSuite({
    requires: [
      {
        service: 'keycloak',
        image: 'quay.io/keycloak/keycloak:23.0',
        port: Number(process.env.KEYCLOAK_PORT) || 8091,
        env: {
          KEYCLOAK_ADMIN: 'admin',
          KEYCLOAK_ADMIN_PASSWORD: 'admin',
          KC_HEALTH_ENABLED: 'true',
          KC_METRICS_ENABLED: 'true',
        },
        healthcheck: {
          command: 'curl -f http://localhost:8080/health/ready',
          interval: 2000,
          retries: 30,
          timeout: 10000,
        },
        startupTimeout: 90000,
        reuseExisting: true, // Reuse if already running
      },
    ],
    parallel: true, // Safe for concurrent execution
    cleanup: 'always',
  });

  describe('Health Checks', () => {
    it('should have Keycloak URL configured', () => {
      expect(ctx.services.keycloak).toBeDefined();
      expect(ctx.services.keycloak?.url).toMatch(/^http:\/\/localhost:\d+$/);
    });

    it('should respond to health endpoint', async () => {
      await waitForService(ctx.services.keycloak!.url, {
        path: '/health',
        timeout: 10000,
      });

      const response = await fetch(`${ctx.services.keycloak!.url}/health`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.status).toBe('UP');
    });

    it('should respond to ready endpoint', async () => {
      const response = await fetch(
        `${ctx.services.keycloak!.url}/health/ready`,
      );
      expect(response.ok).toBe(true);
    });
  });

  describe('OIDC Endpoints', () => {
    it('should have realm configuration accessible', async () => {
      const realm = ctx.services.keycloak!.realm;
      const response = await fetch(
        `${ctx.services.keycloak!.url}/realms/${realm}/.well-known/openid-configuration`,
      );

      expect(response.ok).toBe(true);

      const config = await response.json();
      expect(config.issuer).toBe(
        `${ctx.services.keycloak!.url}/realms/${realm}`,
      );
      expect(config.token_endpoint).toBeDefined();
      expect(config.authorization_endpoint).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should authenticate with password grant', async () => {
      const tokenUrl = `${ctx.services.keycloak!.url}/realms/${ctx.services.keycloak!.realm}/protocol/openid-connect/token`;

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: ctx.services.keycloak!.clientId,
          username: 'test@healthcare.local',
          password: 'Test123!',
        }),
      });

      expect(response.ok).toBe(true);

      const tokens = await response.json();
      expect(tokens.access_token).toBeDefined();
      expect(tokens.refresh_token).toBeDefined();
      expect(tokens.token_type).toBe('Bearer');
    });

    it('should reject invalid credentials', async () => {
      const tokenUrl = `${ctx.services.keycloak!.url}/realms/${ctx.services.keycloak!.realm}/protocol/openid-connect/token`;

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: ctx.services.keycloak!.clientId,
          username: 'test@healthcare.local',
          password: 'wrong-password',
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });
});
