# ADR-005: Gateway as Service vs Package

**Status**: Accepted  
**Date**: 2025-12-13  
**Decision Makers**: Antonio Cittadino  
**Related ADRs**: ADR-001 (Feature Flags), ADR-002 (Auth Hexagonal), ADR-003 (Gateway Hexagonal)

---

## Context

Durante la revisione architetturale del progetto, è emersa una domanda fondamentale:

> "Perché il gateway è strutturato come `services/gateway/` (applicazione deployabile) invece di essere un `packages/gateway-core/` (libreria riutilizzabile) consumato da un service?"

Questa domanda tocca temi architetturali chiave:

1. **Separazione responsabilità**: Domain/Application vs Infrastructure
2. **Riusabilità**: DRY principle vs YAGNI principle
3. **Architettura esagonale**: Ports & Adapters in monorepo
4. **Testabilità**: Business logic isolata da framework

### Struttura Attuale

```
services/gateway/
├── src/
│   ├── index.ts                    # Entry point + business logic mescolati
│   ├── config.ts                   # Feature flags
│   ├── domain/                     # Business logic pura
│   ├── application/                # Use cases + Ports
│   └── infrastructure/             # Adapters (Keycloak, Prometheus)
└── watt.json                       # Platformatic config
```

**Problema identificato**: Nonostante l'architettura esagonale interna al gateway, **tutta la logica è dentro un service**, non estratta in un package riutilizzabile.

### Motivazioni della Domanda

1. **Coerenza con packages/auth**: Il package auth è strutturato come libreria riusabile con plugin Fastify esportato
2. **VISION progetto**: Domain-agnostic gateway (healthcare, legal, education) suggerisce core neutro
3. **Testabilità**: Business logic testabile senza avviare Fastify/Platformatic
4. **Riuso didattico**: Il corso potrebbe mostrare stesso core con adapter diversi (Prometheus vs StatsD)

---

## Decision

**Manteniamo struttura attuale (gateway come service)**, ma **documentiamo quando e come estrarre package** seguendo **approccio incrementale YAGNI-driven**.

### Principi guida:

1. **Rule of Three**: Estrai package quando hai **3 consumatori** o **3 motivi validi** (non ipotetici)
2. **No premature abstraction**: Duplic > Bad abstraction (evita over-engineering)
3. **Feature-driven refactoring**: Estrai quando una feature lo richiede naturalmente
4. **Gradual extraction**: Estrai moduli piccoli, non big-bang refactoring

---

## Rationale

### Analisi Pro/Contro

#### Approccio Attuale (Gateway come Service Monolitico)

| ✅ Pro                                    | ❌ Contro                                    |
| ----------------------------------------- | -------------------------------------------- |
| Semplicità iniziale (meno file)           | Viola DRY se serve secondo gateway           |
| Deploy diretto senza build intermedi      | Business logic accoppiata all'infrastruttura |
| Meno indirezione (debugging più semplice) | Non testabile in isolamento dal framework    |
| Adatto a team piccolo/singolo             | Difficile estrarre logica per altri progetti |
| Zero over-engineering (rispetta YAGNI)    | Config duplicata se multi-gateway            |

#### Approccio Esagonale (Gateway-Core come Package)

| ✅ Pro                               | ❌ Contro                                   |
| ------------------------------------ | ------------------------------------------- |
| Business logic riusabile             | Più file e indirezione                      |
| Testabile senza Fastify/Platformatic | Build step aggiuntivo                       |
| Sostituibilità adapter (SOLID - DIP) | Over-engineering se non serve riuso         |
| Chiara separazione responsabilità    | Curva apprendimento per contributor         |
| Coerenza con packages/auth           | Premature abstraction se non hai 3 use case |

### Quando Ha Senso Estrarre Package

Applica **Rule of Three** - estrai quando hai **almeno uno** dei seguenti:

#### 1. **Riuso Concreto** (non ipotetico):

- ✅ Secondo gateway (gateway-public, gateway-internal)
- ✅ Gateway per dominio diverso (legal-gateway, education-gateway)
- ❌ "Potremmo averne bisogno in futuro" (YAGNI violation)

#### 2. **Testabilità Critica**:

- ✅ Business logic complessa che richiede test isolati
- ✅ Test senza dependency esterne (Fastify, Redis, Keycloak)
- ❌ Test E2E sufficienti per use case attuali

#### 3. **Sostituibilità Adapter**:

- ✅ Vuoi supportare Prometheus **E** StatsD
- ✅ Vuoi supportare Pino **E** Winston
- ❌ Un solo adapter per port (premature abstraction)

