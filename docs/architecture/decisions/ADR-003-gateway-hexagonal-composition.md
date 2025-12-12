# ADR-003: Gateway Hexagonal Architecture with Dynamic Composition

**Status**: Accepted  
**Date**: 2025-12-12  
**Decision Makers**: Antonio Cittadino  
**Tags**: architecture, gateway, feature-flags, composition, domain-driven-design

---

## Context

Il servizio Gateway deve supportare scenari di deployment eterogenei:

1. **Minimal Mode**: Gateway standalone senza Redis, Keycloak, Prometheus (sviluppo locale)
2. **Partial Mode**: Gateway con subset di feature (staging con auth ma senza telemetry)
3. **Full Mode**: Gateway con auth + telemetry + cache + rate limiting (produzione)

L'implementazione precedente accoppiava strettamente il gateway ai servizi esterni:

```typescript
// ❌ Problema: dipendenze hardcoded
import { createAuth } from '@tech-citizen/auth';
import { register } from 'prom-client';

// Gateway sempre richiede Redis + Keycloak + Prometheus
await app.register(createAuth, { keycloakUrl, redisUrl });
app.get('/metrics', async () => register.metrics());
```

**Conseguenze**:

- Impossibile avviare gateway senza infrastruttura completa
- Test integration richiedono sempre Keycloak + Redis containers
- Sviluppatori bloccati da dipendenze esterne durante refactoring

**Requisito**: Gateway deve operare in modalità degradata con Noop adapters quando feature flags sono disabilitati.

---

## Decision

Adottiamo l'**architettura esagonale** (Ports & Adapters) per il Gateway Service, strutturando il codice in tre layer concentrici:

### Layer 1: Domain (Core Business Logic)

**Responsabilità**: Business logic pura, zero dipendenze esterne

```
services/gateway/src/domain/
├── entities/
│   └── gateway-context.entity.ts      # Request metadata (correlationId, timing)
└── services/
    └── feature-manager.service.ts     # Feature flag decision logic
```

**Dettagli**:

#### `GatewayContextEntity`

```typescript
export class GatewayContextEntity {
  constructor(
    public readonly requestId: string, // UUID v4 correlation ID
    public readonly startTime: number, // Unix timestamp ms
    public readonly method: string, // HTTP method
    public readonly url: string, // Request URL
  ) {}

  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  static generateRequestId(): string {
    return crypto.randomUUID(); // Standard UUID v4
  }
}
```

**Test Coverage**: 19 test unitari (UUID format, validation, immutability)

#### `FeatureManagerService`

```typescript
export class FeatureManagerService {
  shouldEnableAuth(features: FeatureFlags, keycloakUrl?: string): boolean {
    return features.auth === true && !!keycloakUrl;
  }

  shouldEnableTelemetry(features: FeatureFlags): boolean {
    return features.telemetry === true;
  }

  shouldEnableCache(features: FeatureFlags, redisUrl?: string): boolean {
    return features.cache === true && !!redisUrl;
  }

  shouldEnableRateLimit(features: FeatureFlags): boolean {
    return features.rateLimit === true;
  }

  isMinimalMode(features: FeatureFlags): boolean {
    return (
      !this.shouldEnableAuth(features) &&
      !this.shouldEnableTelemetry(features) &&
      !this.shouldEnableCache(features)
    );
  }
}
```

**Business Rules**:

- Auth richiede `features.auth=true` + Keycloak URL valido
- Cache richiede `features.cache=true` + Redis URL valido
- Telemetry/RateLimit solo flag booleano
- Minimal mode = tutte feature disabilitate

**Test Coverage**: 21 test unitari (logic decisionale pura)

---

### Layer 2: Application (Ports & Use Cases)

**Responsabilità**: Orchestrazione + Contratti (interfacce TypeScript)

```
services/gateway/src/application/
├── ports/
│   ├── auth-provider.port.ts          # Interface: register(), isEnabled()
│   ├── metrics-collector.port.ts      # Interface: recordRequest(), isEnabled()
│   └── cache-provider.port.ts         # Interface: get(), set(), isEnabled()
└── use-cases/
    └── compose-gateway.use-case.ts    # Orchestration: setup hooks + routes
```

**Dettagli**:

#### Ports (Interfaces)

```typescript
// auth-provider.port.ts
export interface AuthProviderPort {
  register(fastify: FastifyInstance): Promise<void>;
  isEnabled(): boolean;
  getProviderName(): string;
}

// metrics-collector.port.ts
export interface MetricsCollectorPort {
  register(fastify: FastifyInstance): Promise<void>;
  recordRequest(context: GatewayContextEntity, statusCode: number): void;
  isEnabled(): boolean;
  getCollectorName(): string;
}

// cache-provider.port.ts (future implementation)
export interface CacheProviderPort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
  isEnabled(): boolean;
}
```

