# Glossario Tecnico

> **Tech Citizen Software Gateway**  
> Terminologia standardizzata per documentazione e comunicazione del team.

---

## Autenticazione e Autorizzazione

### OIDC (OpenID Connect)

Protocollo di autenticazione basato su OAuth2 che aggiunge identity layer. Permette ai client di verificare l'identità dell'utente basandosi sull'autenticazione eseguita da un Authorization Server.

- **Standard**: [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- **Uso nel progetto**: Integrazione con Keycloak per autenticazione domain users
- **Vedi**: [ADR-003](./architecture/decisions/ADR-003-user-management-architecture.md), [US-039](../features.json)

### OAuth2

Framework di autorizzazione (non autenticazione) che consente a un'applicazione di ottenere accesso limitato a risorse di un utente senza esporre credenziali.

- **Standard**: [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- **Grant types usati**: Authorization Code Flow with PKCE
- **Uso nel progetto**: Base per OIDC, gestione access token
- **Package**: `@fastify/oauth2`

### JWT (JSON Web Token)

Token firmato digitalmente che contiene claims (affermazioni) su un utente. Composto da Header, Payload, Signature.

- **Standard**: [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)
- **Formato**: `eyJhbGc...header.eyJzdWI...payload.SflKxwR...signature`
- **Uso nel progetto**: Access tokens da Keycloak, system user authentication
- **Package**: `@fastify/jwt`
- **Validazione**: RS256 (RSA + SHA256) per Keycloak, HS256 (HMAC) per system users

### PKCE (Proof Key for Code Exchange)

Estensione di OAuth2 che protegge authorization code da intercettazione (mitigazione CSRF).

- **Standard**: [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- **Metodo**: S256 (SHA-256 hash del code verifier)
- **Uso nel progetto**: Obbligatorio per Keycloak OIDC flow
- **Implementazione**: `@fastify/oauth2` con `pkce: { method: 'S256' }`

### IdP (Identity Provider)

Sistema che crea, gestisce e autentica identità digitali.

- **Esempio**: Keycloak, Auth0, Okta, Azure AD
- **Uso nel progetto**: Keycloak come IdP centralizzato per domain users
- **Responsabilità**: User authentication, token issuance, session management

### SSO (Single Sign-On)

Meccanismo che permette a un utente di autenticarsi una volta e accedere a multiple applicazioni senza re-login.

- **Implementazione**: OIDC session condivisa tra client Keycloak
- **Uso nel progetto**: Domain users accedono a gateway + n8n + Grafana con unico login
- **Session timeout**: Configurabile in Keycloak realm (default: 30 min idle, 10h max)

### RBAC (Role-Based Access Control)

Modello di autorizzazione basato su ruoli assegnati agli utenti.

- **Ruoli nel progetto**:
  - `system-admin`: Amministratore infrastruttura
  - `domain-admin`: Amministratore organizzazione sanitaria
  - `doctor`: Medico con accesso dati pazienti
  - `nurse`: Infermiere con accesso limitato
  - `patient`: Paziente con self-access
  - `user`: Utente base autenticato
- **Gruppi**: `/administrators`, `/doctors`, `/nurses`, `/patients`
- **Vedi**: [Keycloak README](../infrastructure/keycloak/README.md)

---

## Keycloak

### Realm

Spazio isolato in Keycloak per utenti, client, ruoli, gruppi. Equivalente a un "tenant".

- **Realm progetto**: `healthcare-domain`
- **Configurazione**: `infrastructure/keycloak/realm-export.json`
- **Discovery endpoint**: `http://localhost:8090/realms/healthcare-domain/.well-known/openid-configuration`

### Client

Applicazione registrata in Keycloak che richiede autenticazione utenti.

- **Client progetto**: `gateway-client`
- **Tipo**: Confidential (con client secret)
- **Redirect URIs**: `http://localhost:3000/auth/callback`, staging, production
- **Scopes**: `openid`, `profile`, `email`, `roles`

### Client Secret

Credenziale condivisa tra Keycloak e client per autenticare client confidential.

- **Generazione**: `npm run keys:keycloak`
- **Dev**: `gateway-client-secret-change-in-production` (EXAMPLE ONLY)
- **Prod**: MUST be rotated, stored in vault/env vars
- **⚠️ Security**: Never commit to Git, use `.env` files

### Scope

Permesso che un client richiede per accedere a dati utente.

- **Standard OIDC**: `openid` (obbligatorio), `profile`, `email`, `address`, `phone`
- **Custom**: `offline_access` (refresh token), `roles` (realm roles nel token)
- **Uso nel progetto**: `openid profile email roles`

### Access Token

Token JWT di breve durata (5-15 min) che autorizza l'accesso a risorse.

- **Contenuto**: User ID, email, roles, expiration time
- **Validazione**: Gateway valida firma con Keycloak public key (RS256)
- **Storage**: NON salvato client-side (solo in session server-side)

### Refresh Token

Token opaco di lunga durata (giorni/settimane) per rinnovare access token senza re-autenticazione.

- **Uso**: Quando access token scade, client scambia refresh token per nuovo access token
- **Rotazione**: Keycloak può revocare refresh token (logout, security breach)
- **Storage**: Session Redis (encrypted)

---

## Gateway & Observability

### Correlation ID

Identificatore univoco (UUID v4) che traccia una richiesta attraverso tutti i microservizi.

- **Header**: `X-Request-ID`
- **Generazione**: Gateway genera se assente, preserva se presente
- **Uso**: Logging distribuito, tracing, debugging
- **Formato**: `550e8400-e29b-41d4-a716-446655440000` (UUID v4)
- **Implementazione**: `onRequest` hook in `services/gateway/src/index.ts`

### Circuit Breaker

Pattern che previene cascading failures bloccando richieste a servizi degradati.

- **Stati**: Closed (normal), Open (failing), Half-Open (testing recovery)
- **Uso futuro**: Protezione chiamate a patient-api, EHR-api, third-party services
- **Package**: `@platformatic/circuit-breaker` o `opossum`
- **Configurazione**: Threshold (es. 50% errori), timeout (es. 30s)

### Prometheus

Sistema di monitoring e alerting basato su time-series database.

- **Metrics endpoint**: `http://localhost:3000/metrics`
- **Formato**: Text-based (Prometheus exposition format)
- **Package**: `prom-client`
- **Metriche esposte**:
  - `http_request_duration_ms` (histogram): Latenza richieste HTTP
  - `http_requests_total` (counter): Totale richieste per method/route/status
  - `nodejs_*`: Default metrics (CPU, memory, event loop)

### Histogram

Tipo di metrica Prometheus che raggruppa osservazioni in bucket predefiniti.

- **Esempio**: `http_request_duration_ms` con bucket `[10, 50, 100, 300, 500, 1000, 3000, 5000]` ms
- **Uso**: Calcolo percentili (P50, P95, P99), SLO monitoring
- **Query PromQL**: `histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))`

### Counter

Metrica Prometheus cumulativa che può solo aumentare (mai diminuire).

- **Esempio**: `http_requests_total`
- **Labels**: `method`, `route`, `status`
- **Uso**: Rate calculation (richieste/sec), conteggio errori
- **Query PromQL**: `rate(http_requests_total[5m])`

---

## Infrastructure & DevOps

### Docker Compose

Tool per definire e gestire applicazioni multi-container.

- **File progetto**:
  - `infrastructure/keycloak/docker-compose.keycloak.yml` (Keycloak + Redis)
  - `docker-compose.yml` (full stack - future)
- **Comandi utili**:
  ```bash
  docker compose up -d       # Start in background
  docker compose ps          # List containers
  docker compose logs -f     # Follow logs
  docker compose down -v     # Stop and remove volumes
  ```

### Healthcheck

Endpoint HTTP che indica lo stato di salute di un servizio.

- **Keycloak**: `http://localhost:8090/health/ready`
- **Redis**: `redis-cli PING` → `PONG`
- **Gateway** (future): `GET /health` → `{ status: "up", dependencies: {...} }`
- **Uso**: Load balancer, orchestrator, monitoring

### Environment Variables

Variabili di configurazione esterne al codice per separare config da deployment.

- **File**:
  - `.env` (non committato): Valori locali
  - `.env.example`: Template con placeholder
  - `.env.test.example`: Config per test environment
- **Caricamento**: `dotenv` package, `process.env.*`
- **Best practice**: Validate with schema (Zod, TypeBox), fail-fast on missing required vars

### Redis

In-memory data store usato come session storage, cache, message broker.

- **Uso nel progetto**:
  - Session store per OIDC (via `@fastify/session`)
  - Future: Cache API responses (`async-cache-dedupe`)
- **Persistenza**: AOF (Append Only File) enabled per durability
- **Password**: `REDIS_PASSWORD` env var (default dev: `dev-redis-password`)
- **Port**: 6380 (evita conflitti con Redis di sistema su 6379)

---

## Development Tools

### TypeScript Compiler (tsc)

Compilatore TypeScript che transpila `.ts` → `.js` e valida tipi.

- **Config**: `tsconfig.json`
- **Strict mode**: Enabled (`noImplicitAny`, `strictNullChecks`, etc.)
- **Target**: ES2022 (modern Node.js)
- **Module**: ESM (import/export)
- **Check senza build**: `npx tsc --noEmit`

### ESLint

Linter JavaScript/TypeScript per code quality e security.

- **Config**: `eslint.config.mjs`
- **Plugins**: `@typescript-eslint`, `sonarjs` (complexity), `security`
- **Rules enforced**:
  - `max-lines-per-function`: 50 (ESLint)
  - `cognitive-complexity`: 10 (SonarJS)
  - `no-secrets`: Custom (check-secrets.cjs)
- **Auto-fix**: `npm run lint` (via lint-staged + Husky)

### Prettier

Code formatter per consistenza stilistica.

- **Config**: `package.json` → `prettier` key
- **Settings**: Single quotes, 100 char line, 2-space indent
- **Integration**: ESLint via `eslint-config-prettier` (no conflicts)
- **Auto-format**: On save (VS Code) + pre-commit hook

### Jest

Testing framework JavaScript/TypeScript.

- **Configs**:
  - `jest.config.js`: Unit tests
  - `jest.integration.config.js`: Integration tests (require infrastructure)
  - `jest.e2e.config.js`: End-to-end tests (BDD scenarios)
- **Coverage threshold**: 85% statements, 80% branches
- **Matchers custom**: None (using default + `@jest/globals`)

### Husky

Git hooks manager per pre-commit, pre-push automation.

- **Hooks**:
  - `pre-commit`: Lint-staged, secrets check, features.json update
  - `commit-msg`: Commitlint (conventional commits)
  - `pre-push`: Full test suite
  - `pre-release`: Security audit (npm audit, semgrep, snyk)
- **Config**: `.husky/` directory

### Semantic Release

Tool per versioning automatico basato su conventional commits.

- **Versioning**: SemVer (Major.Minor.Patch)
- **Triggers**:
  - `feat:` → Minor bump (1.0.0 → 1.1.0)
  - `fix:` → Patch bump (1.0.0 → 1.0.1)
  - `BREAKING CHANGE:` → Major bump (1.0.0 → 2.0.0)
- **Output**: Git tag, CHANGELOG.md, GitHub release (future)
- **Run**: `npm run release`

---

## Architectural Patterns

### Dependency Injection

Pattern per iniettare dipendenze esterne invece di crearle internamente.

- **Uso in Fastify**: Plugin system (`app.register()`)
- **Vantaggio**: Testabilità (mock dependencies), loose coupling
- **Esempio**:

  ```typescript
  // ❌ Hard-coded dependency
  const redis = new Redis({ host: 'localhost' });

  // ✅ Injected dependency
  function createRedisClient(options: RedisOptions): Redis {
    return new Redis(options);
  }
  ```

### Repository Pattern

Astrazione per data access layer che separa business logic da storage.

- **Uso futuro**: Patient repository, EHR repository
- **Interfaccia**:
  ```typescript
  interface PatientRepository {
    findById(id: string): Promise<Patient | null>;
    save(patient: Patient): Promise<void>;
  }
  ```
- **Implementazioni**: PostgreSQL, MongoDB, in-memory (test)

### Strategy Pattern

Pattern per selezionare algoritmo a runtime basandosi su configurazione.

- **Uso previsto**: Auth strategy (JWT vs Keycloak)
- **Esempio**:

  ```typescript
  interface AuthStrategy {
    authenticate(request): Promise<User>;
  }

  class JWTStrategy implements AuthStrategy { ... }
  class KeycloakStrategy implements AuthStrategy { ... }

  const strategy = config.authMethod === 'jwt'
    ? new JWTStrategy()
    : new KeycloakStrategy();
  ```

---

## Acronimi e Abbreviazioni

| Acronimo  | Significato                             | Contesto                                |
| --------- | --------------------------------------- | --------------------------------------- |
| **ADR**   | Architecture Decision Record            | Documentazione decisioni architetturali |
| **API**   | Application Programming Interface       | REST endpoints, SDK                     |
| **BDD**   | Behavior-Driven Development             | Gherkin scenarios, acceptance tests     |
| **CSRF**  | Cross-Site Request Forgery              | Security: state parameter in OAuth2     |
| **DRY**   | Don't Repeat Yourself                   | Code quality principle                  |
| **E2E**   | End-to-End                              | Full workflow testing (user → DB)       |
| **ESM**   | ECMAScript Modules                      | `import`/`export` syntax                |
| **HTTP**  | Hypertext Transfer Protocol             | Web protocol (GET, POST, etc.)          |
| **HTTPS** | HTTP Secure                             | Encrypted HTTP (TLS/SSL)                |
| **PKCE**  | Proof Key for Code Exchange             | OAuth2 security extension               |
| **REST**  | Representational State Transfer         | API architectural style                 |
| **SAST**  | Static Application Security Testing     | Code analysis (Semgrep)                 |
| **SLO**   | Service Level Objective                 | Performance target (P95 < 300ms)        |
| **SOLID** | Single responsibility, Open/Closed, ... | OOP design principles                   |
| **TDD**   | Test-Driven Development                 | Red-Green-Refactor cycle                |
| **TTL**   | Time To Live                            | Cache/session expiration time           |
| **UUID**  | Universally Unique Identifier           | 128-bit ID (v4 = random)                |
| **YAGNI** | You Aren't Gonna Need It                | Avoid premature features                |

---

## Link Utili

### Documentazione Esterna

- [Fastify Documentation](https://fastify.dev)
- [Platformatic Watt](https://docs.platformatic.dev/watt)
- [Keycloak Documentation](https://www.keycloak.org/docs/latest/)
- [OAuth2 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)

### Documentazione Progetto

- [Architecture Decision Records](./architecture/decisions/)
- [Features Tracking](../features.json)
- [API Documentation](./api/) (future)
- [Keycloak Setup](../infrastructure/keycloak/README.md)
- [Copilot Instructions](../.github/copilot-instructions.md)

---

**Last Updated**: 2025-12-09  
**Maintainer**: Antonio Cittadino  
**License**: MIT
