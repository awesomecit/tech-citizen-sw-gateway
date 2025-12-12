// jest.config.cjs - Root config for unit tests only
// Extends jest.preset.cjs for shared configuration (DRY principle)
const path = require('path');
const preset = require('./jest.preset.cjs');

module.exports = {
  ...preset,

  // Display name to identify test suite
  displayName: 'Unit Tests',

  // Faster timeout for unit tests (override preset's 10s)
  testTimeout: 5000,

  // Pattern dei file di test - SOLO unit tests (no integration/e2e)
  testMatch: [
    '<rootDir>/services/**/test/**/*.spec.ts',
    '<rootDir>/services/**/test/**/*.test.ts',
    '<rootDir>/packages/**/test/**/*.spec.ts',
    '<rootDir>/packages/**/test/**/*.test.ts',
  ],

  // Escludi integration e e2e tests dagli unit tests
  testPathIgnorePatterns: [
    ...preset.testPathIgnorePatterns,
    '/reference/',
    '\\.integration\\.spec\\.ts$',
    '\\.integration\\.test\\.ts$',
    '\\.e2e\\.spec\\.ts$',
    '\\.e2e\\.test\\.ts$',
    'session-manager\\.spec\\.ts$', // Requires Redis
    'routes\\.test\\.ts$', // Gateway routes require Redis
    'quick-wins\\.test\\.ts$', // Metrics endpoint requires Redis
    'e2e-login\\.test\\.ts$', // E2E test requiring full stack
  ],

  // Module aliases (workspace-specific, not in preset)
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^@tech-citizen/test-helpers$': '<rootDir>/packages/test-helpers/src/index.ts',
    '^@tech-citizen/auth$': '<rootDir>/packages/auth/src/index.ts',
    '^@tech-citizen/cache$': '<rootDir>/packages/cache/src/index.ts',
    '^@tech-citizen/events$': '<rootDir>/packages/events/src/index.ts',
    '^@tech-citizen/telemetry$': '<rootDir>/packages/telemetry/src/index.ts',
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
  collectCoverage: false, // Disabilitato per i test per performance
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'services/*/src/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.test.ts',
    '!**/test/**',
    '!**/*.interface.ts',
    '!**/*.enum.ts',
    '!**/*.dto.ts',
    '!**/reference/**',
    // Escludi utilities di test e session-manager (richiede Redis per integration test)
    '!packages/test-helpers/src/**',
    '!packages/auth/src/session-manager.ts',
  ],
  
  // Force coverage per TUTTI i file, anche se non importati dai test
  // Questo mostra la vera percentuale di copertura dell'intera codebase
  coverageProvider: 'v8', // v8 è più veloce e accurato di babel/istanbul

  // Coverage thresholds - Focus su packages implementati (Dec 2025)
  // Con v8 provider, coverage include TUTTI i file (anche non importati dai test)
  // Nota: Soglia globale disabilitata per bug Jest v8 (reports 0% anche con 70%)
  // Riferimento: https://github.com/facebook/jest/issues/9223
  coverageThreshold: {
    // Global threshold disabled - v8 provider bug causa false "not met: 0%"
    // Attuale coverage globale reale: 70% statements, 64% branches
    
    // Soglie specifiche per packages critici (attuale: 90% auth con tutti i file)
    [`${path.resolve(__dirname, 'packages/auth/src')}/`]: {
      statements: 85, // Target finale: 90% (Attuale: 90.09%)
      branches: 65, // Target finale: 85% (Attuale: 71.05%)
      functions: 65, // Target finale: 90% (Attuale: 68.75% - include file 0%)
      lines: 85, // Target finale: 90% (Attuale: 90.09%)
    },
    // TODO: Aggiungere quando implementato
    // './packages/cache/src/': { statements: 70, branches: 60, functions: 70, lines: 70 },
    // './packages/telemetry/src/': { statements: 70, branches: 60, functions: 70, lines: 70 },
    // './packages/events/src/': { statements: 70, branches: 60, functions: 70, lines: 70 },
  },

  // Coverage reports
  coverageReporters: [
    'text', // Output in console
    'text-summary', // Summary in console
    'html', // HTML report in coverage/
    'lcov', // Per integrazioni CI/CD
    'json-summary', // Per badge e metriche
  ],

  // Directory output per coverage
  coverageDirectory: 'coverage',

  // Ignora i moduli node_modules tranne alcuni specifici se necessario
  transformIgnorePatterns: ['node_modules/(?!(testcontainers)/)'],
};