**Design Principle**: Ports definiscono **cosa serve** al Domain, non **come** è implementato.

#### ComposeGatewayUseCase

```typescript
export class ComposeGatewayUseCase {
  constructor(
    private readonly config: {
      authProvider: AuthProviderPort;
      metricsCollector: MetricsCollectorPort;
    },
  ) {}

  async execute(app: FastifyInstance): Promise<void> {
    // 1. Setup hooks (correlation ID, metrics)
    this.setupHooks(app);

    // 2. Register adapters
    if (this.config.authProvider.isEnabled()) {
      await this.config.authProvider.register(app);
    }

    if (this.config.metricsCollector.isEnabled()) {
      await this.config.metricsCollector.register(app);
    }

    // 3. Register routes (health check, info)
    this.registerRoutes(app);
  }

  private setupHooks(app: FastifyInstance): void {
    // onRequest: generate correlation ID
    app.addHook('onRequest', async (request, _reply) => {
      const context = new GatewayContextEntity(
        GatewayContextEntity.generateRequestId(),
        Date.now(),
        request.method,
        request.url,
      );
      request.gatewayContext = context;
    });

    // onResponse: record metrics if enabled
    app.addHook('onResponse', async (request, reply) => {
      if (this.config.metricsCollector.isEnabled()) {
        this.config.metricsCollector.recordRequest(
          request.gatewayContext,
          reply.statusCode,
        );
      }
    });
  }
}
```

**Test Coverage**: 22 test unitari con mock adapters (orchestrazione, hooks, minimal mode)

---

### Layer 3: Infrastructure (Adapters)

**Responsabilità**: Implementazioni concrete delle Ports

```
services/gateway/src/infrastructure/
└── adapters/
    ├── keycloak-auth.adapter.ts        # AuthProviderPort → @tech-citizen/auth
    ├── noop-auth.adapter.ts            # AuthProviderPort → No-op (allow all)
    ├── prometheus-metrics.adapter.ts   # MetricsCollectorPort → prom-client
    └── noop-metrics.adapter.ts         # MetricsCollectorPort → No-op
```

**Dettagli**:

#### KeycloakAuthAdapter (Real Implementation)

```typescript
export class KeycloakAuthAdapter implements AuthProviderPort {
  constructor(private readonly config: GatewayConfig) {}

  async register(fastify: FastifyInstance): Promise<void> {
    const { createAuth } = await import('@tech-citizen/auth');
    await fastify.register(createAuth, {
      keycloakUrl: this.config.keycloakUrl,
      realm: this.config.keycloakRealm,
      clientId: this.config.keycloakClientId,
      clientSecret: this.config.keycloakClientSecret,
      redisUrl: this.config.redisUrl,
    });
  }

  isEnabled(): boolean {
    return true;
  }

  getProviderName(): string {
    return 'Keycloak OIDC';
  }
}
```

#### NoopAuthAdapter (Minimal Mode)

```typescript
export class NoopAuthAdapter implements AuthProviderPort {
  async register(_fastify: FastifyInstance): Promise<void> {
    // No-op: no routes registered, no middleware
  }

  isEnabled(): boolean {
    return false;
  }

  getProviderName(): string {
    return 'Noop (disabled)';
  }
}
```

#### PrometheusMetricsAdapter (Real Implementation)

```typescript
// Singleton pattern: avoid duplicate metric registration
let httpRequestDuration: Histogram<string> | null = null;

function initializeMetrics(): void {
  if (httpRequestDuration) return; // Already initialized

  httpRequestDuration = new Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status'],
    buckets: [10, 50, 100, 300, 500, 1000, 3000],
  });
}

export class PrometheusMetricsAdapter implements MetricsCollectorPort {
  constructor() {
    initializeMetrics();
  }

  async register(fastify: FastifyInstance): Promise<void> {
    fastify.get('/metrics', async () => {
      return register.metrics();
    });
  }

  recordRequest(context: GatewayContextEntity, statusCode: number): void {
    httpRequestDuration!.observe(
      {
        method: context.method,
        route: context.url,
        status: statusCode.toString(),
      },
      context.getElapsedTime(),
    );
  }

  isEnabled(): boolean {
    return true;
  }

  getCollectorName(): string {
    return 'Prometheus';
  }
}
```

**Note**: Singleton pattern risolve errore "metric already registered" nei test integration.

#### NoopMetricsAdapter (Minimal Mode)

