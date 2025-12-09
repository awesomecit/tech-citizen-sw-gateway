# Modern Backend Development with AI

## API Gateway Healthcare (Open Source / Enterprise)

**Corso completo per diventare Backend Developer professionista**

---

## Informazioni Corso

|                 |                                  |
| --------------- | -------------------------------- |
| **Livello**     | Da principiante a professionista |
| **Durata**      | ~100 ore di contenuti            |
| **Metodologia** | Project-based learning           |
| **Progetto**    | Tech Citizen SW Gateway          |
| **Lingua**      | Italiano                         |

---

## Cosa Imparerai

Costruirai un **API Gateway production-ready** per il settore healthcare, imparando tutte le tecnologie e le pratiche necessarie per lavorare come Backend Developer in azienda o come freelancer.

---

## Sommario

| #   | Sezione                    | Argomento principale                                   |
| --- | -------------------------- | ------------------------------------------------------ |
| 1   | API Gateway Patterns       | Pattern architetturali, Circuit Breaker, Rate Limiting |
| 2   | Gateway vs Proxy           | Differenze tra componenti infrastrutturali             |
| 3   | Node.js & TypeScript       | Runtime, Event Loop, Undici, TS avanzato               |
| 4   | Protocolli                 | REST, SOAP, HL7, FHIR, MLLP                            |
| 5   | AI-Assisted Development    | Claude, Copilot, NotebookLM, n8n, Devil's Advocate     |
| 6   | Architettura Software      | Microservices, DDD, Sistemi distribuiti                |
| 7   | Monitoring & Observability | Prometheus, Grafana, Loki, Tempo, Y.js                 |
| 8   | Code Patterns              | Clean Code, SOLID, Design Patterns                     |
| 9   | Redis & RabbitMQ           | Cache, Eventi, Lock, Pub/Sub, Topics                   |
| 10  | MinIO/S3                   | Document storage, HL7 documents                        |
| 11  | Autenticazione             | Keycloak, OAuth, LDAP, SSO, RBAC                       |
| 12  | UI Login                   | OAuth flow, Token storage, PKCE                        |
| 13  | UI Dettaglio Utente        | CRUD, Forms, Validation                                |
| 14  | UI Lista Utenti            | Pagination, Filtering, Search                          |
| 15  | Permessi e Routing         | Guards, Feature flags, Capabilities                    |
| 16  | Stato Applicazione         | State management, Sync, Offline                        |
| 17  | Networking                 | DNS, Hetzner, Server management, Cloudflare            |
| 18  | Deploy e Ambienti          | Docker, CI/CD, Multi-environment                       |
| 19  | Git & Trunk-Based          | Branching, Conventional Commits, Hooks                 |
| 20  | Agile & XP                 | Epic/Stories/Tasks, Poker Planning, ADR                |
| 21  | Testing                    | BDD + TDD, Jest, Smoke tests, Flaky tests              |
| 22  | Deploy & Go-Live           | Checklist, Rollback, Post-launch                       |
| 23  | Aspetti Legali             | Licenze, GDPR, Freelancing, Colloqui                   |
| 24  | Contribuire                | Open source, Plugin ideas, Workflow                    |
| 25  | AI Locale & Enterprise     | Stregatto, LLM, Agenti, Reti neurali, n8n              |

---

## Indice del Corso

---

### SEZIONE 1: API Gateway Patterns

**Obiettivo**: Comprendere i pattern architetturali fondamentali

**Contenuti**:

- Cos'è un API Gateway e perché serve
- Pattern: Backend for Frontend, API Composition, Aggregation
- Rate Limiting, Throttling, Circuit Breaker
- Request/Response Transformation
- Retry con exponential backoff
- Service Discovery e Registration
- API Versioning strategies

---

### SEZIONE 2: Gateway vs Proxy vs Load Balancer

**Obiettivo**: Distinguere ruoli e responsabilità dei componenti infrastrutturali

**Contenuti**:

| Componente        | Responsabilità              | Layer |
| ----------------- | --------------------------- | ----- |
| **Reverse Proxy** | Forwarding, TLS termination | L7    |
| **Load Balancer** | Distribuzione carico        | L4/L7 |
| **API Gateway**   | Routing, Auth, Transform    | L7    |

- Quando usare cosa
- Caddy come reverse proxy moderno
- Combinazioni tipiche in produzione
- Edge computing e CDN (Cloudflare)

---

### SEZIONE 3: Node.js, TypeScript e Fondamenti

**Obiettivo**: Padroneggiare il runtime e il linguaggio

**Contenuti**:

**Node.js Core**:

- Event Loop: fasi, microtasks, macrotasks
- libuv e thread pool
- Streams e backpressure
- Buffer e gestione binaria
- Worker threads e Child processes
- Memory management e GC

**Edge Cases Critici**:

- Blocking dell'event loop
- Memory leaks con EventEmitter
- Gestione SIGTERM/SIGINT
- Connection pooling

**Undici HTTP Client**:

- Perché sostituisce http/https nativi
- Connection pooling avanzato
- Pipelining HTTP/1.1
- Timeouts e retry strategies
- Interceptors e hooks

**TypeScript Avanzato**:

- Strict mode e type safety
- Generics e Utility Types
- Type Guards e Narrowing
- Declaration files

**Pseudocodice e Algoritmi**:

- Pensare prima di codificare
- Complessità computazionale basics
- Strutture dati fondamentali

---

### SEZIONE 4: Protocolli di Comunicazione

**Obiettivo**: Conoscere i protocolli enterprise e healthcare

**Contenuti**:

**REST API**:

- Principi RESTful e Richardson Maturity Model
- HTTP methods e status codes
- HATEOAS
- Versionamento API
- OpenAPI/Swagger specification

**SOAP**:

- XML, WSDL, XSD
- Quando si usa ancora (legacy, enterprise, PA)
- Integrazione con sistemi esistenti

**Healthcare Protocols**:

| Protocollo   | Uso                       | Formato        |
| ------------ | ------------------------- | -------------- |
| **HL7 v2.x** | Messaggistica ospedaliera | Pipe-delimited |
| **HL7 FHIR** | API moderne healthcare    | JSON/XML       |
| **MLLP**     | Trasporto HL7 v2          | TCP wrapper    |
| **CDA**      | Documenti clinici         | XML            |

