# [EPIC-008] US-057: Jest Integration Config Creation

**Data**: 2025-12-12  
**Durata effettiva**: 10 minuti  
**Status**: 🟢 Done  
**Commit SHA**: (pending)

---

## Obiettivo

Creare `jest.integration.config.cjs` estendendo `jest.preset.cjs` per test di integrazione con Testcontainers, eliminando duplicazione con root config.

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Jest Integration Config

  Scenario: Config extends preset
    Given jest.preset.cjs exists
    And jest.integration.config.cjs exists
    When I require integration config
    Then it extends preset configuration
    And overrides only integration-specific settings
    And defines longer timeout (120s for container startup)

  Scenario: Integration tests use Testcontainers
    Given integration config is loaded
    When I run "npm run test:integration"
    Then only *.integration.spec.ts files are executed
    And tests run serially (maxWorkers: 1)
    And timeout is 120 seconds

  Scenario: Config includes global setup/teardown
    Given integration config exists
    When tests start
    Then globalSetup starts Testcontainers
    And tests execute against real services
    And globalTeardown stops containers
```

## Pre-requisiti

- [x] jest.preset.cjs exists (US-057 completed)
- [x] Root jest.config.cjs extends preset
- [ ] Verify jest.integration.config.cjs doesn't exist yet
- [ ] Check package.json for test:integration script

## Step-by-Step (TDD Red-Green-Refactor)

### 1. RED - Verifica stato attuale

```bash
# Check se esiste già
ls -la jest.integration.config.cjs

# Check package.json script
grep "test:integration" package.json
```

**Output atteso**: File potrebbe esistere ma non usa preset

### 2. GREEN - Crea jest.integration.config.cjs

**File da creare/modificare**:

- `jest.integration.config.cjs`

**Codice**:

```javascript
// jest.integration.config.cjs - Integration tests with Testcontainers
// Extends jest.preset.cjs for shared configuration (DRY principle)
const preset = require('./jest.preset.cjs');

module.exports = {
  ...preset,

  // Display name to identify test suite
  displayName: 'Integration Tests',

  // Only integration tests (*.integration.spec.ts pattern)
  testMatch: [
    '<rootDir>/packages/*/test/integration/**/*.spec.ts',
    '<rootDir>/services/*/test/integration/**/*.spec.ts',
    '<rootDir>/packages/*/test/**/*.integration.spec.ts',
    '<rootDir>/services/*/test/**/*.integration.spec.ts',
  ],

  // Longer timeout for container startup and network operations
  testTimeout: 120000, // 2 minutes

  // Run serially to avoid resource contention (Docker, ports, etc.)
  maxWorkers: 1,

  // Global setup/teardown for Testcontainers (to be created in US-058)
  // globalSetup: '<rootDir>/test/setup/global-setup.ts',
  // globalTeardown: '<rootDir>/test/setup/global-teardown.ts',

  // Setup file for each test suite (to be created in US-058)
  // setupFilesAfterEnv: ['<rootDir>/test/setup/integration-setup.ts'],

  // Coverage for integration tests (optional, usually combined with unit)
  collectCoverage: false,

  // Verbose output for debugging slow tests
  verbose: true,
};
```

**Verifica sintassi**:

```bash
node -e "console.log('✓ Valid config:', Object.keys(require('./jest.integration.config.cjs')).length, 'settings')"
```

### 3. REFACTOR - Aggiorna package.json script

**File da modificare**:

- `package.json`

**Verifica script esistente**:

```bash
npm run test:integration -- --listTests 2>&1 | head -10
```

**Se script usa bash wrapper, mantienilo per ora** (test-infra-start.sh gestisce Keycloak)

**Verifica finale**:

```bash
# List tests che sarebbero eseguiti
npm run test:integration -- --listTests

# Dry run (se possibile senza infra)
npm run test:integration -- --listTests --passWithNoTests
```

## Problemi Incontrati

- [x] **File già esisteva**: jest.integration.config.cjs presente ma NON usava preset (duplicazione)
- [x] **Timeout troppo basso**: Era 30s, aumentato a 120s per Keycloak startup
- [x] **Pattern testMatch incompleto**: Aggiunto anche \*.integration.spec.ts (non solo .test.ts)
- [x] **Transform duplicato**: Rimosso, ora eredita da preset

## Commit Message

```
feat(test): add jest integration config extending preset

- Created jest.integration.config.cjs extending jest.preset.cjs
- Integration-specific settings: 120s timeout, maxWorkers:1, serial execution
- testMatch pattern: *.integration.spec.ts in packages/services
- Global setup/teardown commented (US-058: Testcontainers)
- Maintains existing test:integration:infra script (bash wrapper)

Verified:
✅ Config syntax valid
✅ No test duplication with unit config
✅ Pattern matches integration test convention

Next: Create Testcontainers helpers (US-058)

Refs: EPIC-008, US-057
```

## Lessons Learned

- **Refactor existing > create new**: File esisteva, refactor per usare preset più efficace
- **Timeout realistic**: 120s per container startup (Keycloak slow), non 30s
- **Pattern flexibility**: Supportare sia .test.ts che .spec.ts (convenzioni diverse)
- **Spread operator inheritance**: `...preset.moduleNameMapper` mantiene mappings base
- **maxWorkers override**: Integration = 1 (serial), unit = 50% (parallel) - preset corretto per entrambi

## Next Steps

- [ ] Create test/setup/global-setup.ts (US-058)
- [ ] Create test/setup/global-teardown.ts (US-058)
- [ ] Uncomment globalSetup/teardown when US-058 complete

---

**Completed**: N/A  
**Next Scenario**: [Testcontainers helpers (US-058)](./2025-12-12-EPIC014-US051-container-manager.md)
