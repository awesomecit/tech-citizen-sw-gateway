# Feature Flags & Release Tracking

Sistema di tracking automatico per feature flags, user stories, e pianificazione release basato su git commit analysis e Semantic Versioning.

## File Principali

### `features.json`

Database centrale che traccia:

- **Features/Epic**: Stato di avanzamento, dipendenze, blockers
- **User Stories**: Commit, test coverage, BDD scenarios
- **Feature Toggles**: Configurazione per environment (dev/test/staging/prod)
- **Release Planning**: Version bump suggestion, changelog automatico

### `features.schema.json`

JSON Schema per validazione struttura dati (draft-07).

### `scripts/update-features.js`

Script di aggiornamento automatico da git commits.

## Struttura Dati

### Feature (Epic Level)

```json
{
  "auth-package": {
    "id": "EPIC-009",
    "name": "Reusable Auth Package",
    "status": "in-progress | done | blocked | deprecated",
    "enabled": true,
    "maturity": "experimental | alpha | beta | stable",
    "progress": {
      "percentage": 40,
      "userStories": { "total": 5, "completed": 2 }
    },
    "environment": {
      "development": true,
      "test": true,
      "staging": false,
      "production": false
    },
    "dependencies": [],
    "blockers": [],
    "commits": [...],
    "userStories": {...},
    "metrics": {
      "estimatedHours": 15,
      "actualHours": 4,
      "testCoverage": 100
    }
  }
}
```

### User Story

```json
{
  "US-038": {
    "name": "JWT validation plugin",
    "status": "done",
    "estimate": "3h",
    "actual": "3h",
    "coverage": 100,
    "tests": { "total": 7, "passing": 7 },
    "scenarios": { "total": 7, "implemented": 7, "passing": 7 },
    "bddFeature": "e2e/features/auth-jwt-validation.feature",
    "completedAt": "2025-12-09T21:15:00Z",
    "commits": ["f4e80d5", "ecb791e", "cfa3c6a"]
  }
}
```

### Feature Toggle

```json
{
  "auth.jwt.validation": {
    "enabled": true,
    "description": "JWT token validation with @fastify/jwt",
    "environments": {
      "development": true,
      "production": false
    },
    "rolloutPercentage": 100,
    "feature": "auth-package",
    "since": "1.0.0",
    "validations": {
      "signature": true,
      "expiration": true,
      "issuer": true
    }
  }
}
```

## Comandi npm

### Aggiornamento Features

```bash
# Aggiorna features.json dai commit git
npm run features:update

# Preview senza scrivere (dry-run)
npm run features:preview

# Aggiorna da un tag specifico
node scripts/update-features.js --since=v1.0.0
```

### Validazione Schema

```bash
# Valida features.json contro schema
npm run features:validate

# Richiede ajv-cli (installare se necessario)
npm install -g ajv-cli
```

### Release Planning

```bash
# Suggerisce prossima versione
npm run release:suggest

# Esegue release automatica
npm run release
```

## Workflow Automatico

### 1. Commit con Conventional Commits

```bash
git commit -m "feat(auth): add US-038 Scenario 1 - JWT validation"
```

**Formato richiesto**:

```
<type>(<scope>): <subject>

type: feat | fix | docs | style | refactor | perf | test | build | ci | chore
scope: auth | infra | project | etc
subject: deve contenere US-XXX per tracking user story
```

### 2. Auto-update Features

```bash
npm run features:update
```

**Cosa aggiorna**:

- ✅ Conta commit per tipo (feat/fix/breaking)
- ✅ Suggerisce next version (semantic)
- ✅ Aggiunge commit hash a feature/user story
- ✅ Auto-avanza status: `todo → in-progress` (se ha commit)
- ✅ Timestamp `lastUpdated`

### 3. Validazione

```bash
npm run features:validate
```

**Verifica**:

- Schema compliance (required fields, types, patterns)
- Semantic versioning format
- Commit hash format (7-40 hex chars)
- User story pattern (`US-\d{3,}`)

### 4. Release

```bash
npm run release:suggest  # Preview
npm run release          # Execute
```

**Calcolo versione** (Conventional Commits):

- `BREAKING CHANGE` → major bump (1.0.0 → 2.0.0)
- `feat:` → minor bump (1.0.0 → 1.1.0)
- `fix:` → patch bump (1.0.0 → 1.0.1)
- `docs/style/refactor/test` → no bump

## Integrazione Runtime

### Lettura Feature Flags (Fastify Plugin)