- Struttura messaggi HL7 (MSH, PID, OBX)
- FHIR Resources e RESTful API
- Mappatura HL7 v2 ↔ FHIR
- Compliance e certificazioni

---

### SEZIONE 5: AI-Assisted Development

**Obiettivo**: Usare AI come pair programmer efficace

**Contenuti**:

**Strumenti**:

- **NotebookLM**: generazione contenuti educativi
- **Claude**: code review, architettura, debugging
- **GitHub Copilot**: autocompletamento intelligente
- **Cursor/Antigravity**: IDE AI-powered
- **n8n**: automazioni workflow AI

**Pattern Devil's Advocate**:

- Chiedere critiche, non conferme
- Template: Soluzione → Critiche → Alternative → Decisione
- Quando usarlo: prima di merge, architectural decisions

**Prompt Engineering per Codice**:

- Context preparation efficace
- Specificità: linguaggio, framework, versione
- Limiti degli LLM e come aggirarli

**Ethical AI Development**:

- Responsabilità del codice generato
- Review obbligatoria
- Licensing del codice AI-generated
- Quando NON usare AI

---

### SEZIONE 6: Architettura Software e Sistemi Distribuiti

**Obiettivo**: Progettare sistemi scalabili e resilienti

**Contenuti**:

**Principi Architetturali**:

- Microservices vs Monolith vs Modular Monolith
- Domain-Driven Design basics
- Event-Driven Architecture
- CQRS e Event Sourcing

**Sistemi Distribuiti**:

- CAP Theorem e trade-offs
- Consistency models
- Fallacies of distributed computing
- Idempotenza e at-least-once delivery
- Saga pattern per transazioni

**Pattern di Resilienza**:

- Circuit Breaker
- Bulkhead Isolation
- Timeout Cascading
- Graceful Degradation
- Retry con backoff

---

### SEZIONE 7: Monitoring e Observability

**Obiettivo**: Monitorare applicazioni in produzione

**Contenuti**:

**I Tre Pilastri**:

```
        OBSERVABILITY
             │
    ┌────────┼────────┐
    │        │        │
 METRICS   LOGS    TRACES
    │        │        │
Prometheus  Loki    Tempo
```

**Metriche (APM)**:

- Four Golden Signals
- Prometheus e PromQL
- Custom metrics per business KPIs
- Response time targets (P50, P95, P99)

**Logging Centralizzato**:

- Structured logging con Pino
- Log levels e quando usarli
- Correlation IDs
- Loki per aggregazione

**Distributed Tracing**:

- OpenTelemetry
- Spans e context propagation
- Tempo per storage

**Audit e Compliance**:

- Audit logging per healthcare
- Retention policies (GDPR, HIPAA)
- Immutabilità dei log

**Revisioni e Conflict Resolution**:

- Y.js per collaborazione real-time
- CRDT (Conflict-free Replicated Data Types)
- Operational Transform
- Merge strategies

**Grafana**:

- Dashboards e visualizzazioni
- Alerting e runbooks
- Unified observability

---

### SEZIONE 8: Code Patterns e Implementazione

**Obiettivo**: Scrivere codice pulito e manutenibile

**Contenuti**:

**Clean Code**:

- Naming conventions
- Functions: piccole, single responsibility
- Early returns vs nested conditionals
- Named constants vs magic numbers

**SOLID Principles**:

- Single Responsibility
- Open/Closed
- Liskov Substitution
- Interface Segregation
- Dependency Inversion

**Design Patterns per Backend**:

- Repository Pattern
- Factory Pattern
- Strategy Pattern
- Decorator Pattern
- Observer Pattern

**Error Handling**:

- Never return null
- Custom error types
- Error boundaries
- Graceful degradation

**Paradigmi di Programmazione**:

- Imperativo vs Dichiarativo
- Functional Programming basics
- OOP quando serve

---

### SEZIONE 9: Redis e RabbitMQ

**Obiettivo**: Implementare caching ed eventi

**Contenuti**:

**Redis - Use Cases**:

| Use Case       | Struttura Dati | Pattern        |
| -------------- | -------------- | -------------- |
| **Cache**      | String/Hash    | Cache-aside    |
| **Session**    | String         | TTL-based      |
| **Rate Limit** | Sorted Set     | Sliding window |
| **Lock**       | String         | Redlock        |
| **Pub/Sub**    | Channels       | Broadcasting   |
| **Queue**      | List           | LPUSH/BRPOP    |

**RabbitMQ - Use Cases**:

| Use Case       | Exchange | Pattern          |
| -------------- | -------- | ---------------- |
| **Work Queue** | Default  | Round-robin      |
| **Pub/Sub**    | Fanout   | Broadcast        |
| **Routing**    | Direct   | Selective        |
| **Topics**     | Topic    | Pattern matching |
| **RPC**        | Default  | Reply queue      |

**Implementazioni**:

- async-cache-dedupe per deduplica
- CloudEvents standard
- Dead Letter Queues
- Message acknowledgment
- Retry policies

---

### SEZIONE 10: MinIO/S3 e Gestione Documenti

**Obiettivo**: Gestire file e documenti in modo scalabile

**Contenuti**:

**S3 API**:

- Buckets, objects, prefixes
- Pre-signed URLs
- Multipart upload
- Lifecycle policies
- Versioning

**MinIO**:

- S3-compatible self-hosted
- Setup e configurazione
- High availability

**Healthcare Documents**:

- HL7 CDA (Clinical Document Architecture)
- PDF/A per archiviazione
- DICOM per imaging (basics)
- Retention policies compliance
- Encryption at rest/transit

---

### SEZIONE 11: Autenticazione e Gestione Utenti

**Obiettivo**: Implementare identity management enterprise-grade

**Contenuti**:

**Protocolli**:

- OAuth 2.0 (flows: Authorization Code, PKCE, Client Credentials)
- OpenID Connect (OIDC)
- SAML 2.0 (enterprise SSO)
- JWT structure e validation

**Keycloak**:

