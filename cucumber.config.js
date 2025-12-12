/**
 * Cucumber Configuration
 * E2E test suite using Testcontainers for full-stack integration
 */
export default {
  // Feature file patterns
  paths: ['e2e/features/**/*.feature'],

  // Step definitions (use require for ts-node/tsx)
  require: ['e2e/steps/**/*.ts'],
  requireModule: ['tsx'],

  // Formatters
  format: ['progress-bar', 'json:reports/cucumber-report.json'],

  // Parallel execution (disabled for Testcontainers stability)
  parallel: 1,

  // Timeout for long-running steps (Testcontainers startup can take 30s+)
  timeout: 90000, // 90 seconds

  // Publish results
  publish: false,

  // Retry failed tests
  retry: 0, // Disabled for deterministic E2E tests

  // Require modules for TypeScript support
  requireModule: ['tsx'],

  // Strict mode (fail on undefined steps)
  strict: true,

  // Dry run (validate without execution)
  dryRun: false,
};