```typescript
export class NoopMetricsAdapter implements MetricsCollectorPort {
  async register(_fastify: FastifyInstance): Promise<void> {
    // No-op: no /metrics route
  }

  recordRequest(_context: GatewayContextEntity, _statusCode: number): void {
    // No-op: zero overhead
  }

  isEnabled(): boolean {
    return false;
  }

  getCollectorName(): string {
    return 'Noop (disabled)';
  }
}
```

---

### Dynamic Composition (Factory Pattern)

**Responsabilità**: Selezionare adapter corretto a runtime basato su feature flags

```typescript
// services/gateway/src/index.ts

function createAuthAdapter(config: GatewayConfig): AuthProviderPort {
  const featureManager = new FeatureManagerService();

  if (featureManager.shouldEnableAuth(config.features, config.keycloakUrl)) {
    return new KeycloakAuthAdapter(config);
  }

  return new NoopAuthAdapter();
}

function createMetricsAdapter(config: GatewayConfig): MetricsCollectorPort {
  const featureManager = new FeatureManagerService();

  if (featureManager.shouldEnableTelemetry(config.features)) {
    return new PrometheusMetricsAdapter();
  }

  return new NoopMetricsAdapter();
}

// Orchestration
export default async function gateway(
  app: FastifyInstance,
  opts: FastifyPluginOptions,
) {
  const config = opts as GatewayConfig;

  // Factory: select adapters at runtime
  const authAdapter = createAuthAdapter(config);
  const metricsAdapter = createMetricsAdapter(config);

  // Use Case: orchestrate setup
  const composeGateway = new ComposeGatewayUseCase({
    authProvider: authAdapter,
    metricsCollector: metricsAdapter,
  });

  await composeGateway.execute(app);
}
```

---

## Consequences

### ✅ Positive

1. **Minimal Mode Supportato**
   - Gateway funziona senza Redis/Keycloak usando Noop adapters
   - Sviluppo locale senza Docker: `npm run dev` (0 dipendenze esterne)
   - Unit test in ~1s (244 test), no infrastructure

2. **Testabilità Estrema**

   ```typescript
   // Unit test use case con mock adapters
   const mockAuth = { register: t.mock.fn(), isEnabled: () => true };
   const mockMetrics = {
     register: t.mock.fn(),
     recordRequest: t.mock.fn(),
     isEnabled: () => true,
   };

   const useCase = new ComposeGatewayUseCase({
     authProvider: mockAuth,
     metricsCollector: mockMetrics,
   });

   await useCase.execute(app);
   // ✅ Zero dipendenze esterne, test in millisecondi
   ```

3. **Sostituibilità**
   - Cambiare Keycloak → Auth0: implementare nuovo adapter, zero touch Domain
   - Cambiare Prometheus → OpenTelemetry: implementare nuovo adapter, zero touch Use Case
   - Esempio: `Auth0Adapter implements AuthProviderPort`

4. **Deployment Flessibile**

   ```yaml
   # Development
   features:
     auth: false
     telemetry: false
   # Result: Noop adapters, gateway in modalità minimal

   # Staging
   features:
     auth: true
     telemetry: false
   # Result: Keycloak + Noop metrics

   # Production
   features:
     auth: true
     telemetry: true
   # Result: Keycloak + Prometheus
   ```

5. **Business Logic Isolata**
   - `FeatureManagerService`: testabile senza Fastify (21 test)
   - `GatewayContextEntity`: testabile senza HTTP (19 test)
   - Refactoring sicuro: cambi infrastruttura non toccano Domain

6. **Correlation ID Standard**
   - UUID v4 (`crypto.randomUUID()`) invece di timestamp-random custom
   - Formato: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`
   - Compatibile con OpenTelemetry trace IDs

### ⚠️ Negative

1. **Indirezione (più file)**
   - Prima: 1 file `index.ts` (~200 righe)
   - Dopo: 14 file (domain/application/infrastructure) (~600 righe totali)
   - Tradeoff: complessità accidentale vs complessità essenziale gestita

2. **Curva di Apprendimento**
   - Sviluppatori junior devono capire Ports & Adapters
   - Mitigazione: ADR + commenti + esempi concreti

3. **Overhead Iniziale**
   - Setup use case + factory functions + adapters (~2h implementazione)
   - ROI: risparmio tempo in test + refactoring futuro

4. **Singleton Metrics Obbligatorio**
   - Prometheus client non supporta registrazione multipla
   - Soluzione: `initializeMetrics()` con guard, metrics a livello modulo
   - Limitazione: un solo PrometheusAdapter per processo Node.js

---

## Alternatives Considered

### ❌ Option A: Feature Flags Inline

```typescript
export default async function gateway(app, opts) {
  if (opts.features.auth) {
    await app.register(createAuth, { keycloakUrl: opts.keycloakUrl });
  }

  if (opts.features.telemetry) {
    app.get('/metrics', () => register.metrics());
  }
}
```

**Pro**: Semplice, un file solo  
**Contro**:

- Business logic accoppiata a Fastify (non testabile in isolamento)
- Impossibile sostituire adapter senza toccare gateway core
- Test richiedono mock complessi di Fastify plugin system

### ❌ Option B: Service Locator Pattern

```typescript
const serviceRegistry = {
  auth: features.auth ? new KeycloakAuth() : new NoopAuth(),
  metrics: features.telemetry ? new PrometheusMetrics() : new NoopMetrics(),
};