- Realms e isolation
- Clients e scopes
- Identity Providers
- User Federation
- Custom attributes
- Themes e branding

**LDAP Integration**:

- Directory structure (DN, CN, OU)
- Bind e search operations
- Active Directory integration

**SSO/SLO**:

- Single Sign-On flow
- Single Logout challenges
- Session management

**RBAC**:

- Roles e permissions
- Role hierarchy
- Custom capabilities
- Policy enforcement

---

### SEZIONE 12: UI - Vista Login

**Obiettivo**: Implementare autenticazione lato frontend

**Contenuti**:

- OAuth/OIDC flow da browser
- PKCE per SPA
- Token storage (httpOnly cookies vs localStorage)
- Refresh token rotation
- Silent refresh
- Logout e session cleanup
- Error handling UX

---

### SEZIONE 13: UI - Dettaglio Utente (CRUD)

**Obiettivo**: Creare interfacce per gestione dati

**Contenuti**:

- Form validation patterns
- Optimistic updates
- Error states
- Loading states
- Confirmation dialogs
- Audit trail visualization

---

### SEZIONE 14: UI - Lista Utenti e Filtri

**Obiettivo**: Implementare liste e ricerche performanti

**Contenuti**:

- Pagination (offset vs cursor)
- Sorting multi-column
- Filtering avanzato
- Debounced search
- URL state sync
- Export functionality

---

### SEZIONE 15: Visibilità, Permessi e Routing

**Obiettivo**: Controllare accesso e navigazione

**Contenuti**:

- Route guards
- Permission-based rendering
- Feature flags
- Capability-based visibility
- Role-based navigation
- Deep linking con auth

---

### SEZIONE 16: Gestione Stato Applicazione UI

**Obiettivo**: Gestire stato in applicazioni complesse

**Contenuti**:

- Local vs Global state
- Server state vs Client state
- State machines (XState basics)
- Caching client-side
- Sync con backend
- Offline support basics

---

### SEZIONE 17: Networking e Infrastructure

**Obiettivo**: Gestire reti e server

**Contenuti**:

**Networking Fundamentals**:

- TCP/IP stack
- DNS resolution
- TLS/SSL handshake
- Ports, sockets, binding (127.0.0.1 vs 0.0.0.0)
- NAT e port forwarding

**DNS e Domini**:

- Record types (A, AAAA, CNAME, MX, TXT)
- TTL e propagazione
- Registrar e WHOIS
- Subdomini e wildcard

**Cloudflare**:

- Proxy mode vs DNS-only
- SSL modes
- WAF e rate limiting
- DDoS protection
- Workers basics

**Hetzner Cloud**:

- Server types e pricing
- hcloud CLI
- SSH keys management
- Floating IPs
- Private Networks
- Firewall rules
- Snapshots e backups

**Server Management**:

- Initial setup e hardening
- UFW firewall
- Fail2Ban
- Unattended upgrades
- User management
- SSH best practices

**Hetzner Simulation**:

- Emulare produzione in locale
- Cloudflare simulator
- Docker network isolation
- Testing failover

---

### SEZIONE 18: Deploy e Ambienti

**Obiettivo**: Automatizzare deployment multi-environment

**Contenuti**:

**Ambienti**:

```
DEV ──▶ TEST ──▶ STAGING ──▶ PRODUCTION
 │        │         │            │
local   CI/CD    Hetzner      Hetzner
         │       (preview)    (live)
      isolated
```

**Docker**:

- Dockerfile best practices
- Multi-stage builds
- Compose per environment
- Health checks
- Resource limits

**Automazioni**:

- n8n workflows
- Jenkins pipelines
- GitHub Actions
- Ansible playbooks
- Bash scripts

**CI/CD Pipeline**:

- Lint → Test → Build → Security → Deploy
- Quality gates
- Rollback strategies
- Blue/Green deployment
- Canary releases

---

### SEZIONE 19: Git e Trunk-Based Development

**Obiettivo**: Gestire codice con workflow professionali

**Contenuti**:

**Git Fundamentals**:

- Branching e merging
- Rebase vs merge
- Cherry-pick
- Stash
- Bisect per debugging

**Trunk-Based Development**:

```
main ─────●─────●─────●─────●─────●─────▶
          │     │     │     │     │
         feat  fix   feat  feat  fix
        (short-lived branches)
```

- Feature flags per WIP
- Short-lived branches (< 1 giorno)
- Continuous Integration
- Release branches quando serve

**Conventional Commits**:

- feat, fix, docs, style, refactor, test, chore
- Scope e breaking changes
- Auto-changelog generation
- Semantic versioning

**Hooks e Automazioni**:

- Pre-commit (lint, format)
- Commit-msg (validation)
- Pre-push (tests)
- Husky + lint-staged

---

### SEZIONE 20: Agile e Project Management

**Obiettivo**: Gestire progetti software efficacemente

**Contenuti**:

**Struttura Lavoro**:

```
EPIC (settimane/mesi)
  │
  ├── STORY (giorni)
  │     │
  │     ├── TASK (ore)
  │     └── TASK
  │
  └── STORY
        │
        └── TASK
```

**User Stories**:

- Template: As a [role], I want [feature], so that [benefit]
- Acceptance Criteria (Given/When/Then)
- Definition of Done
- INVEST criteria

**Planning Poker**:

- Fibonacci sequence (1, 2, 3, 5, 8, 13, 21)
- Story Points vs ore
- Velocità del team
- Capacity planning

**Extreme Programming (XP)**:

- Values: Communication, Simplicity, Feedback, Courage, Respect
- Practices: TDD, Pair Programming, CI, Small Releases
- YAGNI principle

**Architecture Decision Records (ADR)**:

- Documentare decisioni
- Template: Context → Decision → Consequences
- Lifecycle: Proposed → Accepted → Deprecated

---

### SEZIONE 21: Testing Strategies

**Obiettivo**: Implementare testing completo con BDD + TDD

**Contenuti**:

**La Nostra Strategia**:

