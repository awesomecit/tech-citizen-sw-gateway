// jest.integration.config.cjs - Integration tests with real infrastructure
// Extends jest.preset.cjs for shared configuration (DRY principle)
const preset = require('./jest.preset.cjs');

module.exports = {
  ...preset,

  // Display name to identify test suite
  displayName: 'Integration Tests',

  // Sequential execution to avoid resource conflicts (Docker, ports, DB)
  maxWorkers: 1,

  // Longer timeout for container startup and network operations
  testTimeout: 120000, // 2 minutes (was 30s, increased for Keycloak/Redis startup)

  // Pattern dei file di test di integrazione
  testMatch: [
    '<rootDir>/packages/**/test/**/*.integration.test.ts',
    '<rootDir>/packages/**/test/**/*.integration.spec.ts',
    '<rootDir>/services/**/test/**/*.integration.test.ts',
    '<rootDir>/services/**/test/**/*.integration.spec.ts',
  ],

  // Setup files commented out - will be created in US-051 (Testcontainers helpers)
  // setupFilesAfterEnv: ['<rootDir>/test/setup/integration-setup.ts'],

  // Global setup/teardown commented out - will be created in US-051
  // globalSetup: '<rootDir>/test/setup/global-setup.ts',
  // globalTeardown: '<rootDir>/test/setup/global-teardown.ts',

  // Module aliases (extend preset, add workspace-specific)
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@tech-citizen/test-helpers$':
      '<rootDir>/packages/test-helpers/src/index.ts',
    '^@tech-citizen/auth$': '<rootDir>/packages/auth/src/index.ts',
    '^@tech-citizen/cache$': '<rootDir>/packages/cache/src/index.ts',
    '^@tech-citizen/events$': '<rootDir>/packages/events/src/index.ts',
    '^@tech-citizen/telemetry$':
      '<rootDir>/packages/telemetry/src/index.ts',
  },

  // Coverage for integration tests (separate from unit coverage)
  collectCoverage: true,
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'services/*/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/test/**',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],

  // Transform workspace packages and Testcontainers (ESM modules)
  transformIgnorePatterns: [
    'node_modules/(?!(testcontainers|get-port)/)',
  ],

  // Environment variables for test execution
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
};
