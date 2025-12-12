# ADR-002: Hexagonal Architecture (Ports & Adapters) for Auth Package

**Status**: Accepted  
**Date**: 2025-12-12  
**Decision Makers**: Antonio Cittadino  
**Tags**: architecture, testing, auth, domain-driven-design

---

## Context

Il package `@tech-citizen/auth` gestisce operazioni critiche (sessioni, token, identity provider) che richiedono:

1. **Testabilità**: Business logic testabile senza infrastruttura (Keycloak, Redis)
2. **Sostituibilità**: Possibilità di cambiare implementazioni (es. Redis → Memcached)
3. **Isolamento**: Domain logic indipendente da framework e librerie esterne
4. **Velocità di test**: Unit test che girano in millisecondi, non secondi

L'approccio tradizionale con dipendenze dirette da Redis/Keycloak rendeva i test lenti e fragili, richiedendo mock complessi o container Docker anche per la business logic.

---

## Decision

Adottiamo l'**architettura esagonale** (Ports & Adapters) per il package auth, strutturando il codice in tre layer concentrici:

### Layer 1: Domain (Core)

**Responsabilità**: Business logic pura, zero dipendenze esterne

```
packages/auth/src/domain/
├── entities/
│   └── session.entity.ts          # SessionData, TokenPair, helper functions
├── services/
│   └── session.service.ts         # Pure logic: isSessionValid, shouldRefreshToken
└── errors/
    └── auth.errors.ts              # SessionExpiredError, TokenRefreshError
```

**Caratteristiche**:

- Nessun import di librerie esterne (Redis, Keycloak, Fastify)
- Funzioni pure o classi con dipendenze iniettate tramite constructor
- Testabile con Tap in ~1s (18 test per SessionService)

### Layer 2: Application (Ports)

**Responsabilità**: Definisce contratti (interfacce TypeScript) tra Domain e Infrastructure

```
packages/auth/src/application/
├── ports/
│   ├── session-repository.port.ts    # Interface: getSession, saveSession, etc.
│   └── identity-provider.port.ts     # Interface: refreshAccessToken, validateToken
└── use-cases/
    └── refresh-session.use-case.ts   # Orchestration: Domain + Ports
```

**Caratteristiche**:

- Solo interfacce TypeScript (`interface`, non `class`)
- Ports definiscono **cosa serve** al Domain, non **come** è implementato
- Use Cases orchestrano Domain Services usando le Ports

### Layer 3: Infrastructure (Adapters)

**Responsabilità**: Implementazioni concrete delle Ports

```
packages/auth/src/infrastructure/
└── adapters/
    ├── redis-session.adapter.ts        # SessionRepositoryPort → ioredis
    ├── keycloak-identity.adapter.ts    # IdentityProviderPort → OIDC HTTP
    └── mock-identity.adapter.ts        # IdentityProviderPort → In-memory fake
```

**Caratteristiche**:

- Implementano le interfacce Port
- Possono dipendere da librerie esterne (ioredis, fetch)
- Testati con **Testcontainers** (infrastruttura reale in Docker)

---

## Consequences

### Positive

1. **Test Velocissimi**:
   - Unit tests (Domain + Use Cases): **62 test in ~1.5s** usando mock
   - Integration tests (Adapters): **16 test in ~5s** con Testcontainers
   - Nessun container Docker per business logic

2. **Sostituibilità**:
   - Swap Redis → Memcached: implementi nuovo adapter, zero cambi al Domain
   - Swap Keycloak → Auth0: implementi nuovo adapter, zero cambi ai Use Cases
   - Mock per test: `MockIdentityAdapter` usato nei test Use Case (no I/O)

3. **Chiarezza Architetturale**:
   - Separazione netta tra "cosa" (Domain) e "come" (Infrastructure)
   - Dependency Injection naturale (Ports iniettate nei Use Cases)
   - Struttura directory riflette l'architettura

4. **Facilità di Testing**:
   - Domain: test con mock delle Ports (fast, no side effects)
   - Adapters: test con Testcontainers (real infrastructure)
   - Use Cases: test con mock adapters (orchestration logic)