#### 4. **Scopo Didattico**:

- ✅ Il corso mostra "come costruire gateway riusabile"
- ✅ Esempi con adapter multipli per stesso port
- ❌ Solo per "bellezza architetturale"

---

## Proposed Refactoring Path

### Fase 1: Estrai Config (IMMEDIATE - già parzialmente fatto)

**Trigger**: Feature flags già condivise tra package auth e service gateway

```
packages/gateway-core/
└── src/
    ├── config/
    │   ├── feature-flags.ts       # ← GatewayFeatureFlags interface
    │   └── defaults.ts            # ← Default config values
    └── index.ts                   # ← export { GatewayFeatureFlags }
```

**Beneficio**: Evita duplicazione config tra service gateway e futuri service

---

### Fase 2: Estrai Domain Layer (WHEN: Secondo Gateway o Test Isolation)

**Trigger**: Quando crei `services/gateway-internal/` o vuoi testare health check senza Fastify

```
packages/gateway-core/
└── src/
    ├── domain/
    │   ├── entities/
    │   │   └── gateway-context.entity.ts    # ← Già esiste in gateway
    │   ├── services/
    │   │   ├── health.service.ts            # ← Business logic health check
    │   │   └── feature-manager.service.ts   # ← Già esiste in gateway
    │   └── index.ts
    └── index.ts                              # ← export { HealthService, ... }
```

**Beneficio**: Domain logic testabile senza infrastructure

---

### Fase 3: Estrai Application Layer (WHEN: Multi-Gateway con Logic Condivisa)

**Trigger**: `gateway-public` e `gateway-internal` condividono use case ma con adapter diversi

```
packages/gateway-core/
└── src/
    ├── application/
    │   ├── ports/
    │   │   ├── auth-provider.port.ts        # ← Già esiste in gateway
    │   │   ├── metrics-collector.port.ts    # ← Già esiste in gateway
    │   │   ├── cache-provider.port.ts       # ← Pianificato Epic 5
    │   │   └── rate-limiter.port.ts         # ← Pianificato Epic 7
    │   ├── use-cases/
    │   │   └── compose-gateway.use-case.ts  # ← Già esiste in gateway
    │   └── index.ts
    └── index.ts                              # ← export { ComposeGatewayUseCase, ... }
```

**Beneficio**: Use case condivisi, adapter sostituibili

---

### Fase 4: Esporta Fastify Plugin (WHEN: Package Completo)

**Trigger**: Quando Fase 1-3 completate E hai almeno 2 consumatori

```typescript
// packages/gateway-core/src/index.ts
import type { FastifyPluginAsync } from 'fastify';
import type { AuthProviderPort } from './application/ports/auth-provider.port';
import type { MetricsCollectorPort } from './application/ports/metrics-collector.port';

export interface GatewayPluginOptions {
  authProvider: AuthProviderPort;
  metricsCollector: MetricsCollectorPort;
  // ... altri ports
}

export const gatewayPlugin: FastifyPluginAsync<GatewayPluginOptions> = async (
  app,
  opts,
) => {
  // Registra use case, routes, hooks
  const composeUseCase = new ComposeGatewayUseCase({
    authProvider: opts.authProvider,
    metricsCollector: opts.metricsCollector,
  });

  await composeUseCase.execute(app);
};

export default gatewayPlugin;
```

**Consumo nel service**:

```typescript
// services/gateway/src/index.ts
import Fastify from 'fastify';
import gatewayPlugin from '@tech-citizen/gateway-core';
import { KeycloakAuthAdapter } from './infrastructure/adapters/keycloak-auth.adapter';
import { PrometheusMetricsAdapter } from './infrastructure/adapters/prometheus-metrics.adapter';

const app = Fastify();

await app.register(gatewayPlugin, {
  authProvider: new KeycloakAuthAdapter(/* config */),
  metricsCollector: new PrometheusMetricsAdapter(),
});

await app.listen({ port: 3000 });
```

---

## Architecture Diagram

### Current State (Fase 0 - Monolith Service)

