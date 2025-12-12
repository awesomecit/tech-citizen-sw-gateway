# ADR-001: Gateway Composability with Feature Flags

**Status**: Accepted  
**Date**: 2025-12-12  
**Decision Makers**: Antonio Cittadino  
**Epic**: Epic 3 - Platformatic Watt Core

---

## Context

Il gateway necessita di diverse funzionalità (autenticazione, cache, telemetria, rate limiting) che richiedono infrastruttura esterna (Redis, Keycloak, Prometheus). Questo crea problemi per:

1. **Unit testing**: Test unitari richiedono Docker containers, rallentando il ciclo TDD
2. **Sviluppo locale**: Developer devono avviare tutto lo stack per testare una singola feature
3. **Deployment flessibile**: Ambienti diversi (dev/staging/prod) hanno bisogni diversi
4. **Manutenibilità**: Codice con `if (process.env.SKIP_AUTH_PLUGIN)` sparsi ovunque è fragile

### Problema Originale

```typescript
// ❌ Approccio precedente - env var magica
if (process.env.SKIP_AUTH_PLUGIN !== 'true') {
  await app.register(authPlugin, {...});
} else {
  app.decorate('authenticate', async () => {});
}
```

**Svantaggi**:

- Env var speciale solo per i test (`SKIP_AUTH_PLUGIN`)
- Non componibile (tutto o niente)
- Non testabile (non posso testare combinazioni di feature)
- Non documentata (magic string)

---

## Decision

Implementiamo **Feature Flags** con configurazione esplicita attraverso l'interfaccia `GatewayConfig`.

### Architettura

```typescript
// services/gateway/src/config.ts
export interface FeatureFlags {
  auth: boolean; // Keycloak OIDC + JWT + Redis sessions
  cache: boolean; // Redis caching layer
  telemetry: boolean; // Prometheus metrics
  rateLimit: boolean; // Rate limiting (future)
}

export interface GatewayConfig {
  features: FeatureFlags;
  keycloakUrl?: string;
  realm?: string;
  clientId?: string;
  redis?: { host: string; port: number };
}

export function loadConfig(options?: Partial<GatewayConfig>): GatewayConfig;
```

### Utilizzo

**Unit Tests (no infrastructure)**:

```typescript
await app.register(plugin, {
  config: {
    features: {
      auth: false, // ← No Redis/Keycloak
      cache: false, // ← No Redis
      telemetry: true, // ← Solo metrics (no external deps)
      rateLimit: false,
    },
  },
});
```

**Production (env vars)**:

```bash
export GATEWAY_FEATURE_AUTH=true
export GATEWAY_FEATURE_CACHE=true
export GATEWAY_FEATURE_TELEMETRY=true
export GATEWAY_FEATURE_RATE_LIMIT=false

# Config caricata da env vars
await app.register(plugin);
```

**Development (mix)**:

```typescript
await app.register(plugin, {
  config: {
    features: { auth: true, cache: false, telemetry: true },
    keycloakUrl: 'http://localhost:8090',
  },
});
```

---

## Consequences

### Positive

1. **Unit test veloci**: 70 test in ~1.7s senza Docker
2. **Testabilità aumentata**: Possiamo testare combinazioni di feature
3. **YAGNI-compliant**: Solo 4 feature flags (quelle che usiamo)
4. **Type-safe**: TypeScript valida la config
5. **Chiara**: Config esplicita invece di env var magiche
6. **Riusabile**: Stesso pattern per tutti gli ambienti
7. **Backwards-compatible**: Loadconfig() legge env vars se non passate options

### Negative

1. **Codice aggiuntivo**: +80 LOC (`config.ts`)
2. **Verbosità nei test**: Deve passare `config` object
3. **Manutenzione**: Ogni nuova feature richiede flag + validation

### Neutral

1. **Migrazione**: Rimozione di `SKIP_AUTH_PLUGIN` da 5 script in package.json
2. **Learning curve**: Team deve conoscere le feature flags disponibili

---

## Alternatives Considered

### Option B: Dependency Injection (DI Container)

```typescript
const container = new Container();
container.register('auth', authPlugin, { enabled: false });
container.register('cache', cachePlugin, { enabled: false });

await app.register(container.buildGateway());
```

**Rejected because**:

- Over-engineering per 4 feature
- Aggiunge dipendenza esterna (tsyringe, inversify)
- Maggiore complessità cognitiva