### Negative

1. **Boilerplate**:
   - Serve definire Port (interface) + Adapter (implementation)
   - Più file da gestire rispetto a approccio monolitico

2. **Curva di Apprendimento**:
   - Sviluppatori devono capire concetto di Ports/Adapters
   - Richiede disciplina per non violare layer boundaries

3. **Overhead Iniziale**:
   - Setup iniziale più complesso (directory, interfacce, DI)
   - Payoff visibile solo con crescita del progetto

### Mitigazioni

- **Boilerplate**: Accettato come tradeoff per testabilità e manutenibilità
- **Learning Curve**: Documentato in `EXAGONAL.md` + esempi concreti
- **Overhead**: Ripagato da velocità di test e facilità di refactoring

---

## Alternatives Considered

### Alternative 1: Direct Dependencies (Repository Pattern Only)

**Pros**: Semplice, meno file  
**Cons**: Domain dipende da librerie concrete (ioredis), test lenti

**Rejected**: Viola principio di inversione delle dipendenze, rende test fragili

### Alternative 2: Service Layer con Mock Manuale

**Pros**: Familiare, meno astrazioni  
**Cons**: Mock complessi, test difficili da mantenere

**Rejected**: Mock "a mano" di Redis/Keycloak troppo fragile, test comunque lenti

### Alternative 3: Clean Architecture (5+ layer)

**Pros**: Massima separazione  
**Cons**: Over-engineering per progetto di questa dimensione

**Rejected**: Hexagonal (3 layer) è sweet spot tra semplicità e separazione

---

## Implementation Details

### Dependency Injection Pattern

```typescript
// Use Case con Ports iniettate
export class RefreshSessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly identityProvider: IdentityProviderPort,
    private readonly sessionService: SessionService,
  ) {}

  async execute(sessionId: string): Promise<RefreshSessionResult> {
    const session = await this.sessionRepository.getSession(sessionId);
    // ... business logic usando le Ports
  }
}
```

### Testing Strategy

**Unit Tests** (Domain + Use Cases):

```typescript
// Mock in-memory, no Docker
const mockRepo: SessionRepositoryPort = {
  /* ... */
};
const mockIdentity = new MockIdentityAdapter();
const useCase = new RefreshSessionUseCase(mockRepo, mockIdentity, service);

// Test eseguono in millisecondi
```

**Integration Tests** (Adapters):

```typescript
// Testcontainers avvia Redis reale
const container = await new GenericContainer('redis:7-alpine').start();
const adapter = new RedisSessionAdapter(redisClient);

// Test verificano implementazione concreta
```

### Current Implementation Status

- ✅ Domain Layer: `SessionService` (18 unit tests)
- ✅ Application Layer: `SessionRepositoryPort`, `IdentityProviderPort`, `RefreshSessionUseCase` (14 tests)
- ✅ Infrastructure Layer: `RedisSessionAdapter` (16 integration tests), `KeycloakIdentityAdapter`, `MockIdentityAdapter` (30 tests)

**Total**: 94 test passing (62 unit + 16 integration + 16 exports)

---

## References

- **EXAGONAL.md**: Guida completa all'architettura esagonale per il progetto
- **TABULARASA.md**: Principi architetturali originali
- Alistair Cockburn - "Hexagonal Architecture" (2005)
- Robert C. Martin - "Clean Architecture" (2017)

---

## Validation

**Success Metrics**:

- ✅ Test unitari eseguono in < 2s (target: ~1s per 50+ test)
- ✅ Nessuna dipendenza da Docker nei test unitari
- ✅ Adapters sostituibili senza modificare Domain
- ✅ Business logic testabile al 100% senza infrastruttura

**Next Steps**:

1. Estendere pattern ad altri package (cache, events, telemetry)
2. Implementare E2E tests con stack completo
3. Documentare best practices in EXAGONAL.md
4. Creare ADR per testing strategy (unit vs integration vs e2e)
