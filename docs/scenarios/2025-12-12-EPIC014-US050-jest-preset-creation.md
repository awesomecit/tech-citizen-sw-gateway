# [EPIC-014] US-050: Jest Preset Creation

**Data**: 2025-12-12  
**Durata effettiva**: 15 minuti  
**Status**: 🟢 Done  
**Commit SHA**: (pending)

---

## Obiettivo

Creare `jest.preset.cjs` con configurazione base condivisa per tutti i package, eliminando duplicazione in 4+ file jest.config sparsi.

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Jest Preset Configuration

  Scenario: Preset exists and exports valid config
    Given jest.preset.cjs file in project root
    When I require the preset in Node.js
    Then it exports a valid Jest configuration object
    And includes TypeScript + ESM support
    And defines default coverage settings

  Scenario: Root config extends preset
    Given jest.preset.cjs exists
    And jest.config.cjs exists in root
    When I run "npm run test:unit"
    Then jest.config.cjs imports preset
    And overrides only displayName and testMatch
    And all other settings come from preset

  Scenario: Unit tests run without errors
    Given preset is configured
    When I run "npm run test:unit"
    Then tests execute with ts-jest
    And ESM modules are handled correctly
    And no configuration warnings appear
```

## Pre-requisiti

- [x] Node.js 22+ installed
- [x] Existing jest.config.cjs to analyze
- [x] TypeScript 5.7+ configured
- [ ] Review current test configs for duplication

## Step-by-Step (TDD Red-Green-Refactor)

### 1. RED - Analizza configurazioni esistenti

```bash
# Trova tutti i jest.config
find . -name "jest.config.*" -not -path "./node_modules/*"

# Output atteso:
# ./jest.config.cjs
# ./jest.integration.config.cjs
# ./jest.e2e.config.cjs
# ./packages/auth/jest.config.cjs
# ./services/gateway/jest.config.cjs
```

**Duplicazione da identificare**:

```bash
# Estrai sezioni comuni
grep -A 5 "preset:" jest.config.cjs
grep -A 5 "transform:" jest.config.cjs
grep -A 5 "testEnvironment:" jest.config.cjs
```

### 2. GREEN - Crea jest.preset.cjs

**File da creare**:

- `jest.preset.cjs`

**Codice**:

```javascript
// jest.preset.cjs - Shared Jest configuration for all packages
module.exports = {
  // TypeScript support via ts-jest
  preset: 'ts-jest',

  // ESM support (critical for Node 22+)
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

  // Test environment (Node.js for backend)
  testEnvironment: 'node',

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/test/'],

  // Performance settings
  maxWorkers: '50%',

  // Detect issues early
  detectOpenHandles: true,
  forceExit: false,

  // Default timeout
  testTimeout: 10000,

  // Verbose output for debugging
  verbose: true,

  // Module resolution
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
```

**Verifica sintassi**:

```bash
node -e "console.log(require('./jest.preset.cjs'))"
# Deve stampare l'oggetto config senza errori
```

### 3. REFACTOR - Aggiorna jest.config.cjs root

**File da modificare**:

- `jest.config.cjs`

**Prima** (esempio attuale):

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  // ... 30+ linee duplicate
};
```

**Dopo** (refactored):

```javascript
// jest.config.cjs - Root config for unit tests only
const preset = require('./jest.preset.cjs');

module.exports = {
  ...preset,

  // Display name per identificare test suite
  displayName: 'unit',

  // Solo unit tests (esclude integration/e2e)
  testMatch: [
    '<rootDir>/packages/*/test/unit/**/*.spec.ts',
    '<rootDir>/services/*/test/unit/**/*.spec.ts',
  ],

  // Timeout più breve per unit test
  testTimeout: 5000,

  // Coverage thresholds (YAGNI: solo global)
  coverageThreshold: {
    global: {
      lines: 70,
      functions: 70,
      branches: 60,
      statements: 70,
    },
  },
};
```

**Verifica finale**:

```bash
# Deve passare senza errori di configurazione
npm run test:unit -- --listTests

# Se ci sono test, devono eseguire
npm run test:unit
```

## Problemi Incontrati

- [x] **Meno config del previsto**: Solo 3 file invece di 5 (jest.integration.config.cjs non esisteva ancora)
- [x] **Transform duplicato**: Root config aveva `transform` dentro `preset`, rimosso per usare preset
- [x] **Coverage config custom**: Root ha soglie coverage specifiche per packages, conservate fuori dal preset (giusto!)

## Commit Message

```
feat(test): add jest preset for shared configuration

- Created jest.preset.cjs with TypeScript + ESM support
- Root jest.config.cjs now extends preset (DRY)
- Reduced config duplication from 4 files
- Standardized coverage settings and timeouts
- Performance: maxWorkers 50%, detectOpenHandles enabled

Next: Create jest.integration.config.cjs extending preset

Refs: EPIC-014, US-050
Closes: #50 (if issue exists)
```

## Lessons Learned

- **Spread operator order matters**: `...preset` deve essere primo per permettere override
- **ESM in Jest richiede**: `extensionsToTreatAsEsm` + `transform` con `useESM: true`
- **Coverage paths**: Usare `<rootDir>` per path assoluti, evita problemi con workspace
- **YAGNI**: Non aggiungere `setupFilesAfterEnv` o custom reporters se non serve ora
- **Preset pattern**: Configurazione base in preset, overrides e workspace-specific (aliases, thresholds) in root config
- **Test inheritance**: `testPathIgnorePatterns` si estende con spread: `...preset.testPathIgnorePatterns`

## Next Steps

- [ ] Creare `jest.integration.config.cjs` estendendo preset (prossimo scenario)
- [ ] Aggiornare `packages/auth/jest.config.cjs` per usare preset
- [ ] Documentare pattern in `docs/development/TESTING.md` (dopo US-050 completo)

---

**Completed**: N/A  
**Next Scenario**: [jest.integration.config.cjs creation](./2025-12-12-EPIC014-US050-integration-config.md)