### Option C: Plugin Multipli (Micro-gateway Pattern)

```typescript
// gateway-auth/index.ts
// gateway-cache/index.ts
// gateway-telemetry/index.ts

await app.register(gatewayAuth);
await app.register(gatewayCache);
```

**Rejected because**:

- Troppa granularità (4 repo separati)
- Overhead di versioning (semantic-release per ogni plugin)
- Cross-cutting concerns difficili (logging, correlation ID)

### Option D: Environment-Based (Spring Profiles Style)

```typescript
// watt.json
{
  "profiles": {
    "test": { "auth": false, "cache": false },
    "dev": { "auth": true, "cache": false },
    "prod": { "auth": true, "cache": true }
  }
}
```

**Rejected because**:

- Platformatic Watt non ha profiles nativi
- Richiede custom loader
- Meno flessibile di config esplicita

---

## Implementation Details

### File Structure

```
services/gateway/
├── src/
│   ├── config.ts          # ← NEW: FeatureFlags + loadConfig()
│   ├── index.ts           # ← MODIFIED: usa loadConfig()
│   └── types.ts
├── test/
│   └── index.test.ts      # ← MODIFIED: passa config object
├── FEATURE_FLAGS.md       # ← NEW: esempi di config
└── package.json
```

### Test Coverage Impact

**Before**: Gateway 0% (Jest non tracciava il modulo reale)  
**After**: Gateway 100% (tap con config.ts + index.ts)

**Unit test execution**:

- Before: ~3-4s (Jest overhead)
- After: ~1.7s (tap nativo)

---

## Validation

### Acceptance Criteria (BDD)

```gherkin
Feature: Gateway Composability

  Scenario: Unit test without infrastructure
    Given feature flags with auth=false, cache=false
    When I register gateway plugin
    Then no Redis connection is attempted
    And no Keycloak client is initialized
    And authenticate decorator is mocked
    And all tests pass in < 2 seconds

  Scenario: Production with full stack
    Given GATEWAY_FEATURE_AUTH=true in env
    And GATEWAY_FEATURE_CACHE=true in env
    When I start gateway
    Then auth plugin registers with Keycloak
    And Redis session store is initialized
    And /metrics endpoint is exposed
```

### Test Results

```bash
$ npm run test:cov
# { total: 70, pass: 70 }
# time=1687.008ms

All files                  |   44.39 |      100 |       0 |    43.9 |
 packages/auth/src         |    45.2 |      100 |       0 |    44.8 |
 services/gateway/src      |     100 |      100 |     100 |     100 |
  config.ts                |     100 |      100 |     100 |     100 |
  index.ts                 |     100 |      100 |     100 |     100 |
```

---

## Migration Path

### Step 1: Create config.ts (DONE)

- Define FeatureFlags interface
- Implement loadConfig() with env var fallback
- Add validation (auth enabled → require keycloakUrl)

### Step 2: Refactor index.ts (DONE)

- Replace `process.env.SKIP_AUTH_PLUGIN` with `config.features.auth`
- Add PluginOptions interface
- Conditional plugin registration per feature

### Step 3: Update tests (DONE)

- Pass explicit config object in beforeEach
- Remove `SKIP_AUTH_PLUGIN` env var
- Verify 70/70 tests pass

### Step 4: Update package.json scripts (DONE)

- Remove `SKIP_AUTH_PLUGIN=true` from npm scripts
- Update documentation

### Step 5: Integration tests (TODO)

- Use tabularasa pattern per test isolati
- Setup/teardown infrastructure per test suite
- Refactoring architecture esagonale (ports/adapters)

---

## Related Documents

- [Copilot Instructions](.github/copilot-instructions.md) - Coding standards
- [TABULARASA.md](../../TABULARASA.md) - Clean architecture principles
- [Feature Flags Examples](services/gateway/FEATURE_FLAGS.md)
- [Epic 3: Platformatic Watt Core](docs/project/roadmap.md)

---

## References

- Martin Fowler - [Feature Toggles](https://martinfowler.com/articles/feature-toggles.html)
- Platformatic Watt - [Plugin System](https://docs.platformatic.dev/watt/overview)
- YAGNI Principle - [You Aren't Gonna Need It](https://martinfowler.com/bliki/Yagni.html)

---

**Last Updated**: 2025-12-12  
**Status**: ✅ Implemented and validated
