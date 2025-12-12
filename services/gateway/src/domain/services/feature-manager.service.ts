import type { FeatureFlags } from '../../config.js';

/**
 * Feature Manager Service
 * Domain service containing business logic for feature flag decisions
 * Pure domain logic, no infrastructure dependencies
 */
export class FeatureManagerService {
  /**
   * Determine if authentication should be enabled
   * Business rule: auth requires valid Keycloak configuration
   */
  shouldEnableAuth(flags: FeatureFlags, keycloakUrl?: string): boolean {
    if (!flags.auth) {
      return false;
    }

    // Business rule: auth feature requires Keycloak URL
    if (!keycloakUrl || keycloakUrl.trim().length === 0) {
      throw new Error(
        'Auth feature is enabled but Keycloak URL is not configured',
      );
    }

    return true;
  }

  /**
   * Determine if telemetry/metrics should be enabled
   * Business rule: telemetry is independent and always available
   */
  shouldEnableTelemetry(flags: FeatureFlags): boolean {
    return flags.telemetry;
  }

  /**
   * Determine if cache should be enabled
   * Business rule: cache requires Redis configuration
   */
  shouldEnableCache(flags: FeatureFlags, redisHost?: string): boolean {
    if (!flags.cache) {
      return false;
    }

    // Business rule: cache feature requires Redis host
    if (!redisHost || redisHost.trim().length === 0) {
      throw new Error(
        'Cache feature is enabled but Redis host is not configured',
      );
    }

    return true;
  }

  /**
   * Determine if rate limiting should be enabled
   * Business rule: rate limit requires Redis for distributed counting
   */
  shouldEnableRateLimit(flags: FeatureFlags, redisHost?: string): boolean {
    if (!flags.rateLimit) {
      return false;
    }

    // Business rule: rate limit requires Redis
    if (!redisHost || redisHost.trim().length === 0) {
      throw new Error(
        'Rate limit feature is enabled but Redis host is not configured',
      );
    }

    return true;
  }

  /**
   * Get list of enabled feature names (for logging/debugging)
   */
  getEnabledFeatures(
    flags: FeatureFlags,
    keycloakUrl?: string,
    redisHost?: string,
  ): string[] {
    const enabled: string[] = [];

    try {
      if (this.shouldEnableAuth(flags, keycloakUrl)) {
        enabled.push('auth');
      }
    } catch {
      // Auth validation failed, skip
    }

    if (this.shouldEnableTelemetry(flags)) {
      enabled.push('telemetry');
    }

    try {
      if (this.shouldEnableCache(flags, redisHost)) {
        enabled.push('cache');
      }
    } catch {
      // Cache validation failed, skip
    }

    try {
      if (this.shouldEnableRateLimit(flags, redisHost)) {
        enabled.push('rateLimit');
      }
    } catch {
      // Rate limit validation failed, skip
    }

    return enabled;
  }

  /**
   * Check if gateway can run in minimal mode (no external dependencies)
   */
  isMinimalMode(flags: FeatureFlags): boolean {
    return !flags.auth && !flags.cache && !flags.rateLimit;
  }
}