```
┌─────────────────────────────────────────────────────────┐
│                    ACCEPTANCE LEVEL                      │
│                                                          │
│   BDD (Behavior-Driven Development)                     │
│   ├── Gherkin scenarios                                 │
│   ├── Acceptance Criteria dei Task                      │
│   └── Linguaggio condiviso con stakeholder              │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  IMPLEMENTATION LEVEL                    │
│                                                          │
│   TDD (Test-Driven Development) con Jest                │
│   ├── Unit tests                                        │
│   ├── Integration tests                                 │
│   └── Red → Green → Refactor                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   DEPLOYMENT LEVEL                       │
│                                                          │
│   Smoke Tests                                           │
│   ├── Post-deploy verification                          │
│   ├── Critical path validation                          │
│   └── Health check automation                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**BDD per Acceptance Criteria**:

Ogni Task ha acceptance criteria scritti in Gherkin:

```gherkin
Feature: Patient API Authentication

  Scenario: Valid token grants access
    Given a user with role "doctor"
    And a valid JWT token
    When the user requests GET /api/patients/123
    Then the response status should be 200
    And the response should contain patient data

  Scenario: Expired token is rejected
    Given a user with an expired JWT token
    When the user requests GET /api/patients/123
    Then the response status should be 401
    And the response should contain "Token expired"
```

- Linguaggio comprensibile da tutti
- Documentazione vivente
- Contratto tra dev e stakeholder
- Cucumber per esecuzione automatica

**TDD con Jest**:

Workflow quotidiano dello sviluppatore:

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│   RED   │────▶│  GREEN  │────▶│REFACTOR │
│         │     │         │     │         │
│  Write  │     │  Write  │     │ Clean   │
│ failing │     │ minimal │     │  code   │
│  test   │     │  code   │     │         │
└─────────┘     └─────────┘     └────┬────┘
                                     │
                                     ▼
                              Back to RED
                            (next test case)
```

- Jest come framework principale
- Test isolation (ogni test indipendente)
- Mocking con jest.mock()
- Snapshot testing quando appropriato
- Coverage target: 80% (non 100%)

**Smoke Tests**:

Verifiche post-deploy automatiche:

```
Deploy ──▶ Smoke Tests ──▶ [PASS] ──▶ Traffic ON
                │
                └──▶ [FAIL] ──▶ Rollback automatico
```

Cosa verificano:

- Health endpoint risponde
- Database connection attiva
- Redis raggiungibile
- Auth service funzionante
- Critical API paths operativi

Caratteristiche:

- Veloci (< 30 secondi totali)
- Non invasivi (no side effects)
- Eseguiti ad ogni deploy
- Alert immediato se falliscono

**Gestione Test Flaky**:

Test flaky = test che a volte passa, a volte fallisce

```
┌─────────────────────────────────────────────────────────┐
│                 FLAKY TEST DETECTION                     │
│                                                          │
│   Test Run 1:  ✓ PASS                                   │
│   Test Run 2:  ✗ FAIL   ◀── FLAKY!                     │
│   Test Run 3:  ✓ PASS                                   │
│   Test Run 4:  ✗ FAIL                                   │
└─────────────────────────────────────────────────────────┘
```

Cause comuni:

- Timing issues (race conditions)
- Shared state tra test
- External dependencies
- Date/time dependent
- Random data senza seed

Strategie di gestione:

| Strategia          | Quando usarla                          |
| ------------------ | -------------------------------------- |
| **Quarantine**     | Isolare e marcare come skip temporaneo |
| **Retry**          | jest.retryTimes(3) per CI              |
| **Fix root cause** | Sempre preferibile                     |
| **Delete**         | Se non porta valore                    |

Best practices:

- CI monitora flaky rate
- Dashboard con storico fallimenti
- Ownership: chi rompe, sistema
- Timeout espliciti, mai impliciti
- Mock delle dipendenze esterne
- Seed per dati random

**Test Pyramid**:

```
                    ╱╲
                   ╱  ╲           E2E / BDD
                  ╱    ╲          (pochi, lenti)
                 ╱──────╲         ~10%
                ╱        ╲
               ╱          ╲       Integration
              ╱────────────╲      (medi)
             ╱              ╲     ~20%
            ╱                ╲
           ╱                  ╲   Unit / TDD
          ╱────────────────────╲  (molti, veloci)
                                  ~70%
```

**Jest Configuration**:

| Config          | Valore  | Motivo                   |
| --------------- | ------- | ------------------------ |
| testTimeout     | 5000ms  | Fail fast                |
| maxWorkers      | 50%     | Parallelismo controllato |
| clearMocks      | true    | Isolation                |
| collectCoverage | CI only | Performance locale       |
| bail            | 1 (CI)  | Stop al primo fail       |

---

### SEZIONE 22: Deploy e Go-Live POC

**Obiettivo**: Portare un progetto in produzione

**Contenuti**:

**Pre-Launch Checklist**:

- [ ] Tutti i test passano
- [ ] Security scan completato
- [ ] Performance testing
- [ ] Backup strategy attiva
- [ ] Monitoring configurato
- [ ] Alerting attivo
- [ ] Runbooks documentati
- [ ] Rollback testato

**Go-Live Steps**:

1. Final staging verification
2. Database migrations
3. DNS switch / Load balancer update
4. Smoke tests
5. Monitoring watch
6. Gradual traffic increase

**Post-Launch**:

- Monitoring intensivo (24-48h)
- Hotfix process
- Retrospettiva
- Documentation update

---

### SEZIONE 23: Aspetti Legali e Business

**Obiettivo**: Navigare gli aspetti legali dello sviluppo software

**Contenuti**:

**Licenze Software**:

| Licenza    | Permissiva | Copyleft  | Commerciale |
| ---------- | ---------- | --------- | ----------- |
| MIT        | ✅         | ❌        | ✅          |
| Apache 2.0 | ✅         | ❌        | ✅          |
| GPL-3.0    | ❌         | ✅ Strong | ✅          |
| AGPL-3.0   | ❌         | ✅ Strong | ✅          |

- Gestione licenze nel progetto
- SBOM (Software Bill of Materials)
- License audit tools
- Dual licensing

**Open Source Business**:

- Modelli: Open Core, Support, SaaS, Dual Licensing
- Come contribuire efficacemente
- Building reputation
- Maintainer responsibilities

**Mercato del Lavoro**:

