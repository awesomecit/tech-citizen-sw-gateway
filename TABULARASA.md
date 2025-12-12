# Tech Citizen SW Gateway - Reset Test & CI/CD

**Documento di Contesto per AI Assistant**  
**Versione**: 1.0.0  
**Data**: 2025-12-12  
**Progetto**: tech-citizen-sw-gateway  
**Repository**: github.com/awesomecit/tech-citizen-sw-gateway

---

## Indice

1. [Contesto Progetto](#1-contesto-progetto)
2. [Stato Attuale e Problemi](#2-stato-attuale-e-problemi)
3. [Principi Guida](#3-principi-guida)
4. [Architettura Esagonale: Linee Guida per Refactoring](#4-architettura-esagonale-linee-guida-per-refactoring)
5. [EPIC-008: Test Architecture Reset](#5-epic-014-test-architecture-reset)
6. [EPIC-009: Woodpecker CI Setup](#6-epic-015-woodpecker-ci-setup)
7. [Naming Conventions](#7-naming-conventions)
8. [File da Creare/Modificare](#8-file-da-crearemodificare)
9. [Acceptance Criteria Eseguibili](#9-acceptance-criteria-eseguibili)

---

## 1. Contesto Progetto

### 1.1 Descrizione

Tech Citizen SW Gateway è un API Gateway enterprise per software healthcare, costruito con:

- **Runtime**: Node.js 22+, TypeScript 5.7+
- **Framework**: Fastify 5.x orchestrato da Platformatic Watt 3.x
- **Auth**: Keycloak 23.0 (OIDC/PKCE) + Redis sessions
- **Infra**: Docker Compose, Caddy reverse proxy
- **Monitoring**: Prometheus + Grafana
- **Database**: PostgreSQL 16 (futuro), Redis 7 (sessions/cache)

### 1.2 Struttura Monorepo

```
tech-citizen-sw-gateway/
├── services/
│   └── gateway/              # API Gateway principale (Fastify)
├── packages/
│   ├── auth/                 # Plugin autenticazione (JWT, Keycloak, Sessions)
│   ├── cache/                # Wrapper async-cache-dedupe (placeholder)
│   ├── events/               # RabbitMQ + CloudEvents (placeholder)
│   ├── telemetry/            # OpenTelemetry setup (placeholder)
│   └── test-helpers/         # Utilities per test (esistente, da refactorare)
├── infrastructure/
│   ├── caddy/
│   ├── prometheus/
│   ├── grafana/
│   └── keycloak/
├── ansible/
│   ├── inventory/
│   └── playbooks/
├── e2e/
│   └── features/             # BDD Gherkin scenarios (da riorganizzare)
├── test/                     # Test root level (da rimuovere/riorganizzare)
└── scripts/
```

### 1.3 Vincoli Infrastrutturali

- **Server**: Hetzner CPX32, 8GB RAM totali
- **Workload condiviso**: Keycloak (~1GB), Redis, Postgres, Prometheus, Grafana, Gateway, Caddy
- **RAM disponibile per CI**: ~4-5GB
- **Network**: Egress limitato in alcuni contesti

---

## 2. Stato Attuale e Problemi

### 2.1 Problemi Test Attuali

| Problema                                    | Impatto                                  | File Coinvolti                                                                                           |
| ------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 3+ jest.config.\* sparsi                    | Confusione, configurazioni duplicate     | `jest.config.cjs`, `jest.integration.config.cjs`, `jest.e2e.config.cjs`, `packages/auth/jest.config.cjs` |
| Script bash frammentati                     | Logica duplicata, difficile manutenzione | `scripts/test-infra-start.sh`, `scripts/test-infra-stop.sh`                                              |
| Nessuna separazione chiara unit/integration | Test lenti, flaky                        | `test/`, `packages/*/test/`                                                                              |
| Mock inline ovunque                         | Difficile manutenzione, no riuso         | Sparsi nei file `.spec.ts`                                                                               |
| Testcontainers non utilizzati               | Container manuali, port conflicts        | `docker-compose.test.yml`                                                                                |

### 2.2 Problemi CI/CD Attuali

| Problema                    | Impatto                        |
| --------------------------- | ------------------------------ |
| Nessun CI self-hosted       | Deploy manuali, no automazione |
| Pipeline non definite       | Nessun quality gate automatico |
| Artifact management assente | Build non riproducibili        |

### 2.3 Struttura Test Attuale (da eliminare/riorganizzare)

```
# ATTUALE - Problematico
test/
├── infrastructure.test.ts    # Mix unit + integration
├── setup.ts                  # Setup globale confuso
└── teardown.ts

packages/auth/test/
├── index.spec.ts             # Unit test
├── jwt.spec.ts               # Unit test
├── keycloak.test.ts          # Integration (richiede container)
├── keycloak.integration.spec.ts  # Duplicato?
└── session-manager.spec.ts   # Unit con mock Redis

e2e/
└── features/
    ├── auth-jwt-validation.feature
    └── auth-keycloak-integration.feature

# Config sparsi
jest.config.cjs
jest.integration.config.cjs
jest.e2e.config.cjs
packages/auth/jest.config.cjs
services/gateway/jest.config.cjs
```

---

## 3. Principi Guida

### 3.1 Metodologie

- **YAGNI** (You Aren't Gonna Need It): Implementa solo ciò che serve ora
- **KISS** (Keep It Simple, Stupid): Preferisci soluzioni semplici
- **DRY** (Don't Repeat Yourself): Una sola fonte di verità
- **SOLID**: Single responsibility, Open/closed, Liskov, Interface segregation, Dependency inversion
- **XP** (Extreme Programming): TDD, CI, Small releases, Refactoring
- **Trunk-Based Development**: Branch short-lived, merge frequenti su main
- **DBB** (Documentation by Behavior): Acceptance criteria eseguibili in Gherkin

### 3.2 Test Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    ACCEPTANCE LEVEL                      │
│   BDD (Cucumber/Gherkin)                                │
│   - Feature files in e2e/features/                      │
│   - Step definitions in e2e/steps/                      │
│   - ~10% dei test totali                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  INTEGRATION LEVEL                       │
│   Jest + Testcontainers                                 │
│   - Test adapter/infrastructure                         │
│   - Container reali (Keycloak, Redis, Postgres)         │
│   - ~20% dei test totali                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      UNIT LEVEL                          │
│   Jest + In-memory fakes                                │
│   - Test domain logic pura                              │
│   - Zero dipendenze esterne                             │
│   - ~70% dei test totali                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    SMOKE LEVEL                           │
│   Post-deploy verification                              │
│   - Health checks                                       │
│   - Critical path validation                            │
│   - ~5 test, < 30 secondi                               │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Architettura Esagonale per Test

Il codice esistente NON segue architettura esagonale formale. Per i TEST, applichiamo il pattern "test per boundary" senza refactoring massivo del codice sorgente.

**Approccio Ibrido:**

- Unit test: mock inline o in-memory fakes per dipendenze
- Integration test: Testcontainers per infrastruttura reale
- Nuovi package: struttura esagonale completa (domain/application/infrastructure)
- Package esistenti: migrazione graduale opzionale

---

## 4. Architettura Esagonale: Linee Guida per Refactoring

### 4.1 Cos'è l'Architettura Esagonale (Ports & Adapters)

L'architettura esagonale, ideata da Alistair Cockburn, separa il codice in tre zone concentriche. Al centro c'è il **Domain** (la logica di business pura, senza dipendenze esterne). Intorno al domain c'è l'**Application** (i casi d'uso che orchestrano il domain e definiscono le interfacce "ports" per comunicare con l'esterno). All'esterno c'è l'**Infrastructure** (gli "adapters" che implementano i ports con tecnologie concrete come Redis, Keycloak, HTTP).

```
                    ┌─────────────────────────────────────┐
                    │         INFRASTRUCTURE              │
                    │  (Adapters: Redis, Keycloak, HTTP)  │
                    │                                     │
                    │    ┌───────────────────────────┐    │
                    │    │       APPLICATION         │    │
                    │    │  (Use Cases + Ports)      │    │
                    │    │                           │    │
                    │    │    ┌─────────────────┐    │    │
                    │    │    │     DOMAIN      │    │    │
                    │    │    │  (Pure Logic)   │    │    │
                    │    │    └─────────────────┘    │    │
                    │    │                           │    │
                    │    └───────────────────────────┘    │
                    │                                     │
                    └─────────────────────────────────────┘
```

**Perché è utile per i test?** La separazione permette di testare il domain con semplici unit test (velocissimi, senza mock complessi), testare gli adapter con integration test (container reali), e limitare i test E2E ai flussi critici.

### 4.2 Stato Attuale del Codice (Non Esagonale)

Il codice attuale in `packages/auth/` segue un pattern "plugin monolitico" tipico di Fastify, dove domain logic e infrastructure sono mescolati nello stesso file.

**Esempio problematico da `session-manager.ts`:**

```typescript
// ATTUALE: Dipendenza diretta su Redis (infrastructure leak nel domain)
export class SessionManager {
  private redis: Redis; // ← Accoppiamento diretto a ioredis

  constructor(
    redis: Redis, // ← Riceve implementazione concreta, non interfaccia
    config: Partial<SessionConfig>,
    keycloakConfig: { url: string; clientId: string; clientSecret: string },
  ) {
    this.redis = redis;
    // ...
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = `session:${sessionId}`;
    const data = await this.redis.get(key); // ← Chiamata diretta a Redis
    // ... business logic mescolata con infrastructure
  }
}
```

**Problemi di questo approccio:**

1. Per testare `getSession` devo mockare Redis o usare un container reale
2. La business logic (validazione sessione, refresh token) è accoppiata all'I/O
3. Cambiare da Redis a Memcached richiederebbe modificare la classe

### 4.3 Target: Struttura Esagonale

**Struttura directory per un package esagonale:**

```
packages/auth/
├── src/
│   ├── domain/                      # Logica pura, ZERO dipendenze
│   │   ├── entities/
│   │   │   ├── session.entity.ts    # Entità Session con validazione
│   │   │   ├── user.entity.ts       # Entità User
│   │   │   └── token.entity.ts      # Entità Token con parsing
│   │   ├── services/
│   │   │   ├── session.service.ts   # Logica sessione (no I/O)
│   │   │   └── token.service.ts     # Logica token (no I/O)
│   │   └── errors/
│   │       └── auth.errors.ts       # Custom errors del domain
│   │
│   ├── application/                 # Orchestrazione + Ports
│   │   ├── ports/                   # Interfacce (contratti)
│   │   │   ├── session-repository.port.ts
│   │   │   ├── token-validator.port.ts
│   │   │   └── identity-provider.port.ts
│   │   ├── use-cases/
│   │   │   ├── authenticate-user.use-case.ts
│   │   │   ├── refresh-session.use-case.ts
│   │   │   └── logout-user.use-case.ts
│   │   └── dto/                     # Data Transfer Objects
│   │       ├── auth-request.dto.ts
│   │       └── auth-response.dto.ts
│   │
│   ├── infrastructure/              # Implementazioni concrete
│   │   ├── adapters/
│   │   │   ├── redis-session.adapter.ts      # Implements SessionRepositoryPort
│   │   │   ├── keycloak-identity.adapter.ts  # Implements IdentityProviderPort
│   │   │   └── jwt-token.adapter.ts          # Implements TokenValidatorPort
│   │   ├── http/
│   │   │   └── auth.controller.ts   # Route handlers Fastify
│   │   └── config/
│   │       └── auth.config.ts       # Configuration loading
│   │
│   └── index.ts                     # Plugin Fastify (wiring)
│
└── test/
    ├── unit/                        # Test domain + use cases
    │   ├── domain/
    │   │   └── session.service.spec.ts
    │   └── use-cases/
    │       └── authenticate-user.spec.ts
    ├── integration/                 # Test adapters
    │   ├── redis-session.adapter.spec.ts
    │   └── keycloak-identity.adapter.spec.ts
    └── fakes/                       # In-memory implementations
        ├── in-memory-session.repository.ts
        └── stub-identity.provider.ts
```

### 4.4 Pattern di Refactoring: Da Monolitico a Esagonale

#### Step 1: Estrai le Interfacce (Ports)

Prima di tutto, identifica le dipendenze esterne e crea interfacce per ognuna.

```typescript
// src/application/ports/session-repository.port.ts

/**
 * Port per la persistenza delle sessioni.
 * Astrae il meccanismo di storage (Redis, Memcached, Database, In-Memory).
 */
export interface SessionRepositoryPort {
  /**
   * Recupera una sessione per ID
   * @returns SessionData se esiste, null altrimenti
   */
  get(sessionId: string): Promise<SessionData | null>;

  /**
   * Salva una sessione con TTL
   * @param sessionId - ID univoco della sessione
   * @param data - Dati della sessione
   * @param ttlSeconds - Time-to-live in secondi
   */
  save(sessionId: string, data: SessionData, ttlSeconds: number): Promise<void>;

  /**
   * Elimina una sessione
   * @returns true se esisteva, false altrimenti
   */
  delete(sessionId: string): Promise<boolean>;

  /**
   * Estende il TTL di una sessione esistente
   */
  extendTtl(sessionId: string, ttlSeconds: number): Promise<boolean>;

  /**
   * Ottiene il TTL rimanente
   * @returns secondi rimanenti, -1 se no TTL, -2 se non esiste
   */
  getTtl(sessionId: string): Promise<number>;
}
```

```typescript
// src/application/ports/identity-provider.port.ts

/**
 * Port per l'identity provider (Keycloak, Auth0, Cognito, etc.)
 */
export interface IdentityProviderPort {
  /**
   * Valida un access token e restituisce le claims
   */
  validateToken(accessToken: string): Promise<TokenClaims | null>;

  /**
   * Esegue il refresh di un token
   */
  refreshToken(refreshToken: string): Promise<TokenPair | null>;

  /**
   * Ottiene l'URL di login per OIDC flow
   */
  getAuthorizationUrl(state: string, codeChallenge: string): string;

  /**
   * Scambia authorization code per tokens
   */
  exchangeCode(code: string, codeVerifier: string): Promise<TokenPair>;

  /**
   * Revoca un token (logout)
   */
  revokeToken(refreshToken: string): Promise<void>;
}

export interface TokenClaims {
  sub: string; // Subject (user ID)
  email: string;
  roles: string[];
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  iss: string; // Issuer
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

#### Step 2: Isola il Domain (Logica Pura)

Estrai la business logic in classi/funzioni che dipendono SOLO da altre entità domain e dai ports (interfacce).

```typescript
// src/domain/services/session.service.ts

import { SessionData } from '../entities/session.entity.js';
import {
  SessionExpiredError,
  SessionNotFoundError,
} from '../errors/auth.errors.js';

/**
 * Domain Service per la gestione delle sessioni.
 * NOTA: Questa classe NON ha dipendenze su infrastructure.
 * Riceve i dati già recuperati e restituisce decisioni.
 */
export class SessionService {
  constructor(private readonly config: SessionConfig) {}

  /**
   * Determina se una sessione è valida
   * Logica pura: nessun I/O
   */
  isSessionValid(session: SessionData | null): boolean {
    if (!session) return false;

    const now = Date.now();
    return session.expiresAt > now;
  }

  /**
   * Determina se il token deve essere refreshato
   * (es. scade entro refreshThreshold secondi)
   */
  shouldRefreshToken(session: SessionData): boolean {
    const now = Date.now();
    const timeUntilExpiry = session.expiresAt - now;
    const thresholdMs = this.config.refreshThreshold * 1000;

    return timeUntilExpiry < thresholdMs && timeUntilExpiry > 0;
  }

  /**
   * Determina se estendere il TTL (sliding window)
   */
  shouldExtendSession(session: SessionData, currentTtl: number): boolean {
    if (!this.config.slidingWindowEnabled) return false;

    // Estendi se l'attività è recente (entro threshold)
    const lastActivity = session.lastActivity ?? session.createdAt ?? 0;
    const timeSinceActivity = Date.now() - lastActivity;
    const thresholdMs = this.config.slidingWindowThreshold * 1000;

    return timeSinceActivity < thresholdMs;
  }

  /**
   * Crea una nuova sessione con i dati forniti
   */
  createSession(userId: string, email: string, tokens: TokenPair): SessionData {
    const now = Date.now();
    return {
      userId,
      userType: 'domain',
      email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: now + tokens.expiresIn * 1000,
      createdAt: now,
      lastActivity: now,
    };
  }

  /**
   * Aggiorna una sessione con nuovi token
   */
  updateSessionWithNewTokens(
    session: SessionData,
    tokens: TokenPair,
  ): SessionData {
    return {
      ...session,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
      lastActivity: Date.now(),
    };
  }
}

export interface SessionConfig {
  ttl: number; // Session TTL in seconds
  slidingWindowEnabled: boolean; // Extend on activity?
  slidingWindowThreshold: number; // Activity threshold in seconds
  refreshThreshold: number; // Refresh token if expires within X seconds
}
```

#### Step 3: Crea gli Use Cases (Application Layer)

Gli use cases orchestrano domain services e ports per implementare i flussi applicativi.

```typescript
// src/application/use-cases/get-session.use-case.ts

import { SessionRepositoryPort } from '../ports/session-repository.port.js';
import { IdentityProviderPort } from '../ports/identity-provider.port.js';
import { SessionService } from '../../domain/services/session.service.js';
import { SessionData } from '../../domain/entities/session.entity.js';

/**
 * Use Case: Recupera e valida una sessione
 *
 * Responsabilità:
 * 1. Recupera sessione dal repository
 * 2. Valida che sia ancora attiva
 * 3. Refresh token se necessario
 * 4. Estende TTL se sliding window attivo
 */
export class GetSessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly identityProvider: IdentityProviderPort,
    private readonly sessionService: SessionService,
    private readonly config: { ttl: number },
  ) {}

  async execute(sessionId: string): Promise<SessionData | null> {
    // 1. Recupera dal repository
    const session = await this.sessionRepository.get(sessionId);

    // 2. Valida (logica domain)
    if (!this.sessionService.isSessionValid(session)) {
      if (session) {
        await this.sessionRepository.delete(sessionId);
      }
      return null;
    }

    // 3. Refresh token se necessario (orchestrazione)
    let updatedSession = session!;
    if (this.sessionService.shouldRefreshToken(session!)) {
      const newTokens = await this.identityProvider.refreshToken(
        session!.refreshToken,
      );
      if (newTokens) {
        updatedSession = this.sessionService.updateSessionWithNewTokens(
          session!,
          newTokens,
        );
        await this.sessionRepository.save(
          sessionId,
          updatedSession,
          this.config.ttl,
        );
      }
    }

    // 4. Sliding window
    const currentTtl = await this.sessionRepository.getTtl(sessionId);
    if (this.sessionService.shouldExtendSession(updatedSession, currentTtl)) {
      await this.sessionRepository.extendTtl(sessionId, this.config.ttl);
      updatedSession.lastActivity = Date.now();
    }

    return updatedSession;
  }
}
```

#### Step 4: Implementa gli Adapters (Infrastructure)

Gli adapters implementano i ports con tecnologie concrete.

```typescript
// src/infrastructure/adapters/redis-session.adapter.ts

import type { Redis } from 'ioredis';
import { SessionRepositoryPort } from '../../application/ports/session-repository.port.js';
import { SessionData } from '../../domain/entities/session.entity.js';

/**
 * Adapter Redis per SessionRepositoryPort
 *
 * Questa classe è l'UNICO punto dove ioredis viene usato.
 * Può essere sostituita con MemcachedSessionAdapter, PostgresSessionAdapter, etc.
 */
export class RedisSessionAdapter implements SessionRepositoryPort {
  private readonly keyPrefix = 'session:';

  constructor(private readonly redis: Redis) {}

  async get(sessionId: string): Promise<SessionData | null> {
    const key = this.keyPrefix + sessionId;
    const data = await this.redis.get(key);

    if (!data) return null;

    try {
      return JSON.parse(data) as SessionData;
    } catch {
      // Corrupted data, delete and return null
      await this.redis.del(key);
      return null;
    }
  }

  async save(
    sessionId: string,
    data: SessionData,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.keyPrefix + sessionId;
    await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
  }

  async delete(sessionId: string): Promise<boolean> {
    const key = this.keyPrefix + sessionId;
    const result = await this.redis.del(key);
    return result > 0;
  }

  async extendTtl(sessionId: string, ttlSeconds: number): Promise<boolean> {
    const key = this.keyPrefix + sessionId;
    const result = await this.redis.expire(key, ttlSeconds);
    return result === 1;
  }

  async getTtl(sessionId: string): Promise<number> {
    const key = this.keyPrefix + sessionId;
    return this.redis.ttl(key);
  }
}
```

#### Step 5: Crea i Fake per i Test

Per i test unitari, crea implementazioni in-memory dei ports.

```typescript
// test/fakes/in-memory-session.repository.ts

import { SessionRepositoryPort } from '../../src/application/ports/session-repository.port.js';
import { SessionData } from '../../src/domain/entities/session.entity.js';

/**
 * Fake in-memory per unit testing.
 * NON usa Redis, tutto in memoria.
 */
export class InMemorySessionRepository implements SessionRepositoryPort {
  private store: Map<string, { data: SessionData; expiresAt: number }> =
    new Map();

  async get(sessionId: string): Promise<SessionData | null> {
    const entry = this.store.get(sessionId);
    if (!entry) return null;

    // Simula expiry
    if (Date.now() > entry.expiresAt) {
      this.store.delete(sessionId);
      return null;
    }

    return entry.data;
  }

  async save(
    sessionId: string,
    data: SessionData,
    ttlSeconds: number,
  ): Promise<void> {
    this.store.set(sessionId, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(sessionId: string): Promise<boolean> {
    return this.store.delete(sessionId);
  }

  async extendTtl(sessionId: string, ttlSeconds: number): Promise<boolean> {
    const entry = this.store.get(sessionId);
    if (!entry) return false;

    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    return true;
  }

  async getTtl(sessionId: string): Promise<number> {
    const entry = this.store.get(sessionId);
    if (!entry) return -2;

    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  // Utility per test
  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
```

### 4.5 Strategia di Test per Architettura Esagonale

Con il codice strutturato in modo esagonale, la strategia di test diventa naturale:

```
┌─────────────────────────────────────────────────────────────────┐
│                      TEST STRATEGY                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DOMAIN (Unit Tests - 70%)                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • SessionService.isSessionValid()                        │   │
│  │ • SessionService.shouldRefreshToken()                    │   │
│  │ • SessionService.createSession()                         │   │
│  │                                                          │   │
│  │ Caratteristiche:                                         │   │
│  │ - Zero dipendenze esterne                                │   │
│  │ - Esecuzione in millisecondi                             │   │
│  │ - Nessun mock necessario                                 │   │
│  │ - Input → Output puro                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  USE CASES (Unit Tests con Fake - 15%)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • GetSessionUseCase.execute()                            │   │
│  │ • AuthenticateUserUseCase.execute()                      │   │
│  │                                                          │   │
│  │ Caratteristiche:                                         │   │
│  │ - Usa InMemorySessionRepository (fake)                   │   │
│  │ - Usa StubIdentityProvider (stub)                        │   │
│  │ - Testa orchestrazione e flussi                          │   │
│  │ - Ancora veloce (< 100ms per test)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ADAPTERS (Integration Tests - 10%)                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • RedisSessionAdapter con Redis reale (Testcontainers)   │   │
│  │ • KeycloakIdentityAdapter con Keycloak reale             │   │
│  │                                                          │   │
│  │ Caratteristiche:                                         │   │
│  │ - Container reali via Testcontainers                     │   │
│  │ - Verifica comportamento I/O effettivo                   │   │
│  │ - Più lenti (secondi per test)                           │   │
│  │ - Eseguiti separatamente (npm run test:integration)      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  E2E (Smoke Tests - 5%)                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Login flow completo                                    │   │
│  │ • Session persistence                                    │   │
│  │ • Token refresh                                          │   │
│  │                                                          │   │
│  │ Caratteristiche:                                         │   │
│  │ - Full stack (Gateway + Keycloak + Redis)                │   │
│  │ - Gherkin scenarios                                      │   │
│  │ - Solo happy path + critical errors                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.6 Quando Applicare l'Architettura Esagonale

**APPLICA SE:**

- Il package ha business logic complessa (regole, validazioni, calcoli)
- Ci sono multiple dipendenze esterne (database, cache, API, message broker)
- Il codice sarà riutilizzato in contesti diversi
- Hai bisogno di test unitari veloci e affidabili
- Il package è in fase di sviluppo attivo

**NON APPLICARE SE:**

- Il package è un semplice wrapper/utility (poche righe)
- Non c'è business logic (solo pass-through)
- Il package è stabile e non cambierà
- Il costo di refactoring supera il beneficio

### 4.7 Roadmap di Migrazione per tech-citizen-sw-gateway

**Fase 1 (Immediate): Test Structure Only**
Riorganizza i test esistenti senza modificare il codice sorgente. Questo dà benefici immediati senza rischi.

**Fase 2 (Nuovi Package): Full Hexagonal**
Quando crei nuovi package (es. `packages/audit`, `packages/notification`), parti direttamente con la struttura esagonale.

**Fase 3 (Opzionale): Migrazione packages/auth**
Se decidi di migrare `packages/auth`, segui questi step incrementali:

```
Step 1: Estrai SessionRepositoryPort interface        [1 giorno]
Step 2: Crea RedisSessionAdapter che implementa port  [1 giorno]
Step 3: Crea InMemorySessionRepository per test       [0.5 giorni]
Step 4: Estrai SessionService (domain logic)          [1 giorno]
Step 5: Crea GetSessionUseCase                        [1 giorno]
Step 6: Ripeti per IdentityProvider (Keycloak)        [2 giorni]
Step 7: Aggiorna index.ts (wiring)                    [0.5 giorni]
Step 8: Migra test alla nuova struttura               [1 giorno]
────────────────────────────────────────────────────────────────
Totale stimato: ~8 giorni lavorativi
```

**Nota**: La Fase 3 è completamente opzionale. Il codice attuale funziona. La migrazione va fatta solo se i benefici (test più veloci, manutenibilità) giustificano l'investimento.

---

## 5. EPIC-008: Test Architecture Reset

### 4.1 Obiettivo

Riorganizzare completamente la struttura dei test per:

- Separazione chiara unit/integration/e2e
- Configurazione Jest centralizzata
- Fixtures e mocks riutilizzabili
- Esecuzione parallela sicura (no port conflicts)
- Integrazione con Testcontainers

### 4.2 Nuova Struttura Proposta

```
tech-citizen-sw-gateway/
├── jest.config.cjs                 # Config base (unit test)
├── jest.preset.cjs                 # Preset condiviso per tutti i package
│
├── packages/
│   └── auth/
│       ├── src/
│       └── test/
│           ├── unit/               # Test unitari puri
│           │   ├── jwt-validator.spec.ts
│           │   ├── session-logic.spec.ts
│           │   └── token-parser.spec.ts
│           ├── integration/        # Test con container
│           │   ├── keycloak-auth.integration.spec.ts
│           │   └── redis-session.integration.spec.ts
│           └── fixtures/           # Dati di test riutilizzabili
│               ├── tokens.fixture.ts
│               ├── users.fixture.ts
│               └── keycloak-realm.fixture.json
│
├── services/
│   └── gateway/
│       └── test/
│           ├── unit/
│           │   └── routes.spec.ts
│           ├── integration/
│           │   └── health-endpoint.integration.spec.ts
│           └── fixtures/
│
├── test/                           # Test cross-cutting
│   ├── setup/
│   │   ├── global-setup.ts        # Testcontainers startup
│   │   ├── global-teardown.ts     # Cleanup containers
│   │   └── jest-environment.ts    # Custom environment
│   ├── helpers/
│   │   ├── container-manager.ts   # Wrapper Testcontainers
│   │   ├── port-allocator.ts      # Random port allocation
│   │   └── test-app-builder.ts    # Fastify test instance builder
│   ├── mocks/
│   │   ├── redis.mock.ts          # In-memory Redis fake
│   │   ├── keycloak.mock.ts       # Keycloak response stubs
│   │   └── http-client.mock.ts    # Fetch/Axios mock
│   └── fixtures/
│       └── shared/                # Fixtures condivise
│
├── e2e/
│   ├── features/                  # Gherkin feature files
│   │   ├── auth/
│   │   │   ├── AUTH-001-jwt-validation.feature
│   │   │   └── AUTH-002-keycloak-login.feature
│   │   └── gateway/
│   │       └── GW-001-health-check.feature
│   ├── steps/                     # Step definitions
│   │   ├── auth.steps.ts
│   │   └── gateway.steps.ts
│   ├── support/
│   │   ├── world.ts              # Cucumber World context
│   │   └── hooks.ts              # Before/After hooks
│   └── cucumber.cjs              # Cucumber config
│
└── scripts/
    └── test/
        ├── run-unit.sh           # npm run test:unit
        ├── run-integration.sh    # npm run test:integration
        ├── run-e2e.sh            # npm run test:e2e
        └── run-all.sh            # npm run test
```

### 4.3 User Stories

#### US-057: Jest Configuration Consolidation

**Come** sviluppatore  
**Voglio** una configurazione Jest centralizzata con preset  
**Per** evitare duplicazione e garantire consistenza

**Acceptance Criteria:**

```gherkin
Feature: Jest Configuration

  Scenario: Single preset for all packages
    Given a jest.preset.cjs file in root
    When I run tests in any package
    Then the package extends the preset
    And common settings are inherited

  Scenario: Unit tests run without containers
    Given I run "npm run test:unit"
    When tests execute
    Then no Docker containers are started
    And tests complete in < 30 seconds

  Scenario: Integration tests use Testcontainers
    Given I run "npm run test:integration"
    When tests execute
    Then Testcontainers starts required services
    And ports are allocated dynamically
    And containers are cleaned up after tests
```

**Tasks:**

- [ ] Creare `jest.preset.cjs` con configurazione base
- [ ] Aggiornare `jest.config.cjs` root per unit test
- [ ] Creare `jest.integration.config.cjs` per integration
- [ ] Rimuovere config duplicati nei package
- [ ] Aggiornare `package.json` scripts

---

#### US-058: Test Helpers Refactoring

**Come** sviluppatore  
**Voglio** helper riutilizzabili per setup test  
**Per** ridurre boilerplate e garantire isolamento

**Acceptance Criteria:**

```gherkin
Feature: Test Helpers

  Scenario: Container Manager provides Keycloak
    Given I import ContainerManager
    When I call startKeycloak()
    Then a Keycloak container starts
    And I receive connection URL and credentials
    And the container is health-checked before returning

  Scenario: In-memory Redis mock
    Given I import RedisMock from test/mocks
    When I use it in a unit test
    Then it implements the same interface as ioredis
    And data persists only within the test

  Scenario: Port allocator prevents conflicts
    Given two test suites run in parallel
    When both request ports
    Then each receives unique ports
    And no port conflicts occur
```

**Tasks:**

- [ ] Creare `test/helpers/container-manager.ts`
- [ ] Creare `test/mocks/redis.mock.ts`
- [ ] Creare `test/helpers/port-allocator.ts`
- [ ] Creare `test/helpers/test-app-builder.ts`
- [ ] Documentare API in JSDoc

---

#### US-059: Package Auth Test Migration

**Come** sviluppatore  
**Voglio** migrare i test di `packages/auth` alla nuova struttura  
**Per** validare il pattern prima di applicarlo ovunque

**Acceptance Criteria:**

```gherkin
Feature: Auth Package Tests

  Scenario: Unit tests are isolated
    Given auth unit tests in packages/auth/test/unit/
    When I run "npm run test:unit -w packages/auth"
    Then tests run without Docker
    And tests complete in < 10 seconds
    And coverage is > 80%

  Scenario: Integration tests use real Keycloak
    Given auth integration tests in packages/auth/test/integration/
    When I run "npm run test:integration -w packages/auth"
    Then Testcontainers starts Keycloak
    And OIDC flows are tested against real server
    And tests complete in < 120 seconds

  Scenario: Fixtures are reusable
    Given fixtures in packages/auth/test/fixtures/
    When I import them in any test file
    Then I get consistent test data
    And fixtures are typed with TypeScript
```

**Tasks:**

- [ ] Creare directory `packages/auth/test/unit/`
- [ ] Creare directory `packages/auth/test/integration/`
- [ ] Creare directory `packages/auth/test/fixtures/`
- [ ] Migrare test esistenti nella nuova struttura
- [ ] Rimuovere file test vecchi
- [ ] Aggiornare `packages/auth/jest.config.cjs`

---

#### US-060: E2E Test Setup with Cucumber

**Come** QA/sviluppatore  
**Voglio** test E2E con Cucumber e Gherkin  
**Per** avere acceptance criteria eseguibili

**Acceptance Criteria:**

```gherkin
Feature: E2E Test Infrastructure

  Scenario: Cucumber executes feature files
    Given feature files in e2e/features/
    And step definitions in e2e/steps/
    When I run "npm run test:e2e"
    Then Cucumber parses all .feature files
    And executes matching step definitions
    And generates HTML report

  Scenario: E2E tests run against full stack
    Given Docker Compose stack is running
    When E2E tests execute
    Then tests hit real Gateway endpoints
    And authentication flows work end-to-end
```

**Tasks:**

- [ ] Installare `@cucumber/cucumber`
- [ ] Creare `e2e/cucumber.cjs` config
- [ ] Creare `e2e/support/world.ts`
- [ ] Creare `e2e/support/hooks.ts`
- [ ] Migrare feature files esistenti
- [ ] Creare step definitions base
- [ ] Aggiornare script `npm run test:e2e`

---

### 4.4 Configurazioni da Creare

#### jest.preset.cjs

```javascript
// jest.preset.cjs - Shared configuration for all packages
module.exports = {
  // TypeScript support
  preset: 'ts-jest',

  // ESM support
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

  // Test environment
  testEnvironment: 'node',

  // Coverage defaults
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],

  // Performance
  maxWorkers: '50%',

  // Detect issues
  detectOpenHandles: true,
  forceExit: false,

  // Timeout defaults
  testTimeout: 10000,

  // Verbose output
  verbose: true,
};
```

#### jest.config.cjs (root - unit tests)

```javascript
// jest.config.cjs - Root config for unit tests only
const preset = require('./jest.preset.cjs');

module.exports = {
  ...preset,
  displayName: 'unit',

  // Only unit tests
  testMatch: [
    '<rootDir>/packages/*/test/unit/**/*.spec.ts',
    '<rootDir>/services/*/test/unit/**/*.spec.ts',
  ],

  // Fast timeout for unit tests
  testTimeout: 5000,

  // Coverage thresholds
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

#### jest.integration.config.cjs

```javascript
// jest.integration.config.cjs - Integration tests with containers
const preset = require('./jest.preset.cjs');

module.exports = {
  ...preset,
  displayName: 'integration',

  // Only integration tests
  testMatch: [
    '<rootDir>/packages/*/test/integration/**/*.spec.ts',
    '<rootDir>/services/*/test/integration/**/*.spec.ts',
  ],

  // Global setup/teardown for containers
  globalSetup: '<rootDir>/test/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/setup/global-teardown.ts',

  // Longer timeout for container startup
  testTimeout: 120000,

  // Run serially to avoid resource contention
  maxWorkers: 1,

  // Setup file for each test
  setupFilesAfterEnv: ['<rootDir>/test/setup/integration-setup.ts'],
};
```

#### test/helpers/container-manager.ts

```typescript
// test/helpers/container-manager.ts
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

export interface KeycloakConfig {
  url: string;
  port: number;
  adminUser: string;
  adminPassword: string;
  realm: string;
}

export interface RedisConfig {
  url: string;
  port: number;
  password: string;
}

export class ContainerManager {
  private containers: Map<string, StartedTestContainer> = new Map();

  async startKeycloak(): Promise<KeycloakConfig> {
    if (this.containers.has('keycloak')) {
      const container = this.containers.get('keycloak')!;
      const port = container.getMappedPort(8080);
      return {
        url: `http://localhost:${port}`,
        port,
        adminUser: 'admin',
        adminPassword: 'admin',
        realm: 'test-realm',
      };
    }

    const container = await new GenericContainer(
      'quay.io/keycloak/keycloak:23.0',
    )
      .withExposedPorts(8080)
      .withEnvironment({
        KEYCLOAK_ADMIN: 'admin',
        KEYCLOAK_ADMIN_PASSWORD: 'admin',
        KC_HTTP_ENABLED: 'true',
        KC_HEALTH_ENABLED: 'true',
      })
      .withCommand(['start-dev'])
      .withWaitStrategy(Wait.forHttp('/health/ready', 8080).forStatusCode(200))
      .withStartupTimeout(120000)
      .start();

    this.containers.set('keycloak', container);
    const port = container.getMappedPort(8080);

    return {
      url: `http://localhost:${port}`,
      port,
      adminUser: 'admin',
      adminPassword: 'admin',
      realm: 'test-realm',
    };
  }

  async startRedis(): Promise<RedisConfig> {
    if (this.containers.has('redis')) {
      const container = this.containers.get('redis')!;
      const port = container.getMappedPort(6379);
      return {
        url: `redis://localhost:${port}`,
        port,
        password: 'test-password',
      };
    }

    const container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withCommand(['redis-server', '--requirepass', 'test-password'])
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start();

    this.containers.set('redis', container);
    const port = container.getMappedPort(6379);

    return {
      url: `redis://localhost:${port}`,
      port,
      password: 'test-password',
    };
  }

  async stopAll(): Promise<void> {
    for (const [name, container] of this.containers) {
      console.log(`Stopping container: ${name}`);
      await container.stop();
    }
    this.containers.clear();
  }
}

// Singleton for global setup
export const containerManager = new ContainerManager();
```

#### test/mocks/redis.mock.ts

```typescript
// test/mocks/redis.mock.ts
// In-memory Redis mock implementing ioredis interface subset

export class RedisMock {
  private store: Map<string, string> = new Map();
  private expiries: Map<string, number> = new Map();

  async get(key: string): Promise<string | null> {
    this.checkExpiry(key);
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, value);
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.store.set(key, value);
    this.expiries.set(key, Date.now() + seconds * 1000);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    this.expiries.delete(key);
    return existed ? 1 : 0;
  }

  async ttl(key: string): Promise<number> {
    const expiry = this.expiries.get(key);
    if (!expiry) return -1;
    const remaining = Math.ceil((expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.store.has(key)) return 0;
    this.expiries.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async keys(pattern: string): Promise<string[]> {
    // Simplified pattern matching (only supports * wildcard)
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return Array.from(this.store.keys()).filter(k => regex.test(k));
  }

  // Utility methods for testing
  clear(): void {
    this.store.clear();
    this.expiries.clear();
  }

  getStore(): Map<string, string> {
    return new Map(this.store);
  }

  private checkExpiry(key: string): void {
    const expiry = this.expiries.get(key);
    if (expiry && Date.now() > expiry) {
      this.store.delete(key);
      this.expiries.delete(key);
    }
  }
}
```

---

## 6. EPIC-009: Woodpecker CI Setup

### 5.1 Obiettivo

Implementare CI/CD self-hosted con Woodpecker CI per:

- Quality gates automatici (lint, test, security)
- Build Docker images
- Deploy automatico via Ansible
- Footprint minimo (~130MB RAM)

### 5.2 Architettura

```
┌─────────────────────────────────────────────────────────────────┐
│                    Hetzner CPX32 (8GB RAM)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Gitea      │    │  Woodpecker  │    │  Woodpecker  │      │
│  │   (Git)      │───▶│   Server     │───▶│   Agent      │      │
│  │   Optional   │    │   (~100MB)   │    │   (~30MB)    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                              │                   │              │
│                              │                   ▼              │
│                              │           ┌──────────────┐       │
│                              │           │   Docker     │       │
│                              │           │   Builds     │       │
│                              │           └──────────────┘       │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Application Stack                           │   │
│  │  Gateway │ Keycloak │ Redis │ Postgres │ Prometheus     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 User Stories

#### US-061: Woodpecker Server Setup

**Come** DevOps engineer  
**Voglio** Woodpecker CI server installato  
**Per** avere CI/CD self-hosted

**Acceptance Criteria:**

```gherkin
Feature: Woodpecker Server

  Scenario: Server starts with Docker Compose
    Given docker-compose.woodpecker.yml exists
    When I run "docker compose -f docker-compose.woodpecker.yml up -d"
    Then Woodpecker server starts
    And web UI is accessible on port 8000
    And health endpoint returns 200

  Scenario: Server connects to Git provider
    Given Woodpecker is configured with GitHub/Gitea OAuth
    When I access the web UI
    Then I can login with Git credentials
    And my repositories are listed

  Scenario: Resource limits are enforced
    Given Woodpecker agent has memory limit 256MB
    When a build runs
    Then container memory is capped at 2GB
    And only one workflow runs at a time
```

**Tasks:**

- [ ] Creare `infrastructure/woodpecker/docker-compose.woodpecker.yml`
- [ ] Creare `infrastructure/woodpecker/.env.example`
- [ ] Configurare OAuth con GitHub o Gitea
- [ ] Configurare agent con resource limits
- [ ] Aggiungere a Caddy reverse proxy

---

#### US-062: CI Pipeline Definition

**Come** sviluppatore  
**Voglio** pipeline CI definita in YAML  
**Per** automatizzare quality checks

**Acceptance Criteria:**

```gherkin
Feature: CI Pipeline

  Scenario: Pipeline runs on push to main
    Given a push to main branch
    When Woodpecker receives webhook
    Then pipeline starts automatically
    And runs lint, test, build steps

  Scenario: Pipeline runs on pull request
    Given a pull request is opened
    When Woodpecker receives webhook
    Then pipeline runs
    And PR status is updated with results

  Scenario: Failed step stops pipeline
    Given a step fails (e.g., lint errors)
    When pipeline evaluates
    Then subsequent steps are skipped
    And pipeline is marked as failed
    And notification is sent (optional)
```

**Tasks:**

- [ ] Creare `.woodpecker.yml` con pipeline completa
- [ ] Configurare steps: install, lint, test:unit, test:integration, build
- [ ] Configurare services per integration tests
- [ ] Aggiungere step di deploy (quando su main)
- [ ] Configurare secrets per deploy

---

#### US-063: Ansible Integration for Deploy

**Come** DevOps engineer  
**Voglio** deploy automatico via Ansible  
**Per** deployment ripetibili e versionati

**Acceptance Criteria:**

```gherkin
Feature: Automated Deploy

  Scenario: Successful build triggers deploy
    Given CI pipeline passes on main branch
    When deploy step executes
    Then Ansible playbook runs
    And new version is deployed to production
    And health check passes
    And deployment is logged

  Scenario: Failed deploy triggers rollback
    Given deploy step fails health check
    When failure is detected
    Then rollback playbook runs
    And previous version is restored
    And alert is sent
```

**Tasks:**

- [ ] Creare step deploy in `.woodpecker.yml`
- [ ] Configurare SSH secrets in Woodpecker
- [ ] Creare playbook `ansible/playbooks/deploy-ci.yml`
- [ ] Aggiungere health check post-deploy
- [ ] Documentare rollback procedure

---

### 5.4 Configurazioni da Creare

#### infrastructure/woodpecker/docker-compose.woodpecker.yml

```yaml
# infrastructure/woodpecker/docker-compose.woodpecker.yml
# Woodpecker CI - Self-hosted, lightweight CI/CD

services:
  woodpecker-server:
    image: woodpeckerci/woodpecker-server:v3
    container_name: woodpecker-server
    restart: unless-stopped
    ports:
      - '8000:8000'
    volumes:
      - woodpecker-data:/var/lib/woodpecker
    environment:
      # Server configuration
      - WOODPECKER_OPEN=false
      - WOODPECKER_HOST=${WOODPECKER_HOST:-https://ci.tech-citizen.me}
      - WOODPECKER_ADMIN=${WOODPECKER_ADMIN:-admin}

      # GitHub OAuth (or Gitea, GitLab, etc.)
      - WOODPECKER_GITHUB=true
      - WOODPECKER_GITHUB_CLIENT=${GITHUB_CLIENT_ID}
      - WOODPECKER_GITHUB_SECRET=${GITHUB_CLIENT_SECRET}

      # Agent secret
      - WOODPECKER_AGENT_SECRET=${WOODPECKER_AGENT_SECRET}

      # Database (SQLite by default, or PostgreSQL)
      - WOODPECKER_DATABASE_DRIVER=sqlite3
      - WOODPECKER_DATABASE_DATASOURCE=/var/lib/woodpecker/woodpecker.sqlite

      # Limits
      - WOODPECKER_MAX_WORKFLOWS=1
    networks:
      - woodpecker-network
    healthcheck:
      test: ['CMD', 'wget', '-q', '--spider', 'http://localhost:8000/healthz']
      interval: 30s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 256M

  woodpecker-agent:
    image: woodpeckerci/woodpecker-agent:v3
    container_name: woodpecker-agent
    restart: unless-stopped
    depends_on:
      - woodpecker-server
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WOODPECKER_SERVER=woodpecker-server:9000
      - WOODPECKER_AGENT_SECRET=${WOODPECKER_AGENT_SECRET}
      - WOODPECKER_MAX_WORKFLOWS=1
      - WOODPECKER_BACKEND_DOCKER_NETWORK=woodpecker-network
      # Memory limit per build container: 2GB
      - WOODPECKER_BACKEND_DOCKER_LIMIT_MEM=2147483648
    networks:
      - woodpecker-network
    deploy:
      resources:
        limits:
          memory: 128M

networks:
  woodpecker-network:
    driver: bridge

volumes:
  woodpecker-data:
```

#### .woodpecker.yml

```yaml
# .woodpecker.yml - CI/CD Pipeline for Tech Citizen SW Gateway

# When to run
when:
  branch: [main, develop]
  event: [push, pull_request]

# Variables
variables:
  - &node_image 'node:22-alpine'
  - &docker_image 'plugins/docker'

# Pipeline steps
steps:
  # ============================================
  # Stage 1: Install dependencies
  # ============================================
  - name: install
    image: *node_image
    commands:
      - npm ci --ignore-scripts
      - npm run build --if-present
    when:
      event: [push, pull_request]

  # ============================================
  # Stage 2: Quality checks (parallel)
  # ============================================
  - name: lint
    image: *node_image
    commands:
      - npm run lint:check
    depends_on: [install]
    when:
      event: [push, pull_request]

  - name: format-check
    image: *node_image
    commands:
      - npm run format:check
    depends_on: [install]
    when:
      event: [push, pull_request]

  - name: type-check
    image: *node_image
    commands:
      - npm run build
    depends_on: [install]
    when:
      event: [push, pull_request]

  # ============================================
  # Stage 3: Unit tests
  # ============================================
  - name: test-unit
    image: *node_image
    commands:
      # Limit Node.js heap to prevent OOM
      - node --max-old-space-size=1024 ./node_modules/.bin/jest --config jest.config.cjs --runInBand
    depends_on: [lint, format-check, type-check]
    when:
      event: [push, pull_request]

  # ============================================
  # Stage 4: Integration tests (with services)
  # ============================================
  - name: test-integration
    image: *node_image
    commands:
      - |
        # Wait for Keycloak to be ready
        echo "Waiting for Keycloak..."
        for i in $(seq 1 60); do
          if wget -q --spider http://keycloak:8080/health/ready 2>/dev/null; then
            echo "Keycloak ready!"
            break
          fi
          sleep 2
        done
      - |
        # Wait for Redis
        echo "Waiting for Redis..."
        for i in $(seq 1 30); do
          if nc -z redis 6379 2>/dev/null; then
            echo "Redis ready!"
            break
          fi
          sleep 1
        done
      # Run integration tests
      - node --max-old-space-size=1536 ./node_modules/.bin/jest --config jest.integration.config.cjs --runInBand
    environment:
      - KEYCLOAK_URL=http://keycloak:8080
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=test-password
      - NODE_ENV=test
    depends_on: [test-unit]
    when:
      event: [push, pull_request]

  # ============================================
  # Stage 5: Build Docker image (main only)
  # ============================================
  - name: build-docker
    image: *docker_image
    settings:
      repo: ${CI_REGISTRY:-docker.io}/tech-citizen/gateway
      tags:
        - latest
        - ${CI_COMMIT_SHA:0:7}
      dockerfile: Dockerfile
      dry_run: ${CI_COMMIT_BRANCH != 'main'}
    depends_on: [test-integration]
    when:
      branch: main
      event: push

  # ============================================
  # Stage 6: Deploy to production (main only)
  # ============================================
  - name: deploy
    image: alpine
    commands:
      - apk add --no-cache openssh-client ansible
      - mkdir -p ~/.ssh
      - echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_ed25519
      - chmod 600 ~/.ssh/id_ed25519
      - ssh-keyscan -H $PRODUCTION_SERVER_IP >> ~/.ssh/known_hosts
      - |
        cd ansible
        ansible-playbook -i inventory/hosts.ini \
          playbooks/deploy-gateway.yml \
          --limit=production \
          -e "version=${CI_COMMIT_SHA:0:7}"
    secrets:
      - ssh_private_key
      - production_server_ip
    depends_on: [build-docker]
    when:
      branch: main
      event: push

  # ============================================
  # Stage 7: Post-deploy smoke test
  # ============================================
  - name: smoke-test
    image: curlimages/curl
    commands:
      - |
        echo "Running smoke tests..."
        # Health check
        curl -f https://gateway.tech-citizen.me/health || exit 1
        # Metrics endpoint
        curl -f https://gateway.tech-citizen.me/metrics | grep http_request || exit 1
        echo "Smoke tests passed!"
    depends_on: [deploy]
    when:
      branch: main
      event: push

# ============================================
# Services for integration tests
# ============================================
services:
  - name: keycloak
    image: quay.io/keycloak/keycloak:23.0
    environment:
      - KEYCLOAK_ADMIN=admin
      - KEYCLOAK_ADMIN_PASSWORD=admin
      - KC_HTTP_ENABLED=true
      - KC_HEALTH_ENABLED=true
    commands:
      - start-dev

  - name: redis
    image: redis:7-alpine
    commands:
      - redis-server --requirepass test-password
```

#### infrastructure/woodpecker/.env.example

```bash
# infrastructure/woodpecker/.env.example
# Copy to .env and fill with real values

# Woodpecker Server
WOODPECKER_HOST=https://ci.tech-citizen.me
WOODPECKER_ADMIN=your-github-username

# Agent Secret (generate with: openssl rand -hex 32)
WOODPECKER_AGENT_SECRET=your-secret-here

# GitHub OAuth App
# Create at: https://github.com/settings/developers
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# Or Gitea OAuth (if using Gitea)
# WOODPECKER_GITEA=true
# WOODPECKER_GITEA_URL=https://gitea.tech-citizen.me
# GITEA_CLIENT_ID=your-client-id
# GITEA_CLIENT_SECRET=your-client-secret
```

---

## 7. Naming Conventions

### 6.1 File e Directory Test

| Tipo             | Pattern                           | Esempio                             |
| ---------------- | --------------------------------- | ----------------------------------- |
| Unit test        | `*.spec.ts`                       | `jwt-validator.spec.ts`             |
| Integration test | `*.integration.spec.ts`           | `keycloak-auth.integration.spec.ts` |
| E2E feature      | `{PREFIX}-{NNN}-{name}.feature`   | `AUTH-001-jwt-validation.feature`   |
| Fixture          | `*.fixture.ts` o `*.fixture.json` | `tokens.fixture.ts`                 |
| Mock             | `*.mock.ts`                       | `redis.mock.ts`                     |
| Helper           | `*.helper.ts` o nome descrittivo  | `container-manager.ts`              |

### 6.2 Docker e Infrastructure

| Risorsa        | Pattern                        | Esempio                     |
| -------------- | ------------------------------ | --------------------------- |
| Container name | `{project}-{service}[-{env}]`  | `techcitizen-gateway-prod`  |
| Network        | `{project}-{env}-network`      | `techcitizen-prod-network`  |
| Volume         | `{project}-{service}-data`     | `techcitizen-keycloak-data` |
| Image tag      | `{version}` o `{commit-sha:7}` | `1.7.0` o `abc1234`         |

### 6.3 Environment Variables

| Contesto    | Prefix              | Esempio                        |
| ----------- | ------------------- | ------------------------------ |
| Application | `APP_`              | `APP_LOG_LEVEL`                |
| Database    | `DB_`               | `DB_HOST`, `DB_PASSWORD`       |
| Keycloak    | `KC_` o `KEYCLOAK_` | `KEYCLOAK_URL`                 |
| Redis       | `REDIS_`            | `REDIS_HOST`, `REDIS_PASSWORD` |
| CI/CD       | `CI_`               | `CI_COMMIT_SHA`                |
| Test        | `TEST_`             | `TEST_TIMEOUT`                 |

### 6.4 Jest Test Suites

```typescript
// Naming convention per describe blocks
describe('PackageName/ModuleName', () => {
  describe('ClassName or FunctionName', () => {
    describe('methodName or scenario', () => {
      it('should [expected behavior] when [condition]', () => {
        // test
      });
    });
  });
});

// Esempio reale
describe('Auth/SessionManager', () => {
  describe('getSession', () => {
    describe('when session exists', () => {
      it('should return session data', () => {});
      it('should extend TTL if sliding window enabled', () => {});
    });
    describe('when session expired', () => {
      it('should return null', () => {});
    });
  });
});
```

---

## 8. File da Creare/Modificare

### 7.1 Nuovi File

| File                                                      | Descrizione                   | US     |
| --------------------------------------------------------- | ----------------------------- | ------ |
| `jest.preset.cjs`                                         | Configurazione Jest condivisa | US-057 |
| `jest.integration.config.cjs`                             | Config per integration test   | US-057 |
| `test/setup/global-setup.ts`                              | Testcontainers startup        | US-058 |
| `test/setup/global-teardown.ts`                           | Cleanup containers            | US-058 |
| `test/helpers/container-manager.ts`                       | Wrapper Testcontainers        | US-058 |
| `test/mocks/redis.mock.ts`                                | In-memory Redis               | US-058 |
| `test/helpers/port-allocator.ts`                          | Random port allocation        | US-058 |
| `e2e/cucumber.cjs`                                        | Cucumber configuration        | US-060 |
| `e2e/support/world.ts`                                    | Cucumber World context        | US-060 |
| `e2e/support/hooks.ts`                                    | Cucumber hooks                | US-060 |
| `infrastructure/woodpecker/docker-compose.woodpecker.yml` | Woodpecker CI                 | US-061 |
| `infrastructure/woodpecker/.env.example`                  | Env template                  | US-061 |
| `.woodpecker.yml`                                         | CI pipeline                   | US-062 |

### 7.2 File da Modificare

| File                               | Modifica                      | US     |
| ---------------------------------- | ----------------------------- | ------ |
| `jest.config.cjs`                  | Aggiornare per solo unit test | US-057 |
| `package.json`                     | Aggiornare scripts test       | US-057 |
| `packages/auth/jest.config.cjs`    | Estendere preset              | US-059 |
| `services/gateway/jest.config.cjs` | Estendere preset              | US-059 |

### 7.3 File da Rimuovere

| File                          | Motivo                       |
| ----------------------------- | ---------------------------- |
| `jest.e2e.config.cjs`         | Sostituito da Cucumber       |
| `scripts/test-infra-start.sh` | Sostituito da Testcontainers |
| `scripts/test-infra-stop.sh`  | Sostituito da Testcontainers |
| `docker-compose.test.yml`     | Sostituito da Testcontainers |
| `test/infrastructure.test.ts` | Spostato in integration      |

---

## 9. Acceptance Criteria Eseguibili

### 8.1 Definition of Done per EPIC-008

```gherkin
Feature: Test Architecture Reset Complete

  Scenario: All unit tests pass without Docker
    Given I have clean Node.js environment
    And no Docker containers running
    When I run "npm run test:unit"
    Then all unit tests pass
    And execution time is < 60 seconds

  Scenario: All integration tests pass with Testcontainers
    Given Docker daemon is running
    When I run "npm run test:integration"
    Then Testcontainers start required services
    And all integration tests pass
    And containers are cleaned up

  Scenario: E2E tests execute with Cucumber
    Given full Docker Compose stack is running
    When I run "npm run test:e2e"
    Then Cucumber parses all feature files
    And all scenarios pass
    And HTML report is generated

  Scenario: Test coverage meets thresholds
    Given all tests pass
    When I check coverage report
    Then line coverage is >= 70%
    And function coverage is >= 70%
    And branch coverage is >= 60%
```

### 8.2 Definition of Done per EPIC-009

```gherkin
Feature: CI/CD Pipeline Complete

  Scenario: Woodpecker runs on git push
    Given code is pushed to main branch
    When webhook triggers pipeline
    Then lint step runs
    And test-unit step runs
    And test-integration step runs
    And all steps pass

  Scenario: Failed step blocks merge
    Given a pull request with failing tests
    When pipeline runs
    Then failed status is reported to GitHub
    And merge is blocked

  Scenario: Successful main build deploys
    Given all steps pass on main branch
    When deploy step runs
    Then Ansible playbook executes
    And new version is live
    And smoke test passes

  Scenario: CI uses minimal resources
    Given pipeline is running
    When I check server resources
    Then Woodpecker server uses < 256MB RAM
    And build containers use < 2GB RAM each
    And only 1 workflow runs at a time
```

---

## Appendice A: Dipendenze da Installare

```bash
# Test dependencies
npm install -D \
  testcontainers \
  @testcontainers/keycloak \
  @cucumber/cucumber \
  jest-mock-extended

# Types
npm install -D \
  @types/jest
```

## Appendice B: Script package.json Aggiornati

```json
{
  "scripts": {
    "// ==== Testing ====": "",
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "jest --config jest.config.cjs",
    "test:integration": "jest --config jest.integration.config.cjs --runInBand",
    "test:e2e": "cucumber-js --config e2e/cucumber.cjs",
    "test:cov": "jest --config jest.config.cjs --coverage",
    "test:watch": "jest --config jest.config.cjs --watch"
  }
}
```

---

**Fine Documento**

Per iniziare, il developer può:

1. Creare i file di configurazione Jest (US-057)
2. Creare gli helper per Testcontainers (US-058)
3. Migrare i test di packages/auth (US-059)
4. Configurare Woodpecker CI (US-061, US-062)

Ogni US è indipendente e può essere implementata in branch separati seguendo trunk-based development.
