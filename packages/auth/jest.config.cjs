// jest.config.cjs - Auth package unit tests

module.exports = {
  displayName: 'Auth Package - Unit Tests',
  testEnvironment: 'node',

  // PARALLEL execution for fast feedback
  maxWorkers: '50%',

  // Fast timeout - unit tests should be <1s, max 5s
  testTimeout: 5000,

  // Detect issues, don't hide them
  detectOpenHandles: true,
  forceExit: false,

  // Pattern dei file di test - SOLO unit tests
  testMatch: ['<rootDir>/test/**/*.spec.ts', '<rootDir>/test/**/*.test.ts'],

  // Escludi integration e e2e tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.integration\\.spec\\.ts$',
    '\\.e2e\\.spec\\.ts$',
  ],

  // TypeScript support
  preset: 'ts-jest',

  // ESM support
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
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

  // Coverage configuration
  collectCoverage: false, // Disabilitato per default
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage thresholds (come da EPIC-009)
  coverageThreshold: {
    global: {
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85,
    },
  },

  // Verbose per debug
  verbose: true,
};
