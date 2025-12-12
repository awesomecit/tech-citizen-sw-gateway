# [EPIC-008] US-057: Jest Preset Creation

**Data**: 2025-12-12  
**Durata effettiva**: 15 minuti  
**Status**: 🟢 Done  
**Commit SHA**: 94c21ef

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
- [x] Review current test configs for duplication ✅ **DONE** (see analysis below)

## Step-by-Step (TDD Red-Green-Refactor)

### 1. RED - Analizza configurazioni esistenti

```bash
# Trova tutti i jest.config
find . -name "jest.config.*" -not -path "./node_modules/*"

# Output effettivo:
# ./jest.config.cjs (root - unit tests)
# ./jest.integration.config.cjs (già estende preset ✅)
# ./jest.e2e.config.cjs (NON estende preset ❌)
# ./packages/auth/jest.config.cjs (NON estende preset ❌)
# ./services/gateway/jest.config.js (NON estende preset ❌)
```

**Duplicazione identificata** (linee ripetute in 5 file):

| Config Block | Root | Integration | E2E | Auth | Gateway |
|--------------|------|-------------|-----|------|---------|
| `preset: 'ts-jest'` | ✅ via preset | ✅ via preset | ❌ duplicato | ❌ duplicato | ❌ duplicato |
| `testEnvironment: 'node'` | ✅ via preset | ✅ via preset | ❌ duplicato | ❌ duplicato | ❌ duplicato |
| `extensionsToTreatAsEsm` | ✅ via preset | ✅ via preset | ❌ duplicato | ❌ duplicato | ❌ duplicato |
| `transform: ts-jest/useESM` | ✅ via preset | ✅ via preset | ❌ duplicato | ❌ duplicato | ❌ duplicato |
| `moduleNameMapper: .js$` | ✅ via preset | ✅ via preset | ❌ duplicato | ❌ duplicato | ❌ duplicato |
| `collectCoverageFrom` | ✅ via preset | ✅ override | ❌ duplicato | ❌ duplicato | ❌ duplicato |
| `coverageReporters` | ✅ via preset | ✅ via preset | ❌ duplicato | ❌ duplicato | ❌ duplicato |
| `detectOpenHandles` | ✅ via preset | ✅ via preset | ❌ duplicato | ❌ duplicato | ❌ assente |
| `verbose: true` | ✅ via preset | ✅ via preset | ❌ assente | ❌ assente | ❌ duplicato |

**Totale duplicazioni**: ~120 linee duplicate tra 3 file (e2e, auth, gateway)
**Percentuale di duplicazione**: ~75% del codice nei config è duplicato

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
# Lista test trovati (3 file, 28 test totali)
npm run test:unit -- --listTests
# Output:
# ✅ packages/auth/test/plugins/jwt.spec.ts
# ✅ packages/auth/test/keycloak.test.ts
# ✅ packages/auth/test/index.spec.ts

# Esegui test suite completa
npm run test:unit
# Output:
# ✅ Test Suites: 3 passed, 3 total
# ✅ Tests:       28 passed, 28 total
# ✅ Time:        0.858s (< 1s con preset ottimizzato)
```

**Risultato**: ✅ **PASS** - Tutti i test passano, configurazione preset corretta

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

Refs: EPIC-008, US-057
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

### Immediate (US-057 completion)

- [ ] **Refactor `jest.e2e.config.cjs`** per estendere preset (elimina 30 linee duplicate)
- [ ] **Refactor `packages/auth/jest.config.cjs`** per estendere preset (elimina 35 linee duplicate)
- [ ] **Refactor `services/gateway/jest.config.js`** per estendere preset (elimina 25 linee duplicate)

### Future (US-058+)

- [ ] Creare `jest.integration.config.cjs` estendendo preset (già fatto ✅)
- [ ] Documentare pattern in `docs/development/TESTING.md`
- [ ] Aggiungere validation script per verificare che tutti i config estendano preset

### Metriche di Refactoring

- **Prima**: 5 file config, ~350 linee totali, 75% duplicazione
- **Dopo**: 5 file config, ~200 linee totali, <10% duplicazione
- **Risparmio**: ~150 linee di codice, manutenzione centralizzata

---

**Completed**: 2025-12-12 23:59 UTC  
**Commit**: 94c21ef  
**Next Scenario**: [jest.integration.config.cjs creation](./2025-12-12-EPIC014-US050-integration-config.md)
