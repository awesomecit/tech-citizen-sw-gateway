/**
 * Unit tests for MockIdentityAdapter
 * Pure logic tests (no I/O, no containers)
 */
import t from 'tap';
import { MockIdentityAdapter } from '../../../src/infrastructure/adapters/mock-identity.adapter.js';

t.test('MockIdentityAdapter', async t => {
  t.test('refreshAccessToken', async t => {
    t.test('should return new tokens with default config', async t => {
      const adapter = new MockIdentityAdapter();
      const result = await adapter.refreshAccessToken('mock-refresh-token');

      t.ok(result, 'should return result');
      t.equal(
        result?.accessToken,
        'mock-access-token-1',
        'should return access token',
      );
      t.equal(
        result?.refreshToken,
        'mock-refresh-token-1',
        'should return refresh token',
      );
      t.equal(result?.expiresIn, 3600, 'should return default TTL');
    });

    t.test('should return null for empty refresh token', async t => {
      const adapter = new MockIdentityAdapter();
      const result = await adapter.refreshAccessToken('');

      t.equal(result, null, 'should return null');
    });

    t.test('should expire after configured calls', async t => {
      const adapter = new MockIdentityAdapter({ expireAfter: 2 });

      const result1 = await adapter.refreshAccessToken('token');
      t.ok(result1, 'first call should succeed');

      const result2 = await adapter.refreshAccessToken('token');
      t.ok(result2, 'second call should succeed');

      const result3 = await adapter.refreshAccessToken('token');
      t.equal(result3, null, 'third call should fail (expired)');
    });

    t.test('should simulate network error', async t => {
      const adapter = new MockIdentityAdapter({ simulateNetworkError: true });

      await t.rejects(
        adapter.refreshAccessToken('token'),
        /Mock network error/,
        'should throw network error',
      );
    });

    t.test('should respect custom token TTL', async t => {
      const adapter = new MockIdentityAdapter({ tokenTTL: 7200 });
      const result = await adapter.refreshAccessToken('token');

      t.equal(result?.expiresIn, 7200, 'should use custom TTL');
    });

    t.test('should increment call count', async t => {
      const adapter = new MockIdentityAdapter();

      await adapter.refreshAccessToken('token-1');
      t.equal(adapter.getCallCount(), 1, 'count should be 1');

      await adapter.refreshAccessToken('token-2');
      t.equal(adapter.getCallCount(), 2, 'count should be 2');
    });
  });

  t.test('validateAccessToken', async t => {
    t.test('should return true for valid token by default', async t => {
      const adapter = new MockIdentityAdapter();
      const isValid = await adapter.validateAccessToken('mock-token');

      t.equal(isValid, true, 'should be valid');
    });

    t.test('should return false for empty token', async t => {
      const adapter = new MockIdentityAdapter();
      const isValid = await adapter.validateAccessToken('');

      t.equal(isValid, false, 'should be invalid');
    });

    t.test('should return false for "invalid-token"', async t => {
      const adapter = new MockIdentityAdapter();
      const isValid = await adapter.validateAccessToken('invalid-token');

      t.equal(isValid, false, 'should be invalid');
    });

    t.test('should return false when alwaysValid is false', async t => {
      const adapter = new MockIdentityAdapter({ alwaysValid: false });
      const isValid = await adapter.validateAccessToken('mock-token');

      t.equal(isValid, false, 'should be invalid');
    });

    t.test('should return false after expireAfter threshold', async t => {
      const adapter = new MockIdentityAdapter({ expireAfter: 1 });

      await adapter.refreshAccessToken('token'); // count = 1
      await adapter.refreshAccessToken('token'); // count = 2 (expired)

      const isValid = await adapter.validateAccessToken('mock-token');
      t.equal(isValid, false, 'should be invalid after expiration');
    });

    t.test('should throw on simulated network error', async t => {
      const adapter = new MockIdentityAdapter({ simulateNetworkError: true });

      await t.rejects(
        adapter.validateAccessToken('token'),
        /Mock network error/,
        'should throw network error',
      );
    });
  });

  t.test('getUserInfo', async t => {
    t.test('should return mock user info for valid token', async t => {
      const adapter = new MockIdentityAdapter();
      const userInfo = await adapter.getUserInfo('mock-token');

      t.ok(userInfo, 'should return user info');
      t.equal(userInfo?.userId, 'mock-user-123', 'should have userId');
      t.equal(userInfo?.email, 'mock-user@example.com', 'should have email');
      t.equal(userInfo?.name, 'Mock User', 'should have name');
      t.same(userInfo?.roles, ['user'], 'should have roles');
    });

    t.test('should return null for invalid token', async t => {
      const adapter = new MockIdentityAdapter();
      const userInfo = await adapter.getUserInfo('invalid-token');

      t.equal(userInfo, null, 'should return null');
    });

    t.test('should return null for empty token', async t => {
      const adapter = new MockIdentityAdapter();
      const userInfo = await adapter.getUserInfo('');

      t.equal(userInfo, null, 'should return null');
    });

    t.test('should throw on simulated network error', async t => {
      const adapter = new MockIdentityAdapter({ simulateNetworkError: true });

      await t.rejects(
        adapter.getUserInfo('token'),
        /Mock network error/,
        'should throw network error',
      );
    });
  });

  t.test('reset', async t => {
    t.test('should reset call count', async t => {
      const adapter = new MockIdentityAdapter();

      await adapter.refreshAccessToken('token-1');
      await adapter.refreshAccessToken('token-2');
      t.equal(adapter.getCallCount(), 2, 'count should be 2');

      adapter.reset();
      t.equal(adapter.getCallCount(), 0, 'count should be reset');
    });

    t.test('should allow refreshing after expireAfter reset', async t => {
      const adapter = new MockIdentityAdapter({ expireAfter: 1 });

      await adapter.refreshAccessToken('token-1'); // count = 1
      await adapter.refreshAccessToken('token-2'); // count = 2 (expired)

      const result1 = await adapter.refreshAccessToken('token-3');
      t.equal(result1, null, 'should be expired');

      adapter.reset();

      const result2 = await adapter.refreshAccessToken('token-4');
      t.ok(result2, 'should work again after reset');
    });
  });
});
