import { test } from 'tap';
import { FeatureManagerService } from '../../../src/domain/services/feature-manager.service.js';
import type { FeatureFlags } from '../../../src/config.js';

test('FeatureManagerService - Auth Feature', async t => {
  const service = new FeatureManagerService();

  t.test(
    'enables auth when flag is true and Keycloak URL provided',
    async t => {
      const flags: FeatureFlags = {
        auth: true,
        cache: false,
        telemetry: false,
        rateLimit: false,
      };

      t.equal(
        service.shouldEnableAuth(flags, 'http://keycloak:8080'),
        true,
        'should enable auth',
      );
    },
  );

  t.test('disables auth when flag is false', async t => {
    const flags: FeatureFlags = {
      auth: false,
      cache: false,
      telemetry: false,
      rateLimit: false,
    };

    t.equal(
      service.shouldEnableAuth(flags, 'http://keycloak:8080'),
      false,
      'should disable auth',
    );
  });

  t.test('throws when auth enabled but Keycloak URL missing', async t => {
    const flags: FeatureFlags = {
      auth: true,
      cache: false,
      telemetry: false,
      rateLimit: false,
    };

    t.throws(
      () => service.shouldEnableAuth(flags, ''),
      /Auth feature is enabled but Keycloak URL is not configured/,
    );

    t.throws(
      () => service.shouldEnableAuth(flags, undefined),
      /Auth feature is enabled but Keycloak URL is not configured/,
    );
  });
});

test('FeatureManagerService - Telemetry Feature', async t => {
  const service = new FeatureManagerService();

  t.test('enables telemetry when flag is true', async t => {
    const flags: FeatureFlags = {
      auth: false,
      cache: false,
      telemetry: true,
      rateLimit: false,
    };

    t.equal(
      service.shouldEnableTelemetry(flags),
      true,
      'should enable telemetry',
    );
  });

  t.test('disables telemetry when flag is false', async t => {
    const flags: FeatureFlags = {
      auth: false,
      cache: false,
      telemetry: false,
      rateLimit: false,
    };

    t.equal(
      service.shouldEnableTelemetry(flags),
      false,
      'should disable telemetry',
    );
  });

  t.test('telemetry has no external dependencies', async t => {
    const flags: FeatureFlags = {
      auth: false,
      cache: false,
      telemetry: true,
      rateLimit: false,
    };

    // Should not throw, telemetry is always available
    t.doesNotThrow(() => service.shouldEnableTelemetry(flags));
  });
});

test('FeatureManagerService - Cache Feature', async t => {
  const service = new FeatureManagerService();

  t.test('enables cache when flag is true and Redis host provided', async t => {
    const flags: FeatureFlags = {
      auth: false,
      cache: true,
      telemetry: false,
      rateLimit: false,
    };

    t.equal(
      service.shouldEnableCache(flags, 'redis.local'),
      true,
      'should enable cache',
    );
  });

  t.test('disables cache when flag is false', async t => {
    const flags: FeatureFlags = {
      auth: false,
      cache: false,
      telemetry: false,
      rateLimit: false,
    };

    t.equal(
      service.shouldEnableCache(flags, 'redis.local'),
      false,
      'should disable cache',
    );
  });

  t.test('throws when cache enabled but Redis host missing', async t => {
    const flags: FeatureFlags = {
      auth: false,
      cache: true,
      telemetry: false,
      rateLimit: false,
    };

    t.throws(
      () => service.shouldEnableCache(flags, ''),
      /Cache feature is enabled but Redis host is not configured/,
    );

    t.throws(
      () => service.shouldEnableCache(flags, undefined),
      /Cache feature is enabled but Redis host is not configured/,
    );
  });
});

test('FeatureManagerService - Rate Limit Feature', async t => {
  const service = new FeatureManagerService();

  t.test(
    'enables rate limit when flag is true and Redis host provided',
    async t => {
      const flags: FeatureFlags = {
        auth: false,
        cache: false,
        telemetry: false,
        rateLimit: true,
      };

      t.equal(
        service.shouldEnableRateLimit(flags, 'redis.local'),
        true,
        'should enable rate limit',
      );
    },
  );

  t.test('disables rate limit when flag is false', async t => {
    const flags: FeatureFlags = {
      auth: false,
      cache: false,
      telemetry: false,
      rateLimit: false,
    };

    t.equal(
      service.shouldEnableRateLimit(flags, 'redis.local'),
      false,
      'should disable rate limit',
    );
  });

  t.test('throws when rate limit enabled but Redis host missing', async t => {
    const flags: FeatureFlags = {
      auth: false,
      cache: false,
      telemetry: false,
      rateLimit: true,
    };

    t.throws(
      () => service.shouldEnableRateLimit(flags, ''),
      /Rate limit feature is enabled but Redis host is not configured/,
    );
  });
});

test('FeatureManagerService - Get Enabled Features', async t => {
  const service = new FeatureManagerService();

  t.test('returns all enabled features with valid config', async t => {
    const flags: FeatureFlags = {
      auth: true,
      cache: true,
      telemetry: true,
      rateLimit: true,
    };

    const enabled = service.getEnabledFeatures(
      flags,
      'http://keycloak:8080',
      'redis.local',
    );

    t.same(enabled, ['auth', 'telemetry', 'cache', 'rateLimit']);
  });

  t.test('returns only valid features (skips invalid configs)', async t => {
    const flags: FeatureFlags = {
      auth: true, // Missing Keycloak URL
      cache: false,
      telemetry: true,
      rateLimit: true, // Missing Redis
    };

    const enabled = service.getEnabledFeatures(flags, undefined, undefined);

    t.same(enabled, ['telemetry'], 'should only include telemetry');
  });

  t.test('returns empty array when all features disabled', async t => {
    const flags: FeatureFlags = {
      auth: false,
      cache: false,
      telemetry: false,
      rateLimit: false,
    };

    const enabled = service.getEnabledFeatures(flags);

    t.same(enabled, []);
  });
});

test('FeatureManagerService - Minimal Mode', async t => {
  const service = new FeatureManagerService();

  t.test('returns true when no external dependencies required', async t => {
    const flags: FeatureFlags = {
      auth: false,
      cache: false,
      telemetry: true, // Telemetry OK (no external deps)
      rateLimit: false,
    };

    t.equal(service.isMinimalMode(flags), true, 'should be minimal mode');
  });

  t.test('returns false when auth enabled', async t => {
    const flags: FeatureFlags = {
      auth: true,
      cache: false,
      telemetry: true,
      rateLimit: false,
    };

    t.equal(service.isMinimalMode(flags), false, 'should not be minimal mode');
  });

  t.test('returns false when cache enabled', async t => {
    const flags: FeatureFlags = {
      auth: false,
      cache: true,
      telemetry: false,
      rateLimit: false,
    };

    t.equal(service.isMinimalMode(flags), false, 'should not be minimal mode');
  });

  t.test('returns false when rate limit enabled', async t => {
    const flags: FeatureFlags = {
      auth: false,
      cache: false,
      telemetry: false,
      rateLimit: true,
    };

    t.equal(service.isMinimalMode(flags), false, 'should not be minimal mode');
  });
});
