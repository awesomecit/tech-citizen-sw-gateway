/**
 * Environment validation for safe test execution
 * Prevents accidental test runs against production
 */
export class EnvironmentChecker {
  /**
   * Validate test environment safety
   */
  static validate(): void {
    const nodeEnv = process.env.NODE_ENV;
    const databaseName = process.env.DATABASE_NAME;

    // Must be in test mode
    if (nodeEnv !== 'test') {
      throw new Error(
        `❌ Tests must run in NODE_ENV=test (current: ${nodeEnv})\n` +
          `Run: NODE_ENV=test npm test`,
      );
    }

    // Database name must contain "test"
    if (databaseName && !databaseName.toLowerCase().includes('test')) {
      throw new Error(
        `❌ Database name must contain "test" (current: ${databaseName})\n` +
          `This prevents accidental data loss in production databases.`,
      );
    }

    // Blocked production indicators
    const blockedPatterns = ['prod', 'production', 'live'];
    const allEnvVars = Object.entries(process.env);

    for (const [key, value] of allEnvVars) {
      if (!value) continue;

      const lowerValue = value.toLowerCase();
      for (const pattern of blockedPatterns) {
        if (lowerValue.includes(pattern) && !lowerValue.includes('test')) {
          console.warn(
            `⚠️  Warning: Environment variable ${key} contains "${pattern}": ${value}`,
          );
        }
      }
    }

    console.log('✓ Environment validation passed (NODE_ENV=test)');
  }

  /**
   * Load .env.test file
   */
  static loadTestEnv(): void {
    // In Node 22+, use built-in dotenv
    try {
      if (typeof (process as any).loadEnvFile === 'function') {
        (process as any).loadEnvFile('.env.test');
        console.log('✓ Loaded .env.test');
      }
    } catch (error) {
      console.warn('⚠️  .env.test not found, using environment variables');
    }
  }
}