- Tipologie: dipendente, freelancer, contractor, consulente
- CV tech efficace
- Portfolio e GitHub profile
- Networking

**Colloqui Tecnici**:

- Fasi tipiche del processo
- System design interviews
- Behavioral interviews (STAR method)
- Domande da fare
- Red flags aziendali

**Freelancing e P.IVA**:

- Regime forfettario vs ordinario
- INPS Gestione Separata
- Fatturazione elettronica
- Contratti tipo (NDA, SLA)

**Assicurazioni per Freelancer**:

- RC Professionale
- Tutela legale
- Infortuni
- Cyber Risk

**AI e Privacy**:

- Responsabilità codice AI-generated
- Copyright e licensing
- Disclosure requirements
- AI Act (EU) overview

**GDPR Compliance**:

- Principi fondamentali
- Basi legali per trattamento
- Diritti degli interessati
- Data breach (72h)
- Privacy by Design
- DPIA

**Healthcare Compliance**:

- HIPAA basics (clienti USA)
- MDR per software medicale
- Certificazione CE

**Checklist App EU**:

- [ ] Privacy Policy
- [ ] Cookie Policy con consenso granulare
- [ ] Terms of Service
- [ ] Export dati utente (portabilità)
- [ ] Cancellazione account
- [ ] Audit log
- [ ] Encryption at rest/transit

---

### SEZIONE 24: Contribuire al Progetto

**Obiettivo**: Partecipare attivamente allo sviluppo open source

**Contenuti**:

**Aree di Contribuzione**:

| Area           | Skill               | Esempi                   |
| -------------- | ------------------- | ------------------------ |
| Core Gateway   | TypeScript, Fastify | Routing, Circuit Breaker |
| Infrastructure | Docker, Caddy       | Compose, TLS config      |
| Observability  | Prometheus, Grafana | Dashboards, alerts       |
| Documentation  | Markdown, Mermaid   | API docs, tutorials      |
| Testing        | Jest, Cucumber      | Coverage, E2E            |
| Security       | DevSecOps           | Audit, hardening         |
| Healthcare     | HL7, FHIR           | Protocol adapters        |

**Good First Issues**:

- Migliorare error messages
- Aggiungere test cases
- Documentare configurazioni
- Tradurre documentazione
- Creare dashboards Grafana

**Plugin Ideas**:

- Audit logging plugin
- Request transformation
- HL7 MLLP adapter
- FHIR proxy
- Rate limiting avanzato

**Workflow**:

1. Fork repository
2. Create branch (feature/, fix/, docs/)
3. Develop with tests
4. Open Pull Request
5. Code review
6. Merge!

---

### SEZIONE 25: AI Locale e Architetture Enterprise

**Obiettivo**: Implementare AI on-premise e flussi automatizzati enterprise

**Contenuti**:

**Perché AI Locale**:

| Aspetto       | Cloud AI          | Local AI                |
| ------------- | ----------------- | ----------------------- |
| Privacy       | Dati escono       | Dati restano on-premise |
| Latenza       | Network dependent | Milliseconds            |
| Costi         | Pay per token     | Hardware una tantum     |
| Compliance    | Complesso (GDPR)  | Semplificato            |
| Customization | Limitato          | Fine-tuning possibile   |
| Offline       | No                | Sì                      |

**Stregatto (StreLLM)**:

Framework italiano per LLM locali:

- Orchestrazione modelli locali
- Plugin architecture
- Memory management
- Tool calling
- Multi-model routing

Architettura:

```
┌─────────────────────────────────────────────────────────┐
│                      STREGATTO                           │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Memory    │  │   Plugins   │  │    Tools    │     │
│  │  (Vector DB)│  │  (Custom)   │  │  (Actions)  │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          ▼                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │              LLM Router / Orchestrator             │ │
│  └───────────────────────┬───────────────────────────┘ │
│                          │                              │
│         ┌────────────────┼────────────────┐            │
│         ▼                ▼                ▼            │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐      │
│  │  Llama 3  │    │  Mistral  │    │  Phi-3    │      │
│  │  (70B)    │    │  (7B)     │    │  (3.8B)   │      │
│  └───────────┘    └───────────┘    └───────────┘      │
└─────────────────────────────────────────────────────────┘
```

**Fondamenti Reti Neurali**:

Architettura base di un neurone:

```
Inputs         Weights        Activation
  x1 ────┐
         │ w1
  x2 ────┼────▶ Σ(xi * wi) + b ────▶ f(x) ────▶ Output
         │ w2
  x3 ────┘ w3

  f(x) = activation function (ReLU, Sigmoid, Tanh)
```

Concetti chiave:

- Layers (input, hidden, output)
- Forward propagation
- Backpropagation
- Loss functions
- Gradient descent
- Overfitting e regularization

**Large Language Models (LLM)**:

Architettura Transformer semplificata:

```
┌─────────────────────────────────────────────────────────┐
│                      TRANSFORMER                         │
│                                                          │
│   Input ──▶ Tokenizer ──▶ Embeddings                    │
│                              │                           │
│                              ▼                           │
│   ┌─────────────────────────────────────────────────┐   │
│   │              ATTENTION LAYERS (xN)               │   │
│   │                                                  │   │
│   │   Q ──┐                                         │   │
│   │       │                                         │   │
│   │   K ──┼──▶ Attention ──▶ Feed Forward ──▶ ...  │   │
│   │       │                                         │   │
│   │   V ──┘                                         │   │
│   └─────────────────────────────────────────────────┘   │
│                              │                           │
│                              ▼                           │
│   Output ◀── Softmax ◀── Linear                         │
└─────────────────────────────────────────────────────────┘
```

Parametri chiave:

- Context window (quanti token in input)
- Parameters (7B, 13B, 70B, etc.)
- Temperature (creatività)
- Top-p / Top-k (sampling)

Modelli locali popolari:

| Modello     | Parametri | VRAM | Use Case        |
| ----------- | --------- | ---- | --------------- |
| Phi-3 Mini  | 3.8B      | 4GB  | Edge, mobile    |
| Llama 3 8B  | 8B        | 8GB  | General purpose |
| Mistral 7B  | 7B        | 8GB  | Code, reasoning |
| Llama 3 70B | 70B       | 48GB | Enterprise      |
| CodeLlama   | 34B       | 24GB | Code generation |

