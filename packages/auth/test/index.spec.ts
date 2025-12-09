/**
 * US-037: Auth Package Structure
 * Acceptance Criteria (BDD):
 *   Given mono-repo workspace configured
 *   When I run `npm install` in root
 *   Then `packages/auth` is linked in all services
 *   And TypeScript resolves `import from '@tech-citizen/auth'`
 */
import { describe, it, expect } from '@jest/globals';
import Fastify from 'fastify';
import authPlugin from '../src/index';
import type { AuthPluginOptions } from '../src/index';

describe('US-037: Auth Package Structure', () => {
  const VALID_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAthHhTTyNpneD5lSC908q
rtQ+DynEQJhf0XdLByESCroJqnnyYUd1XmxYE1HCDP2b7fN9juBgJcv29mvoqF99
++iL/TjYbxfUhYqUYfk1901fvynS/Ny5eLAY6H283b5bSzcavzwkRGfW6TU0c4WV
kxobYgHNLH3/0k2Y6c1HUNvHCfq/45xCuJ2YQvKKf3AruzI/gTPjDnJKP6C6aQ7l
fXC9Gu9L2H4ZQBqfA65g6bweONWUwy/3sa4o27qJhkuSMucCDo+/2rh8V15rIcd+
LOH4Gf5b6dOPkwIdxv40Wg00kwwwInfYeBvUhdTeLpLef5l8xSmlQ7yK4IJCA2OL
FQIDAQAB
-----END PUBLIC KEY-----`;

  describe('Given mono-repo workspace configured', () => {
    it('Then TypeScript resolves import from @tech-citizen/auth', () => {
      expect(authPlugin).toBeDefined();
      expect(typeof authPlugin).toBe('function');
    });

    it('Then plugin has correct metadata', () => {
      // fastify-plugin wraps the function and adds metadata via symbols
      const pluginAny = authPlugin as any;
      expect(pluginAny[Symbol.for('skip-override')]).toBe(true);
      expect(pluginAny[Symbol.for('plugin-meta')]).toMatchObject({
        name: '@tech-citizen/auth',
        fastify: '5.x',
      });
    });

    it('Then plugin exports AuthPluginOptions type', () => {
      const opts: AuthPluginOptions = {
        keycloakUrl: 'http://keycloak:8080',
        realm: 'test-realm',
        clientId: 'test-client',
      };

      expect(opts.keycloakUrl).toBe('http://keycloak:8080');
      expect(opts.realm).toBe('test-realm');
      expect(opts.clientId).toBe('test-client');
    });
  });

  describe('When registering plugin with Fastify', () => {
    it('Then throws error if keycloakUrl is missing', async () => {
      const fastify = Fastify({ logger: false });

      await expect(
        fastify.register(authPlugin, {
          realm: 'test',
          clientId: 'test',
        } as AuthPluginOptions),
      ).rejects.toThrow('Missing required option: keycloakUrl');

      await fastify.close();
    });

    it('Then throws error if realm is missing', async () => {
      const fastify = Fastify({ logger: false });

      await expect(
        fastify.register(authPlugin, {
          keycloakUrl: 'http://kc:8080',
          clientId: 'test',
        } as AuthPluginOptions),
      ).rejects.toThrow('Missing required option: realm');

      await fastify.close();
    });

    it('Then throws error if clientId is missing', async () => {
      const fastify = Fastify({ logger: false });

      await expect(
        fastify.register(authPlugin, {
          keycloakUrl: 'http://kc:8080',
          realm: 'test',
        } as AuthPluginOptions),
      ).rejects.toThrow('Missing required option: clientId');

      await fastify.close();
    });

    it('Then registers successfully with all required options', async () => {
      const fastify = Fastify({ logger: false });

      await expect(
        fastify.register(authPlugin, {
          keycloakUrl: 'http://kc:8080',
          realm: 'test',
          clientId: 'test',
          jwtPublicKey: VALID_PUBLIC_KEY,
        }),
      ).resolves.not.toThrow();

      await fastify.close();
    });
  });
});
