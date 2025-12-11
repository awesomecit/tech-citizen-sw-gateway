// jest.e2e.config.js
module.exports = {
  displayName: 'E2E Tests',
  testEnvironment: 'node',

  // Sequential execution for E2E scenarios
  maxWorkers: 1,

  // Reasonable timeout for complete E2E scenarios
  testTimeout: 60000,

  // Detect issues
  detectOpenHandles: true,
  forceExit: false, // Fail if cleanup is incomplete

  // Pattern dei file di test E2E (smoke tests)
  testMatch: ['<rootDir>/e2e/**/*.test.ts'],

  // Moduli da trasformare con TypeScript
  preset: 'ts-jest',

  // ESM support
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

  // Setup files per test E2E (commented out - file doesn't exist yet)
  // setupFilesAfterEnv: ['<rootDir>/test/setup.integration.ts'],

  // Mapping dei moduli per import relativi
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Map .js imports to .ts
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@tech-citizen/test-helpers$': '<rootDir>/packages/test-helpers/src/index.ts',
    '^@tech-citizen/auth$': '<rootDir>/packages/auth/src/index.ts',
  },

  // Coverage disabilitato per E2E (focus sulla funzionalità)
  collectCoverage: false,

  // Ignora i moduli node_modules tranne testcontainers
  transformIgnorePatterns: ['node_modules/(?!(testcontainers)/)'],

  // Environment variables per test E2E
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
};