**AI Agents**:

Architettura di un agente:

```
┌─────────────────────────────────────────────────────────┐
│                       AI AGENT                           │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │                   PLANNING                       │   │
│  │   Goal ──▶ Task Decomposition ──▶ Action Plan   │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│                          ▼                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │                   EXECUTION                      │   │
│  │                                                  │   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐       │   │
│  │   │  Tool 1 │  │  Tool 2 │  │  Tool 3 │       │   │
│  │   │ (Search)│  │ (Code)  │  │ (API)   │       │   │
│  │   └─────────┘  └─────────┘  └─────────┘       │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│                          ▼                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │                   MEMORY                         │   │
│  │   Short-term (context) + Long-term (vector DB)  │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│                          ▼                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │                  REFLECTION                      │   │
│  │   Evaluate results ──▶ Adjust strategy          │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

Pattern agentici:

- ReAct (Reasoning + Acting)
- Plan-and-Execute
- Self-Reflection
- Multi-Agent collaboration

**AI Generativa**:

Applicazioni:

- Text generation (documenti, report)
- Code generation (assistenza sviluppo)
- Image generation (Stable Diffusion locale)
- Data augmentation
- Synthetic test data

Healthcare use cases:

- Report generation da dati strutturati
- Summarization cartelle cliniche
- Assistente per coding HL7/FHIR
- Anomaly detection

**Flussi Automatizzati Enterprise**:

Architettura n8n + AI:

```
┌─────────────────────────────────────────────────────────┐
│                    n8n WORKFLOW                          │
│                                                          │
│   Trigger ──▶ Process ──▶ AI Step ──▶ Action           │
│                              │                           │
│                              ▼                           │
│   ┌─────────────────────────────────────────────────┐   │
│   │              AI INTEGRATION                      │   │
│   │                                                  │   │
│   │   ┌─────────┐  ┌─────────┐  ┌─────────┐       │   │
│   │   │ Claude  │  │ Local   │  │ Custom  │       │   │
│   │   │  API    │  │   LLM   │  │  Model  │       │   │
│   │   └─────────┘  └─────────┘  └─────────┘       │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

Use cases enterprise:

- Document processing pipeline
- Automated code review
- Ticket classification e routing
- Report generation scheduled
- Data validation con AI
- Alert triage automatico

Esempio flusso healthcare:

```
HL7 Message ──▶ Parse ──▶ Validate ──▶ AI Enrich ──▶ FHIR
     │                                      │
     │                              ┌───────┴───────┐
     │                              ▼               ▼
     │                         Add context    Flag anomalies
     │                                              │
     └──────────────────────────────────────────────┘
                                                    │
                                               Store + Alert
```

**Infrastruttura per AI Locale**:

Hardware consigliato:

| Livello    | GPU      | VRAM | Modelli supportati |
| ---------- | -------- | ---- | ------------------ |
| Entry      | RTX 3060 | 12GB | 7B quantizzati     |
| Mid        | RTX 4080 | 16GB | 13B, 7B full       |
| Pro        | RTX 4090 | 24GB | 34B quantizzati    |
| Enterprise | A100     | 80GB | 70B+ full          |

Software stack:

- Ollama (gestione modelli)
- LangChain / LlamaIndex (orchestrazione)
- ChromaDB / Qdrant (vector store)
- vLLM (inference server)
- Text Generation WebUI (interfaccia)

**Considerazioni Enterprise**:

| Aspetto           | Soluzione                   |
| ----------------- | --------------------------- |
| Scalabilità       | Kubernetes + GPU nodes      |
| High Availability | Model replicas              |
| Monitoring        | Prometheus + custom metrics |
| Security          | Network isolation, audit    |
| Compliance        | On-premise, data residency  |
| Cost              | TCO analysis vs cloud       |

---

## Diagrammi Architetturali

### Architettura Sistema

```
                         INTERNET
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      CLOUDFLARE                         │
│              DNS │ CDN │ WAF │ DDoS                     │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    HETZNER CLOUD                        │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │                     CADDY                          │ │
│  │              TLS Termination + Routing             │ │
│  └───────────────────────┬───────────────────────────┘ │
│                          │                              │
│  ┌───────────────────────▼───────────────────────────┐ │
│  │              PLATFORMATIC WATT                     │ │
│  │  ┌─────────────────────────────────────────────┐  │ │
│  │  │            FASTIFY GATEWAY                   │  │ │
│  │  │   Router │ Auth │ Circuit Breaker │ Rate    │  │ │
│  │  └─────────────────────────────────────────────┘  │ │
│  └───────────────────────┬───────────────────────────┘ │
│                          │                              │
│            ┌─────────────┼─────────────┐               │
│            ▼             ▼             ▼               │
│     ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│     │ Patient  │  │ Document │  │   Auth   │         │
│     │   API    │  │   API    │  │   API    │         │
│     └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│          │             │             │                │
│  ┌───────▼─────────────▼─────────────▼───────┐       │
│  │         INFRASTRUCTURE SERVICES            │       │
│  │  Redis │ RabbitMQ │ MinIO │ Keycloak      │       │
│  └────────────────────────────────────────────┘       │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │              OBSERVABILITY STACK                   │ │
│  │     Prometheus │ Loki │ Tempo │ Grafana           │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Request Flow

```
Client ──▶ Cloudflare ──▶ Caddy ──▶ Gateway ──▶ Service
                                       │
                              ┌────────┴────────┐
                              ▼                 ▼
                         [Cache Hit]      [Cache Miss]
                              │                 │
                              │           Validate Token
                              │                 │
                              │           Call Backend
                              │                 │
                              │           Store Cache
                              │                 │
                              ◀─────────────────┘
                              │
                        Return Response
