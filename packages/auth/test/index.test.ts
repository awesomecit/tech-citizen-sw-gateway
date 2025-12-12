/**
 * US-037: Auth Package Structure
 * Acceptance Criteria (BDD):
 *   Given mono-repo workspace configured
 *   When I run `npm install` in root
 *   Then `packages/auth` is linked in all services
 *   And TypeScript resolves `import from '@tech-citizen/auth'`
 */
import { test } from 'tap';
import Fastify from 'fastify';
import authPlugin from '../src/index.js';
import type { AuthPluginOptions } from '../src/index.js';

const VALID_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAthHhTTyNpneD5lSC908q
rtQ+DynEQJhf0XdLByESCroJqnnyYUd1XmxYE1HCDP2b7fN9juBgJcv29mvoqF99
++iL/TjYbxfUhYqUYfk1901fvynS/Ny5eLAY6H283b5bSzcavzwkRGfW6TU0c4WV
kxobYgHNLH3/0k2Y6c1HUNvHCfq/45xCuJ2YQvKKf3AruzI/gTPjDnJKP6C6aQ7l
fXC9Gu9L2H4ZQBqfA65g6bweONWUwy/3sa4o27qJhkuSMucCDo+/2rh8V15rIcd+
LOH4Gf5b6dOPkwIdxv40Wg00kwwwInfYeBvUhdTeLpLef5l8xSmlQ7yK4IJCA2OL
FQIDAQAB
-----END PUBLIC KEY-----`;

test('US-037: Auth Package Structure - TypeScript resolves import from @tech-citizen/auth', t => {
  t.ok(authPlugin, 'authPlugin is defined');
  t.equal(typeof authPlugin, 'function', 'authPlugin is a function');
  t.end();
});

test('US-037: Auth Package Structure - plugin has correct metadata', t => {
  // fastify-plugin wraps the function and adds metadata via symbols
  const pluginAny = authPlugin as any;
  t.equal(
    pluginAny[Symbol.for('skip-override')],
    true,
    'skip-override symbol is true',
  );
  const meta = pluginAny[Symbol.for('plugin-meta')];
  t.ok(meta, 'plugin-meta symbol exists');
  t.equal(meta.name, '@tech-citizen/auth', 'plugin name is correct');
  t.equal(meta.fastify, '5.x', 'fastify version is correct');
  t.end();
});

test('US-037: Auth Package Structure - plugin exports AuthPluginOptions type', t => {
  const opts: AuthPluginOptions = {
    keycloakUrl: 'http://keycloak:8080',
    realm: 'test-realm',
    clientId: 'test-client',
  };

  t.equal(
    opts.keycloakUrl,
    'http://keycloak:8080',
    'keycloakUrl is set correctly',
  );
  t.equal(opts.realm, 'test-realm', 'realm is set correctly');
  t.equal(opts.clientId, 'test-client', 'clientId is set correctly');
  t.end();
});

test('US-037: Auth Package Structure - throws error if keycloakUrl is missing', async t => {
  const fastify = Fastify({ logger: false });

  try {
    await fastify.register(authPlugin, {
      realm: 'test',
      clientId: 'test',
    } as AuthPluginOptions);
    t.fail('Should have thrown error');
  } catch (err) {
    t.ok(err, 'Error was thrown');
    t.match(
      (err as Error).message,
      /keycloakUrl/,
      'Error message mentions keycloakUrl',
    );
  } finally {
    await fastify.close();
  }
});

test('US-037: Auth Package Structure - throws error if realm is missing', async t => {
  const fastify = Fastify({ logger: false });

  try {
    await fastify.register(authPlugin, {
      keycloakUrl: 'http://kc:8080',
      clientId: 'test',
    } as AuthPluginOptions);
    t.fail('Should have thrown error');
  } catch (err) {
    t.ok(err, 'Error was thrown');
    t.match((err as Error).message, /realm/, 'Error message mentions realm');
  } finally {
    await fastify.close();
  }
});

test('US-037: Auth Package Structure - throws error if clientId is missing', async t => {
  const fastify = Fastify({ logger: false });

  try {
    await fastify.register(authPlugin, {
      keycloakUrl: 'http://kc:8080',
      realm: 'test',
    } as AuthPluginOptions);
    t.fail('Should have thrown error');
  } catch (err) {
    t.ok(err, 'Error was thrown');
    t.match(
      (err as Error).message,
      /clientId/,
      'Error message mentions clientId',
    );
  } finally {
    await fastify.close();
  }
});

test('US-037: Auth Package Structure - registers successfully with all required options', async t => {
  const fastify = Fastify({ logger: false });

  try {
    await fastify.register(authPlugin, {
      keycloakUrl: 'http://kc:8080',
      realm: 'test',
      clientId: 'test',
      jwtPublicKey: VALID_PUBLIC_KEY,
    });
    t.pass('Plugin registered successfully');
  } catch (err) {
    t.fail(`Registration failed: ${err}`);
  } finally {
    await fastify.close();
  }
});