```typescript
import fs from 'fs';

// Carica features.json
const features = JSON.parse(fs.readFileSync('features.json', 'utf8'));

// Check feature toggle
const isJwtValidationEnabled =
  features.toggles['auth.jwt.validation']?.environments[NODE_ENV] ?? false;

if (isJwtValidationEnabled) {
  await fastify.register(jwtPlugin, {
    validations: features.toggles['auth.jwt.validation'].validations,
  });
}
```

### Rollout Graduale

```json
{
  "rolloutPercentage": 50
}
```

```typescript
// Abilita solo per 50% degli utenti
const isEnabled = Math.random() * 100 < toggle.rolloutPercentage;
```

### Environment-based Toggles

```typescript
const envToggles = Object.entries(features.toggles).filter(
  ([key, toggle]) => toggle.environments[process.env.NODE_ENV],
);

console.log(
  `Enabled toggles in ${NODE_ENV}:`,
  envToggles.map(([k]) => k),
);
```

## Metriche e Reporting

### Feature Progress

```bash
node -e "
const f = require('./features.json');
for (const [k, v] of Object.entries(f.features)) {
  console.log(\`\${v.name}: \${v.progress.percentage}% (\${v.status})\`);
}
"
```

**Output**:

```
Reusable Auth Package: 40% (in-progress)
Infrastructure Foundation: 60% (in-progress)
Production Server Setup: 0% (blocked)
```

### Release Readiness

```bash
node -e "
const f = require('./features.json');
console.log(\`Current: \${f.release.current}\`);
console.log(\`Next: \${f.release.nextSuggested}\`);
console.log(\`Unreleased: \${f.release.unreleased.feat} feat, \${f.release.unreleased.fix} fix\`);
"
```

**Output**:

```
Current: 1.0.0
Next: 1.1.0
Unreleased: 11 feat, 3 fix
```

### Test Coverage by Feature

```bash
node -e "
const f = require('./features.json');
for (const [k, v] of Object.entries(f.features)) {
  if (v.metrics?.testCoverage) {
    console.log(\`\${v.name}: \${v.metrics.testCoverage}% (\${v.metrics.passingTests}/\${v.metrics.totalTests} tests)\`);
  }
}
"
```

## Best Practices

### 1. Commit Messages

✅ **Corretto**:

```
feat(auth): add US-038 Scenario 1 - JWT valid token validation
fix(infra): resolve Redis connection timeout in production
docs: update BACKLOG with US-037/038 completion
```

❌ **Errato**:

```
updated auth  (no type/scope)
WIP          (non-conventional)
fixed bug    (no scope, vague)
```

### 2. Feature Status Management

```json
{
  "status": "todo"       // Non iniziato
  "status": "in-progress" // Auto-set quando appare 1° commit
  "status": "done"       // Manuale: quando tutti US sono done
  "status": "blocked"    // Manuale: dipendenze/blockers presenti
}
```

### 3. Environment Rollout

```
development → test → staging → production
```

- **Development**: Sempre `true` per feature in sviluppo
- **Test**: `true` quando ha test coverage > 85%
- **Staging**: `true` quando epic è 100% completo
- **Production**: `true` solo dopo staging verification

### 4. Maturity Levels

```
experimental → alpha → beta → stable → deprecated
```

- **Experimental**: < 40% progress, no tests
- **Alpha**: 40-70%, basic tests
- **Beta**: 70-100%, full test coverage
- **Stable**: 100%, production-proven
- **Deprecated**: Scheduled for removal

## Troubleshooting

### Schema Validation Errore

```bash
npm run features:validate
# Schema mismatch at: /features/auth-package/progress/percentage
# Expected: integer (0-100), Got: string "40%"
```

**Fix**: Rimuovi `%` dai numeri in `features.json`.

### Script update-features.js Fallisce

```bash
node scripts/update-features.js --verbose
# Debug output mostra errori di parsing commit
```

**Fix**: Verifica formato commit con `git log --oneline -5`.

### Toggles Non Applicati

```typescript
// Verifica environment attuale
console.log('NODE_ENV:', process.env.NODE_ENV);

// Carica fresh data
delete require.cache[require.resolve('./features.json')];
const features = require('./features.json');
```

## Riferimenti

- **Conventional Commits**: <https://www.conventionalcommits.org/>
- **Semantic Versioning**: <https://semver.org/>
- **JSON Schema**: <https://json-schema.org/>
- **Feature Toggles**: <https://martinfowler.com/articles/feature-toggles.html>

---

**Maintainer**: Antonio Cittadino  
**Last Updated**: 2025-12-09  
**Version**: 1.0.0