```
┌─────────────────────────────────────────────────────────────┐
│                   services/gateway                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   DOMAIN LAYER                        │  │
│  │  GatewayContext | HealthService | FeatureManager     │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                APPLICATION LAYER                      │  │
│  │  Ports (Auth, Metrics) | ComposeGatewayUseCase       │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              INFRASTRUCTURE LAYER                     │  │
│  │  KeycloakAdapter | PrometheusAdapter | Fastify       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Target State (Fase 4 - Package + Services)

```
┌─────────────────────────────────────────────────────────────┐
│              packages/gateway-core                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   DOMAIN LAYER                        │  │
│  │  GatewayContext | HealthService | FeatureManager     │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                APPLICATION LAYER                      │  │
│  │  Ports (Auth, Metrics, Cache, RateLimit)             │  │
│  │  ComposeGatewayUseCase                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  export { gatewayPlugin, GatewayPluginOptions }             │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
┌─────────────────────┐   ┌─────────────────────┐
│ services/gateway    │   │ services/gateway-   │
│     (public)        │   │     internal        │
│  ┌───────────────┐  │   │  ┌───────────────┐  │
│  │ INFRASTRUCTURE│  │   │  │ INFRASTRUCTURE│  │
│  │               │  │   │  │               │  │
│  │ Keycloak      │  │   │  │ NoopAuth      │  │
│  │ Prometheus    │  │   │  │ StatsD        │  │
│  │ Redis         │  │   │  │ InMemory      │  │
│  └───────────────┘  │   │  └───────────────┘  │
└─────────────────────┘   └─────────────────────┘
```

---

## Consequences

### Positive

1. **YAGNI Compliance**: Non estraiamo package finché non serve realmente
2. **Pragmatismo**: Struttura attuale semplice supporta sviluppo veloce
3. **Roadmap Chiara**: Quando estrarre package è documentato (trigger conditions)
4. **Backward Compatible**: Refactoring incrementale non rompe codice esistente
5. **Educational Value**: ADR mostra WHEN e WHY estrarre package (anti-pattern: premature abstraction)

### Negative

1. **Technical Debt Temporaneo**: Business logic accoppiata a infrastructure (accettabile fino a Fase 2)
2. **Duplicazione Potenziale**: Se creiamo secondo gateway prima di Fase 3, duplicheremo use case
3. **Commitment Required**: Team deve seguire roadmap ed evitare refactoring speculativo

### Neutral

1. **Coerenza con Auth**: Quando estrarremo package, sarà coerente con `packages/auth`
2. **Test Strategy**: Test E2E attuali sufficienti, unit test isolati quando Fase 2
3. **Build Complexity**: Aumenterà con package extraction, ma gestibile con Watt

---

## Validation

### Checklist Pre-Extraction (Prima di Fase 2)

Prima di estrarre `packages/gateway-core`, verifica:

- [ ] **Riuso concreto**: Hai almeno 2 service che condividono logica gateway?
- [ ] **Adapter multipli**: Hai almeno 2 implementazioni per stesso port (es. Prometheus + StatsD)?
- [ ] **Test isolation**: Hai business logic che richiede test senza Fastify?
- [ ] **Team buy-in**: Team comprende benefici vs complexity trade-off?
- [ ] **Build setup**: Hai configurato build pipeline per package (tsconfig, esbuild)?

Se **meno di 3 checklist** soddisfatte → **NON estrarre package** (YAGNI)

---

## Examples

### Esempio 1: Quando NON Estrarre (YAGNI Violation)

**Scenario**: "Potremmo avere un gateway-internal in futuro, estraiamo ora"

**Problema**:

- Non hai requirements concreti per gateway-internal
- Non sai se avrà logica condivisa con gateway-public
- Rischio premature abstraction (wrong boundaries)

**Decisione**: ❌ **NON estrarre** - aspetta requirements concreti

---

### Esempio 2: Quando Estrarre (Riuso Concreto)

**Scenario**: "Stiamo creando legal-gateway e education-gateway, condividono health check + routing logic"

**Trigger**:

- ✅ 3 gateway (healthcare, legal, education)
- ✅ Logica condivisa identificata (health, routing)
- ✅ Adapter diversi per dominio (Keycloak legal vs education)

**Decisione**: ✅ **Estrai package** - Fase 2+3 appropriate

---

### Esempio 3: Quando Estrarre Parzialmente (Config Only)

**Scenario**: "gateway-internal ha feature flags diverse ma stessa struttura"

**Trigger**:

- ✅ Duplicazione config già presente
- ❌ Logica business non ancora condivisa
- ❌ Solo 2 gateway (non 3)

**Decisione**: ✅ **Estrai solo config** (Fase 1) - aspetta Fase 2

---

## Alternatives Considered

### Alternative 1: Extract Package Immediately

**Rejected because**:

- Viola YAGNI (no concrete reuse case yet)
- Aumenta complexity senza benefici misurabili
- Rischio wrong abstraction boundaries
- Over-engineering per single service

**When reconsider**: Quando hai almeno 2 consumatori concreti

---

### Alternative 2: Keep Monolith Forever

**Rejected because**:

- Viola project VISION (domain-agnostic gateway)
- Ostacola test isolation per business logic complessa
- Incoerente con packages/auth approach
- Limita riuso didattico nel corso

**When reconsider**: Se progetto rimane single-domain con single gateway

---

### Alternative 3: Extract Only Domain Layer

**Partially Accepted** (Fase 2):

- Domain entities/services estratti quando serve test isolation
- Application/Infrastructure rimangono in service
- Compromesso tra YAGNI e testability

**Trade-off**: Meno riuso di Alternative 1, ma evita over-engineering

---

## Implementation Notes

### Migration Strategy (Quando Eseguire Fase 2+)

1. **Create package skeleton**:

   ```bash
   mkdir -p packages/gateway-core/src/{domain,application,infrastructure}
   npm init -w packages/gateway-core
   ```

2. **Move domain layer** (copy, don't move yet):

   ```bash
   cp -r services/gateway/src/domain/* packages/gateway-core/src/domain/
   ```

3. **Update imports in gateway service**:

   ```typescript
   // services/gateway/src/application/use-cases/compose-gateway.use-case.ts
   - import { GatewayContextEntity } from '../../domain/entities/gateway-context.entity';
   + import { GatewayContextEntity } from '@tech-citizen/gateway-core';
   ```

4. **Run tests** (ensure no regressions):

   ```bash
   npm run test          # Unit tests
   npm run test:e2e      # E2E tests
   ```

5. **Remove duplicated code** (after verification):

   ```bash
   rm -rf services/gateway/src/domain/
   ```

6. **Update tsconfig.json** paths:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@tech-citizen/gateway-core": ["packages/gateway-core/src"]
       }
     }
   }
   ```

### Testing Strategy Post-Extraction

```typescript
// packages/gateway-core/test/domain/health.service.test.ts
import { test } from 'tap';
import { HealthService } from '../../src/domain/services/health.service';

test('HealthService - returns healthy status', async t => {
  const service = new HealthService();
  const result = await service.check();

  t.equal(result.status, 'healthy');
  t.ok(result.timestamp);
  // NO Fastify, NO Redis, NO Keycloak - pure business logic
});
```

---

## References

### Internal Documents

- [ADR-001: Gateway Composability with Feature Flags](./ADR-001-gateway-composability-feature-flags.md)
- [ADR-002: Hexagonal Architecture for Auth Package](./ADR-002-hexagonal-architecture-auth-package.md)
- [ADR-003: Gateway Hexagonal Composition](./ADR-003-gateway-hexagonal-composition.md)
- [Project Roadmap](../../project/ROADMAP.md) - Epic 3: Platformatic Watt Core

### External Resources

- [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/)
- [Rule of Three (Martin Fowler)](https://wiki.c2.com/?RuleOfThree)
- [YAGNI Principle](https://martinfowler.com/bliki/Yagni.html)
- [Premature Abstraction (Sandi Metz)](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction)
- [Monorepo Structure (Nx)](https://nx.dev/concepts/more-concepts/applications-and-libraries)

---

## Decision Log

| Date       | Decision                               | Rationale                           |
| ---------- | -------------------------------------- | ----------------------------------- |
| 2025-12-13 | Keep gateway as service (Fase 0)       | No concrete reuse case (YAGNI)      |
| 2025-12-13 | Document extraction roadmap (Fase 1-4) | Clear trigger conditions            |
| TBD        | Extract config only (Fase 1)           | When feature flags duplicated       |
| TBD        | Extract domain layer (Fase 2)          | When test isolation required        |
| TBD        | Extract application layer (Fase 3)     | When 2nd gateway with shared logic  |
| TBD        | Export Fastify plugin (Fase 4)         | When 3 consumers or 3 valid reasons |

---

## Notes

- **Educational Context**: Questo ADR serve anche come materiale didattico per il corso, mostrando WHEN/WHY estrarre package (non solo HOW)
- **Anti-Pattern Awareness**: Documentiamo esplicitamente il rischio di premature abstraction
- **Pragmatism over Purity**: Architettura perfetta è quella che risponde a bisogni reali, non teorici
- **Revisit Trigger**: Riesamina questo ADR quando crei secondo service che potrebbe condividere logica gateway

---

**Last Updated**: 2025-12-13  
**Next Review**: Quando si inizia sviluppo di secondo gateway o Epic 5 (cache layer)
