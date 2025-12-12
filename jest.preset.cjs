// jest.preset.cjs - Shared Jest configuration for all packages
// Philosophy: DRY - Single source of truth for Jest config across monorepo

module.exports = {
  // TypeScript support via ts-jest
  preset: 'ts-jest',

  // ESM support (critical for Node.js 22+, TypeScript 5.7+)
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Transform .js imports to .ts for ESM compatibility
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

  // Test environment (Node.js for backend services)
  testEnvironment: 'node',

  // Coverage configuration (sensible defaults)
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/test/'],

  // Performance settings
  maxWorkers: '50%', // Use half of available CPU cores

  // Detect issues early (fail fast)
  detectOpenHandles: true, // Warn about open handles (timers, connections)
  forceExit: false, // Don't force exit - ensure clean shutdown

  // Default timeout (10s for most tests, override in specific configs if needed)
  testTimeout: 10000,

  // Verbose output for debugging
  verbose: true,

  // Module resolution
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Ignore patterns (common across all configs)
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