```

### Circuit Breaker

```
         ┌──────────────────────────────┐
         │     CLOSED (normal)          │
         │     Requests pass through    │
         └──────────────┬───────────────┘
                        │ Failures >= threshold
                        ▼
         ┌──────────────────────────────┐
         │     OPEN (tripped)           │
         │     Requests fail fast       │
         └──────────────┬───────────────┘
                        │ Timeout expires
                        ▼
         ┌──────────────────────────────┐
         │     HALF-OPEN (testing)      │◀──┐
         │     Limited requests         │   │ Test fails
         └──────────────┬───────────────┘───┘
                        │ Test succeeds
                        ▼
                   Back to CLOSED
```

### CI/CD Pipeline

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│   DEV    │──▶│    CI    │──▶│    CD    │──▶│  VERIFY  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
     │              │              │              │
  Commit       Lint/Test       Deploy         Smoke
     │          Build        Staging/Prod      Tests
     │         Security                        Health
     │          Scan                          Monitor
```

### Event-Driven (RabbitMQ)

```
┌──────────────────────────────────────────────────────┐
│                     PRODUCERS                         │
│      Gateway    Patient API    Document API          │
└──────────┬───────────┬───────────────┬───────────────┘
           │           │               │
           ▼           ▼               ▼
┌──────────────────────────────────────────────────────┐
│                 RABBITMQ EXCHANGE                     │
│                    (topic type)                       │
│                                                       │
│   patient.created ───▶ notification.queue            │
│   patient.updated ───▶ audit.queue                   │
│   document.* ────────▶ analytics.queue               │
│                                                       │
│   [failed messages] ──▶ Dead Letter Queue            │
└──────────────────────────────────────────────────────┘
           │           │               │
           ▼           ▼               ▼
┌──────────────────────────────────────────────────────┐
│                     CONSUMERS                         │
│   Notification     Audit        Analytics            │
│     Service       Service        Service             │
└──────────────────────────────────────────────────────┘
```

### OAuth 2.0 + PKCE

```
User          App              Gateway         Keycloak
 │             │                  │                │
 │──Click───▶ │                  │                │
 │            │──Auth Request + code_challenge──▶│
 │◀───────────────────Login Page─────────────────│
 │──Credentials─────────────────────────────────▶│
 │            │◀──────Authorization Code─────────│
 │            │──Token Request + code_verifier──▶│
 │            │◀──────Access + Refresh Token─────│
 │◀─Logged───│                  │                │
 │            │──API + Token───▶│──Validate─────▶│
 │            │◀──Response──────│◀───Valid───────│
```

### Observability Stack

```
┌─────────────────────────────────────────────────┐
│                  APPLICATIONS                    │
│     Gateway :3042    Patient :3043   Doc :3044  │
└────────┬─────────────────┬─────────────┬────────┘
         │ metrics         │ logs        │ traces
         ▼                 ▼             ▼
┌─────────────────────────────────────────────────┐
│            OpenTelemetry Collector               │
└────────┬─────────────────┬─────────────┬────────┘
         │                 │             │
         ▼                 ▼             ▼
┌─────────────┐    ┌─────────────┐  ┌─────────────┐
│ Prometheus  │    │    Loki     │  │    Tempo    │
│  (Metrics)  │    │   (Logs)    │  │  (Traces)   │
└──────┬──────┘    └──────┬──────┘  └──────┬──────┘
       │                  │                │
       └──────────────────┼────────────────┘
                          ▼
                   ┌─────────────┐
                   │   GRAFANA   │
                   │ Dashboards  │
                   │   Alerts    │
                   └──────┬──────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
           Slack       Email      PagerDuty
```

### RBAC Model

```
┌─────────────────────────────────────────────────┐
│                    USERS                         │
│        Admin        Doctor        Nurse         │
└────────┬────────────┬────────────┬──────────────┘
         │            │            │
         ▼            ▼            ▼
┌─────────────────────────────────────────────────┐
│                    ROLES                         │
│        admin        doctor        nurse         │
└────────┬────────────┬────────────┬──────────────┘
         │            │            │
         ▼            ▼            ▼
┌─────────────────────────────────────────────────┐
│                 PERMISSIONS                      │
│                                                  │
│  patient:read    ✓ A  ✓ D  ✓ N                 │
│  patient:write   ✓ A  ✓ D  ✗ N                 │
│  patient:delete  ✓ A  ✗ D  ✗ N                 │
│  document:read   ✓ A  ✓ D  ✓ N                 │
│  document:write  ✓ A  ✓ D  ✗ N                 │
│  user:manage     ✓ A  ✗ D  ✗ N                 │
│                                                  │
│  Legend: A=Admin  D=Doctor  N=Nurse             │
└─────────────────────────────────────────────────┘
```

### Trunk-Based Development

```
main ────●────●────●────●────●────●────●────▶ releases
         │    │    │    │    │    │    │
        feat fix  feat feat fix  feat fix
         │    │    │    │    │    │    │
         └────┴────┴────┴────┴────┴────┘
              (short-lived branches)
              (merged same day)
              (feature flags for WIP)
```

### AI Locale Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                     │
│                                                          │
│   Gateway ◀──────▶ n8n Workflows ◀──────▶ Services      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   ORCHESTRATION LAYER                    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              STREGATTO / LangChain               │   │
│  │                                                  │   │
│  │   Planning ──▶ Execution ──▶ Memory ──▶ Tools   │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   OLLAMA    │  │  VECTOR DB  │  │   TOOLS     │
│             │  │             │  │             │
│  Llama 3    │  │  ChromaDB   │  │  Search     │
│  Mistral    │  │  Qdrant     │  │  Code       │
│  CodeLlama  │  │             │  │  API calls  │
└─────────────┘  └─────────────┘  └─────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│                    HARDWARE LAYER                        │
│                                                          │
│   GPU (CUDA) ◀──▶ VRAM ◀──▶ System RAM ◀──▶ Storage    │
│                                                          │
│   RTX 4090 (24GB) = 34B quantized models               │
│   A100 (80GB) = 70B+ full precision                    │
└─────────────────────────────────────────────────────────┘
```

### Test Pyramid con BDD + TDD

```
                    ╱╲
                   ╱  ╲           E2E / BDD (Cucumber)
                  ╱    ╲          Acceptance Criteria
                 ╱──────╲         ~10% │ Slow
                ╱        ╲              │
               ╱          ╲       Integration Tests
              ╱────────────╲      API + DB + Services
             ╱              ╲     ~20% │ Medium
            ╱                ╲
           ╱                  ╲   Unit Tests / TDD (Jest)
          ╱────────────────────╲  Red-Green-Refactor
                                  ~70% │ Fast

        ──────────────────────────────────────────
        Smoke Tests (Post-Deploy)
        Health checks, Critical paths
        ~5 tests │ Very Fast
