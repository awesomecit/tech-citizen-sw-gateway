// jest.integration.config.js
module.exports = {
  displayName: 'Integration Tests',
  testEnvironment: 'node',

  // Sequential execution to avoid DB conflicts
  maxWorkers: 1,

  // Reasonable timeout for DB operations
  testTimeout: 30000,

  // Detect issues, don't hide them
  detectOpenHandles: true,
  forceExit: false, // Fail if cleanup is incomplete

  // Pattern dei file di test di integrazione
  testMatch: [
    '<rootDir>/packages/**/test/**/*.integration.test.ts',
    '<rootDir>/services/**/test/**/*.integration.test.ts',
  ],

  // Moduli da trasformare con TypeScript
  preset: 'ts-jest',

  // ESM support (same as jest.config.cjs)
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'node',
        },
      },
    ],
  },

  // Setup files commented out - create later if needed
  // setupFilesAfterEnv: ['<rootDir>/test/setup.integration.ts'],

  // Global setup e teardown commented out - create later if needed
  // globalSetup: '<rootDir>/test/globalSetup.integration.ts',
  // globalTeardown: '<rootDir>/test/globalTeardown.integration.ts',

  // Mapping dei moduli per import relativi
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Map .js imports to .ts
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@tech-citizen/test-helpers$': '<rootDir>/packages/test-helpers/src/index.ts',
    '^@tech-citizen/auth$': '<rootDir>/packages/auth/src/index.ts',
    '^@tech-citizen/cache$': '<rootDir>/packages/cache/src/index.ts',
    '^@tech-citizen/events$': '<rootDir>/packages/events/src/index.ts',
    '^@tech-citizen/telemetry$': '<rootDir>/packages/telemetry/src/index.ts',
  },

  // Coverage per test integration
  collectCoverage: false, // Disabilitato per performance durante development

  // Ignora i moduli node_modules tranne testcontainers e get-port (ESM), trasforma workspace packages
  transformIgnorePatterns: [
    'node_modules/(?!(testcontainers|get-port)/)',
    '!<rootDir>/packages/', // Transform workspace packages
  ],

  // Environment variables per test
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
};
