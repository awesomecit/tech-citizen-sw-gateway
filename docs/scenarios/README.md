# Scenario-Driven Development Sessions

**Filosofia**: Ogni task atomico è documentato come scenario TDD con acceptance criteria eseguibili.

## Struttura

Ogni file scenario segue il pattern:

```
YYYY-MM-DD-{EPIC}-{US}-{task-name}.md
```

Esempio: `2025-12-12-EPIC014-US050-jest-preset-creation.md`

## Template Scenario

````markdown
# [{EPIC-ID}] {US-ID}: {Task Name}

**Data**: YYYY-MM-DD  
**Durata stimata**: X ore  
**Status**: 🔴 Not Started | 🟡 In Progress | 🟢 Done  
**Commit SHA**: (dopo commit)

---

## Obiettivo

{Descrizione task atomico - 1-2 frasi}

## Acceptance Criteria (Gherkin)

\```gherkin
Feature: {Feature name}

Scenario: {Nome scenario}
Given {precondizione}
When {azione}
Then {risultato atteso}
\```

## Pre-requisiti

- [ ] {Cosa serve prima di iniziare}
- [ ] {Dipendenze, file, conoscenze}

## Step-by-Step (TDD Red-Green-Refactor)

### 1. RED - Scrivi test che fallisce

\```bash

# Comando per vedere test fallire

npm run test:unit
\```

**Output atteso**: `FAIL: Expected X but got Y`

### 2. GREEN - Implementa soluzione minima

**File da creare/modificare**:

- `path/to/file.ts`

**Codice**:
\```typescript
// Implementazione minima
\```

**Verifica**:
\```bash
npm run test:unit

# PASS

\```

### 3. REFACTOR - Migliora codice

**Cosa migliorare**:

- Naming
- Duplicazione
- Complessità

**Verifica finale**:
\```bash
npm run quality:fix
npm run test:unit
\```

## Problemi Incontrati

- [ ] {Problema 1}: {Soluzione}
- [ ] {Problema 2}: {Soluzione}

## Commit Message

\```
{type}({scope}): {subject}

{body}

{footer}
\```

Esempio:
\```
feat(test): add jest preset for shared config

- Created jest.preset.cjs with TypeScript + ESM support
- Root jest.config.cjs extends preset
- Removed duplicate config in packages

Refs: EPIC-008, US-057
\```

## Lessons Learned

- {Cosa ho imparato}
- {Pattern riutilizzabili}
- {Errori da evitare}

## Next Steps

- [ ] {Prossimo task nella sequenza}
- [ ] {Dipendenze per task futuri}

---

**Completed**: {Timestamp}  
**Next Scenario**: [{Next task name}](./YYYY-MM-DD-{next}.md)
````

## Indice Scenari

### EPIC-008: Test Architecture Reset

#### US-057: Jest Configuration Consolidation

- [ ] `2025-12-12-EPIC014-US050-jest-preset-creation.md` - Creare jest.preset.cjs
- [ ] `2025-12-12-EPIC014-US050-root-config-update.md` - Aggiornare jest.config.cjs root
- [ ] `2025-12-12-EPIC014-US050-integration-config.md` - Creare jest.integration.config.cjs
- [ ] `2025-12-12-EPIC014-US050-package-migration.md` - Migrare config package/auth

#### US-058: Test Helpers Refactoring

- [ ] `2025-12-12-EPIC014-US051-container-manager.md` - ContainerManager per Testcontainers
- [ ] `2025-12-12-EPIC014-US051-redis-mock.md` - In-memory Redis mock
- [ ] `2025-12-12-EPIC014-US051-port-allocator.md` - Random port allocation
- [ ] `2025-12-12-EPIC014-US051-test-app-builder.md` - Fastify test instance builder

#### US-059: Package Auth Test Migration

- [ ] `2025-12-12-EPIC014-US052-directory-structure.md` - Creare unit/integration/fixtures
- [ ] `2025-12-12-EPIC014-US052-unit-migration.md` - Migrare test unitari
- [ ] `2025-12-12-EPIC014-US052-integration-migration.md` - Migrare test integration
- [ ] `2025-12-12-EPIC014-US052-fixtures-creation.md` - Creare fixtures riutilizzabili

#### US-060: E2E Test Setup with Cucumber

- [ ] `2025-12-12-EPIC014-US053-cucumber-install.md` - Installare @cucumber/cucumber
- [ ] `2025-12-12-EPIC014-US053-cucumber-config.md` - Configurare cucumber.cjs
- [ ] `2025-12-12-EPIC014-US053-world-context.md` - World context e hooks
- [ ] `2025-12-12-EPIC014-US053-feature-migration.md` - Migrare feature esistenti
- [ ] `2025-12-12-EPIC014-US053-step-definitions.md` - Creare step definitions

### EPIC-009: Woodpecker CI Setup

#### US-061: Woodpecker Server Setup

- [ ] `2025-12-12-EPIC015-US054-docker-compose.md` - docker-compose.woodpecker.yml
- [ ] `2025-12-12-EPIC015-US054-oauth-config.md` - Configurare GitHub OAuth
- [ ] `2025-12-12-EPIC015-US054-caddy-integration.md` - Aggiungere a Caddy reverse proxy

#### US-062: CI Pipeline Definition

- [ ] `2025-12-12-EPIC015-US055-pipeline-yaml.md` - Creare .woodpecker.yml
- [ ] `2025-12-12-EPIC015-US055-services-config.md` - Configurare services (Keycloak, Redis)
- [ ] `2025-12-12-EPIC015-US055-secrets-setup.md` - Configurare secrets

#### US-063: Ansible Integration for Deploy

- [ ] `2025-12-12-EPIC015-US056-deploy-step.md` - Deploy step in pipeline
- [ ] `2025-12-12-EPIC015-US056-ssh-secrets.md` - SSH secrets configuration
- [ ] `2025-12-12-EPIC015-US056-health-check.md` - Post-deploy health check

---

## Workflow

```bash
# 1. Scegli prossimo scenario
cat docs/scenarios/README.md

# 2. Crea file scenario da template
cp docs/scenarios/TEMPLATE.md docs/scenarios/2025-12-12-EPIC014-US050-jest-preset.md

# 3. Apri scenario in chat con AI
# AI legge scenario, segue TDD, documenta problemi

# 4. Commit quando test passa
git add .
git commit -m "feat(test): {come da scenario}"

# 5. Aggiorna scenario con SHA commit e lessons learned
# 6. Passa a scenario successivo
```

## Metriche

| Metrica               | Target    | Attuale |
| --------------------- | --------- | ------- |
| Scenari completati    | 20        | 0       |
| Coverage cresciuto    | +20%      | 0%      |
| Durata media scenario | 30-60 min | N/A     |
| Commit atomic         | 100%      | N/A     |

---

**Next**: Inizia con [`2025-12-12-EPIC014-US050-jest-preset-creation.md`](./2025-12-12-EPIC014-US050-jest-preset-creation.md)