```

---

## Prerequisiti

**Minimi**:

- Saper usare un editor di testo
- Capire cos'è una variabile e un loop
- Aver visto un terminale

**Consigliati**:

- Aver scritto almeno 1 script
- Sapere cos'è JSON
- Conoscenza base di HTML

**Hardware**:

- 8GB RAM (16GB consigliato)
- 50GB spazio disco
- Connessione internet

---

## Tecnologie del Corso

| Layer          | Tecnologia           | Versione |
| -------------- | -------------------- | -------- |
| Runtime        | Node.js              | 22+      |
| Language       | TypeScript           | 5.7+     |
| Framework      | Fastify              | 5.x      |
| Orchestrator   | Platformatic Watt    | 3.x      |
| Reverse Proxy  | Caddy                | 2.x      |
| Cache          | Redis                | 7.x      |
| Message Broker | RabbitMQ             | 3.13+    |
| Storage        | MinIO                | latest   |
| Auth           | Keycloak             | 24+      |
| Monitoring     | Prometheus + Grafana | latest   |
| Logging        | Loki                 | latest   |
| Tracing        | Tempo                | latest   |
| Containers     | Docker + Compose     | latest   |
| Testing        | Jest + Cucumber      | latest   |
| AI Cloud       | Claude API           | latest   |
| AI Local       | Ollama + Stregatto   | latest   |
| Automation     | n8n                  | latest   |
| Vector DB      | ChromaDB             | latest   |

---

## Struttura Progetto

```
tech-citizen-sw-gateway/
├── services/
│   ├── gateway/              # API Gateway
│   ├── patient-api/          # Patient service
│   └── document-api/         # Document service
├── packages/
│   ├── cache/                # Redis utilities
│   ├── events/               # RabbitMQ + CloudEvents
│   ├── telemetry/            # OpenTelemetry
│   ├── hl7/                  # HL7/FHIR adapters
│   └── ai/                   # AI integrations
├── infrastructure/
│   ├── caddy/
│   ├── prometheus/
│   ├── grafana/
│   ├── ollama/               # Local LLM setup
│   └── docker-compose.yml
├── e2e/
│   └── features/             # BDD scenarios (Gherkin)
├── tests/
│   ├── unit/                 # Jest unit tests (TDD)
│   ├── integration/          # Integration tests
│   ├── smoke/                # Post-deploy smoke tests
│   └── fixtures/             # Test data factories
├── workflows/
│   └── n8n/                  # Automation workflows
├── docs/
│   └── architecture/
│       └── decisions/        # ADRs
└── scripts/                  # Automations
```

---

## Progetti Futuri (Corsi Avanzati)

Una volta acquisite le basi di questo corso, i seguenti progetti verranno realizzati in corsi dedicati:

### Collaborative Editor (stile Google Docs)

Applicazione di editing collaborativo real-time con focus su interoperabilità e funzionalità offline.

**Tecnologie**: Y.js, CRDT, WebSocket, IndexedDB, Service Workers

**Funzionalità**:

- Real-time collaboration multi-utente
- Conflict resolution automatica (CRDT)
- Offline-first con sync automatico
- Interoperabilità tra dispositivi e piattaforme
- Version history e rollback

### Smart Calendar (stile Google Calendar + AI)

Sistema di calendario intelligente con AI per riprogrammazione automatica e gestione conflitti.

**Tecnologie**: Tree structures, Constraint Satisfaction, LLM integration, Event Sourcing

**Funzionalità**:

- Strutture ad albero per eventi gerarchici
- Pattern di risoluzione conflitti (priority-based, constraint-based)
- AI live rescheduling con considerazione di:
  - Eventi e dipendenze
  - Items e risorse
  - Constraints (tempo, budget, priorità)
  - Places (location, travel time)
  - Actors (partecipanti, disponibilità)
- Ottimizzazione automatica calendario
- What-if scenarios e simulazioni

---

## Risorse (Licenze Permissive)

**Documentazione Ufficiale**:

- [Node.js Docs](https://nodejs.org/docs/) (MIT)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) (Apache 2.0)
- [Fastify Docs](https://fastify.dev/docs/) (MIT)
- [Platformatic Docs](https://docs.platformatic.dev/) (Apache 2.0)
- [Docker Docs](https://docs.docker.com/) (Apache 2.0)

**Healthcare**:

- [HL7 FHIR](https://hl7.org/fhir/) (CC0)
- [HL7 v2 Spec](https://www.hl7.org/implement/standards/) (HL7 License)

**Tools**:

- [Prometheus](https://prometheus.io/docs/) (Apache 2.0)
- [Grafana](https://grafana.com/docs/) (AGPL-3.0)
- [Keycloak](https://www.keycloak.org/documentation) (Apache 2.0)
- [Redis](https://redis.io/docs/) (BSD-3)
- [RabbitMQ](https://www.rabbitmq.com/docs) (MPL 2.0)

---

## Autore

**Antonio Cittadino**  
Metodologia: XP (Extreme Programming) con TDD/BDD

---

## Licenza Corso

I materiali del corso sono rilasciati sotto licenza che permette uso commerciale.
Il codice del progetto Tech Citizen SW Gateway è rilasciato sotto licenza MIT.

---

_Documento versione 4.0.0 - Dicembre 2025_

---

## Changelog

| Versione | Data     | Modifiche                                          |
| -------- | -------- | -------------------------------------------------- |
| 4.0.0    | Dec 2025 | Testing BDD+TDD, AI Locale, Stregatto, Flaky tests |
| 3.0.0    | Dec 2025 | Protocolli HL7/FHIR, Aspetti legali, Git workflow  |
| 2.0.0    | Dec 2025 | Networking, Hetzner, Server management             |
| 1.0.0    | Dec 2025 | Prima versione corso                               |