export default async function gateway(app, opts) {
  const auth = serviceRegistry.auth;
  const metrics = serviceRegistry.metrics;
  // ...
}
```

**Pro**: Centralizzato, facile lookup  
**Contro**:

- Service Locator è anti-pattern (dipendenze nascoste, no compile-time check)
- Test devono mockare registry globale
- TypeScript non inferisce tipi correttamente

### ✅ Option C: Hexagonal Architecture (CHOSEN)

**Pro**:

- Domain testabile in isolamento (0 mock)
- Use Case orchestrazione esplicita (dependency injection)
- Factory pattern: selezione runtime trasparente
- Sostituibilità: nuovo adapter = nuova classe, zero touch core

**Contro**:

- Più file (14 vs 1)
- Indirezione (ports + adapters)

**Rationale**: Tradeoff accettabile per testabilità + flessibilità deployment.

---

## Implementation Notes

### Test Coverage

- **Unit Tests**: 244 passing (domain: 40, use case: 22, adapters: 182)
- **Integration Tests**: 73 passing (real Redis + Keycloak via Testcontainers)
- **E2E Tests**: 0/9 implemented (Gherkin scenarios ready)

### Test Strategy

```typescript
// Unit: Domain + Use Case (0 infrastructure)
test('FeatureManagerService should detect minimal mode', t => {
  const service = new FeatureManagerService();
  const features = { auth: false, telemetry: false, cache: false };

  t.equal(service.isMinimalMode(features), true);
  t.end();
});

// Integration: Real adapters + infrastructure
test('Gateway with auth=true should expose /auth/login', async t => {
  const { keycloak, redis } = await startTestContainers();

  const app = await buildGateway({
    features: { auth: true, telemetry: false },
    keycloakUrl: keycloak.getUrl(),
    redisUrl: redis.getUrl(),
  });

  const response = await app.inject({ method: 'GET', url: '/auth/login' });
  t.equal(response.statusCode, 302); // Redirect to Keycloak
});
```

### Commit History

- **e99d942**: `refactor(gateway): apply hexagonal architecture with dynamic composition`
  - 16 files changed (+1488/-160)
  - Domain: GatewayContextEntity + FeatureManagerService
  - Application: 3 Ports + ComposeGatewayUseCase
  - Infrastructure: 4 Adapters (2 real + 2 noop)
  - Tests: 62 new unit tests (domain + use case)

### Migration Path

**Before** (Tightly Coupled):

```typescript
export default async function gateway(app, opts) {
  const { createAuth } = await import('@tech-citizen/auth');
  await app.register(createAuth, { keycloakUrl: opts.keycloakUrl });

  app.get('/metrics', async () => register.metrics());
}
```

**After** (Hexagonal):

```typescript
export default async function gateway(app, opts) {
  const authAdapter = createAuthAdapter(opts);
  const metricsAdapter = createMetricsAdapter(opts);

  const useCase = new ComposeGatewayUseCase({
    authProvider: authAdapter,
    metricsCollector: metricsAdapter,
  });

  await useCase.execute(app);
}
```

---

## Related ADRs

- **ADR-001**: Gateway Composability with Feature Flags (foundation)
- **ADR-002**: Hexagonal Architecture for Auth Package (pattern precedent)
- **ADR-004**: Simplified Environment Strategy (deployment scenarios)

---

## References

- [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/)
- [Ports & Adapters Pattern](https://herbertograca.com/2017/09/14/ports-adapters-architecture/)
- [Feature Toggle (Martin Fowler)](https://martinfowler.com/articles/feature-toggles.html)
- [Platformatic Watt 3.0 Documentation](https://docs.platformatic.dev/watt)

---

**Last Updated**: 2025-12-12  
**Implemented**: Commit e99d942  
**Next Steps**: E2E tests implementation (9 Gherkin scenarios ready)
