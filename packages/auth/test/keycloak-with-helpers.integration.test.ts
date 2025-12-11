import { describe, it, expect } from '@jest/globals';

/**
 * Example integration test using infra-launcher
 * Bash scripts handle Docker, Node handles test logic
 */
describe('Keycloak Integration (with infra-launcher)', () => {
  const KEYCLOAK_URL = 'http://localhost:8090';

  // Infrastructure managed by test:integration:infra wrapper

  describe('Health Checks', () => {
    it('should have Keycloak URL configured', () => {
      expect(KEYCLOAK_URL).toMatch(/^http:\/\/localhost:\d+$/);
    });

    it('should respond to health endpoint', async () => {
      const response = await fetch(`${KEYCLOAK_URL}/health`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.status).toBe('UP');
    });

    it('should respond to ready endpoint', async () => {
      const response = await fetch(`${KEYCLOAK_URL}/health/ready`);
      expect(response.ok).toBe(true);
    });
  });

  describe('OIDC Endpoints', () => {
    it('should have realm configuration accessible', async () => {
      const REALM = 'healthcare-domain';
      const response = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/.well-known/openid-configuration`,
      );

      expect(response.ok).toBe(true);

      const config = await response.json();
      expect(config.issuer).toBe(`${KEYCLOAK_URL}/realms/${REALM}`);
      expect(config.token_endpoint).toBeDefined();
      expect(config.authorization_endpoint).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should authenticate with password grant', async () => {
      const REALM = 'healthcare-domain';
      const CLIENT_ID = 'test-client';
      const tokenUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: CLIENT_ID,
          username: 'test@healthcare.local',
          password: 'Test1234!',
        }),
      });

      expect(response.ok).toBe(true);

      const tokens = await response.json();
      expect(tokens.access_token).toBeDefined();
      expect(tokens.refresh_token).toBeDefined();
      expect(tokens.token_type).toBe('Bearer');
    });

    it('should reject invalid credentials', async () => {
      const REALM = 'healthcare-domain';
      const CLIENT_ID = 'test-client';
      const tokenUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: CLIENT_ID,
          username: 'test@healthcare.local',
          password: 'wrong-password',
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });
});
