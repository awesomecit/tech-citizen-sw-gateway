# Tech Citizen SW Gateway - Roadmap

**Vision**: Production-ready API Gateway for healthcare suite with enterprise-grade observability, security, and performance.

**Timeline**: Q4 2025 - Q2 2026 (6 months MVP)

---

## Phase 1: Foundation (Q4 2025)

**Goal**: Minimal viable infrastructure + security baseline

### Epic 0: Observability Stack Simplification 🔴 CRITICAL (Blocks Epic 2)

**Duration**: Sprint 2 (3 giorni: 2025-12-13 → 2025-12-16)  
**Status**: 0% complete (planning done, 6 task atomici)

**Deliverables**:

- ✅ US-000 Planning: Documento refactoring con 6 task atomici (DONE 2025-12-13)
- ⏳ Task 1: Inventario codice da rimuovere (packages/telemetry, ports, adapters metriche) - 30min
- ⏳ Task 2: Abilitare metriche/telemetry built-in via watt.json config - 1h
- ⏳ Task 3: Aggiornare Prometheus scrape config per porta 9090 built-in - 30min
- ⏳ Task 4: Rimuovere 800 LOC custom (telemetry package, ports, adapters) - 2h
- ⏳ Task 5: Aggiornare test suite (rimuovere test adapter, aggiungere E2E built-in) - 2h
- ⏳ Task 6: Aggiornare docs (README, VISION, archiviare ADR-004, creare ADR-007) - 1h

**Success Metrics**:

- Metriche Prometheus funzionanti via endpoint built-in `/metrics` porta 9090
- Traces OpenTelemetry arrivano a Tempo (se configurato)
- Logging strutturato JSON queryabile in Loki
- -800 LOC custom code (60% reduction)
- Test suite green (coverage >= 75%)
- Documentazione aggiornata (nessun riferimento a codice rimosso)

**Principle**: **Configuration over Code** - Non scrivere codice che il framework già fornisce (YAGNI, KISS, DRY)

**References**: EPIC000.md, US-000-REFACTOR-OBSERVABILITY-FRAMEWORK-FIRST.md, ADR-007 (da creare)

---

### Epic 1: Infrastructure Foundation ✅ 60% COMPLETE

**Duration**: Sprint 1-2 (2 weeks)  
**Status**: Sprint 1 in progress

**Deliverables**:

- ✅ Docker Compose setup (Caddy, Prometheus, Grafana)
- ✅ Graceful shutdown handling
- 🔄 IaC integration tests
- 📋 Security checklist integration

**Success Metrics**:

- All containers start without errors
- Health checks pass in < 10s
- Zero downtime deploys (graceful shutdown verified)

---

### Epic 2: Observability Stack (Gateway Admin Hub) 🔄 IN PROGRESS

**Duration**: Sprint 3 (1 week: 2025-12-13 → 2025-12-20)  
**Status**: 0% complete (0/8 user stories)

**Deliverables**:

- **L1 - Metrics Layer** (US-008 to US-010):
  - Prometheus scraping gateway `/metrics`
  - Grafana datasource auto-provisioning
  - Admin Hub dashboard (request rate, latency P50/P95/P99, error rate)
- **L2 - Full Observability** (US-011, US-012, US-015):
  - Loki + Promtail log aggregation (retention 7 giorni)
  - Tempo + OTEL Collector distributed tracing (retention 48h)
  - Logs & Traces dashboard con correlazione funzionante
- **L3 - Infrastructure Monitoring** (US-013, US-014):
  - Node Exporter (host metrics: CPU, RAM, disk, network)
  - cAdvisor (container metrics per service)
  - Infrastructure dashboard con resource monitoring

**Success Metrics**:

- ✅ Prometheus scrapes gateway metrics (interval 15s)
- ✅ Grafana dashboards auto-loaded: Admin Hub, Infrastructure, Logs & Traces
- ✅ Log-trace correlation: click log → jump to trace in Grafana
- ✅ Resource usage: L1 < 700MB, L2 < 2GB, L3 < 2.5GB RAM
- ✅ E2E tests pass (8/8 test files in e2e/observability/)
- ✅ Video demo correlation (90s)

**Reference**: docs/project/EPIC-002-OBSERVABILITY-STACK.md

---

### Epic 3: Production Server Setup ⏸️ BLOCKED

**Duration**: Sprint 2 (1 week)  
**Status**: Blocked - awaiting Hetzner server credentials

**Prerequisites**:

- Hetzner server IP + SSH port
- Cloudflare Zone ID + API Token
- Domain root confirmation (techcitizen.it)

**Deliverables**:

- Server discovery and cleanup (server-discovery.yml, server-cleanup.yml)
- SSH hardening (security-baseline.yml)
- UFW firewall + Fail2Ban
- Automatic security updates
- Kernel hardening (sysctl)
- WIP landing pages for 12 enterprise subdomains
- DNS analysis and enterprise architecture (Cloudflare API)
- Gateway production deployment with health checks

**Success Metrics**:

- Pass CIS Benchmark Level 1 via security-audit.yml (PRODUCTION PASS)
- No direct root SSH access possible
- Auto-ban after 3 failed login attempts
- All 12 subdomains return 200 (WIP pages)
- DNS resolves correctly for api/gateway/app/admin/dashboard subdomains
- `https://api.techcitizen.it/health` returns status 200
- Grafana dashboard shows live metrics from production gateway

**Reference**: docs/operations/PRODUCTION_SETUP.md, BACKLOG.md EPIC-008

---

### Epic 4: Cloudflare Security

**Duration**: Sprint 3 (1 week)  
**Status**: Not started

**Deliverables**:

- SSL Full Strict + HSTS
- WAF with OWASP ruleset
- Rate limiting on sensitive endpoints
- Bot protection enabled

**Success Metrics**:

- SSL Labs rating: A+
- OWASP Top 10 attacks blocked (tested)
- Server IP not discoverable via DNS/headers

---

## Phase 2: User Management & Core Services (Q1 2026)

**Goal**: Centralized authentication and first microservices

### Epic 10: Learning Path & Documentation 🔄 IN PROGRESS

**Duration**: Sprint 2-4 (3 weeks)  
**Status**: 20% complete (LEARNING_PATH.md created)

**Deliverables**:

- ✅ LEARNING_PATH.md master file (700+ lines)
- 📋 Quiz JSON files for all 25 modules
- 📋 Complete module mapping (7-25) with Italian resources
- 📋 Anki flashcard decks (6 decks)
- 📋 Real ADR links in modules
- 📋 Resource verification and licensing

**Success Metrics**:

- All 25 modules have: Resources + Exercises + Quiz + Project
- Each quiz has 5-10 questions with explanations
- All resource links verified and accessible
- Anki decks importable and tagged correctly
- NotebookLM can generate content from markdown structure

**Reference**: BACKLOG.md EPIC-010 (US-050 to US-055, 29h estimate, 6h done)

---

### Epic 9: Reusable Auth Package (Foundation) ✅ 40% COMPLETE

**Duration**: Sprint 3 (1 week)  
**Status**: IN PROGRESS (2/5 user stories complete)

**Why First**: This epic creates the `@tech-citizen/auth` package that Epic 5 depends on. By building reusable auth primitives (JWT validation, Keycloak client, session management) FIRST, we avoid duplicating logic across gateway and auth-api services.

**Deliverables**:

- ✅ Package structure with mono-repo workspace integration
- ✅ JWT validation plugin with @fastify/jwt (7 BDD scenarios)
- 🔄 Keycloak admin client plugin (user CRUD operations)
- 🔄 Session management plugin (Redis-based refresh tokens)
- 🔄 TypeBox validation schemas (user registration, login)
- 🔄 Main auth plugin composition with optional routes

**Success Metrics**:

- ✅ Package importable in all services via `@tech-citizen/auth`
- ✅ JWT plugin validates tokens with 100% test coverage (14 tests passing)
- ✅ All 7 BDD scenarios in auth-jwt-validation.feature pass
- 🔄 Keycloak integration tests with Testcontainers pass
- 🔄 Session plugin supports token rotation and blacklist
- 🔄 Epic 5 auth-api reuses all plugins (zero duplication)

**Tech Stack**:

- @fastify/jwt 9.1.0 (JWT validation)
- fast-jwt 4.0.5 (test token generation)
- keycloak-admin-client (for US-039)
- ioredis (for US-040)
- TypeBox + TypeCompiler (for US-041)

**Completed Work**:

- ✅ US-037: Package structure (commit ab73b71, 100% coverage, 7 tests)
- ✅ US-038: JWT validation plugin (commits f4e80d5, ecb791e, cfa3c6a)
  - Scenario 1: Valid JWT → 200 with request.user
  - Scenario 2-5: Error handling (expired, invalid signature, malformed, missing header)
  - Scenario 6-7: Issuer + required claims validation
  - Implementation: verify-only mode, RSA256 algorithm, allowedIss + requiredClaims
- ✅ US-040: Session Manager (commit XXXXXXX, 10/10 tests passing)
  - Sliding window TTL extension on recent activity (< 5 min)
  - Auto-refresh access token before expiration (< 5 min)
  - Activity tracking with lastActivity timestamp
  - Cleanup job for stale sessions (hourly)
  - Redis-based storage with configurable TTL

**Remaining Work** (33% of epic):

- 📋 US-039: Keycloak integration plugin (4h) - partially complete, needs final integration
- 📋 US-041: TypeBox schemas (2h)
- 📋 US-042: Main auth plugin composition (2h)

**Reference**: BACKLOG.md EPIC-009 (US-037 to US-042, 15h estimate, 4h done)

**BDD Features**:

- ✅ e2e/features/auth-jwt-validation.feature (7 scenarios implemented)
- 🔄 e2e/features/auth-keycloak-integration.feature
- 🔄 e2e/features/auth-session-management.feature
- 🔄 e2e/features/auth-plugin-registration.feature
- 🔄 e2e/features/auth-schema-validation.feature

---

### Epic 5: Centralized Authentication (Keycloak + Platformatic)

**Duration**: Sprint 4-5 (2 weeks)  
**Status**: Blocked by Epic 9 (auth package must complete first)

**Duration**: Sprint 4-5 (2 weeks)  
**Status**: Blocked by Epic 9 (auth package must complete first)

**Dependencies**:

- Epic 9 US-037 to US-042 (auth package foundation)
- Requires completed @tech-citizen/auth with all plugins

**Deliverables**:

- Keycloak deployed and realm configured (techcitizen.it)
- Auth microservice (Platformatic Service) with user registration/login/logout
- TypeBox schemas for validation + auto OpenAPI generation
- Sign-up and sign-in pages (vanilla JS, PKCE flow)
- JWT validation middleware in gateway (@fastify/jwt)
- Session management with refresh token rotation
- Redis token blacklist for logout/revocation
- Password reset flow (deferred if no SMTP)

**Success Metrics**:

- User registration creates Keycloak account (POST /auth/register)
- Login returns JWT with httpOnly refresh cookie
- Protected routes return 401 without valid token
- Refresh token rotation invalidates old tokens
- All auth pages load in < 500ms (P95)
- OpenAPI docs auto-generated at /documentation

**Tech Stack**:

- Keycloak (OIDC provider)
- Platformatic Service (auth microservice)
- TypeBox (validation + OpenAPI)
- Redis (token blacklist)
- Vanilla JS (auth pages)

**Reference**: BACKLOG.md EPIC-005 (US-022 to US-028, 22h estimate)

---

### Epic 6: Performance & Caching

**Duration**: Sprint 7-8 (2 weeks)  
**Status**: Deferred (YAGNI - waiting for use case)

**Trigger**: P95 latency > 300ms due to repeated backend calls

**Deliverables**:

- Redis cache layer (when triggered)
- Response caching strategy
- Cache invalidation patterns

**Success Metrics**:

- Cache hit rate > 80% for cacheable endpoints
- P95 latency reduced by > 50%

---

### Epic 7: Event-Driven Architecture

**Duration**: Sprint 9-10 (2 weeks)  
**Status**: Deferred (YAGNI - waiting for use case)

**Trigger**: First async workflow requirement (e.g., notifications)

**Deliverables**:

- RabbitMQ integration (when triggered)
- CloudEvents standard implementation
- Dead letter queue handling

**Success Metrics**:

- Event processing latency P95 < 100ms
- Zero message loss (verified via integration tests)

---

## Phase 3: Advanced Features (Q2 2026)

**Goal**: Enterprise-grade capabilities

### Epic 8: Distributed Tracing

**Duration**: Sprint 11-12 (2 weeks)  
**Status**: Not started

**Deliverables**:

- OpenTelemetry integration
- Tempo for trace storage (optional - evaluate Loki first)
- End-to-end request tracing

**Success Metrics**:

- 100% of requests have traceId
- Trace retention: 7 days
- Query performance: P95 < 500ms

---

### Epic 9: Data Persistence

**Duration**: Sprint 13-15 (3 weeks)  
**Status**: Deferred (YAGNI - waiting for entity definition)

**Trigger**: First persistent entity requirement (e.g., audit logs, user sessions)

**Deliverables**:

- PostgreSQL integration (when triggered)
- Database migrations (Prisma or Platformatic DB)
- Backup/restore strategy

**Success Metrics**:

- Database uptime > 99.9%
- Backup recovery time < 15 minutes
- Migration rollback tested

---

### Epic 10: API Documentation & Developer Portal

**Duration**: Sprint 16-17 (2 weeks)  
**Status**: Not started

**Deliverables**:

- OpenAPI 3.1 spec auto-generated
- Swagger UI / ReDoc integration
- API versioning strategy

**Success Metrics**:

- 100% of endpoints documented
- API contract tests prevent breaking changes
- Developer onboarding time < 1 hour

---

## Phase 4: Production Readiness (Q2 2026)

**Goal**: Production deployment and hardening

### Epic 11: Docker Image Versioning 📋 TODO

**Duration**: Sprint 17 (1 week)  
**Status**: Planned for v1.6.0

**Deliverables**:

- Dockerfiles for all services (gateway, auth, cache, events, telemetry)
- `scripts/docker-build.sh` - Build and tag images from package.json version
- Auto-release.cjs integration - Tag and push on release
- Docker Compose with versioned images (not hardcoded tags)

**User Stories**:

- US-056: Create Dockerfiles for all packages and services
- US-057: Build script with version tagging (package.json → image tag)
- US-058: Integrate Docker build/push into release automation

**Success Metrics**:

- All services buildable as Docker images
- Image tags match git tags (e.g., `gateway:1.5.0` = tag v1.5.0)
- `docker-compose.yml` uses versioned images from registry
- Zero manual Docker operations on release

**Rationale**: Ensures deployment artifacts (Docker images) are synchronized with git tags, package.json, and features.json for traceable releases.

**Reference**: features.json EPIC-011

---

### Epic 12: CI/CD Pipeline

**Duration**: Sprint 18-19 (2 weeks)  
**Status**: Not started

**Deliverables**:

- GitHub Actions workflows (build, test, deploy)
- Blue-green deployment strategy
- Automated rollback on health check failure

**Success Metrics**:

- Deployment frequency: > 5/week
- Lead time for changes: < 1 hour
- Change failure rate: < 5%

---

### Epic 13: Disaster Recovery

**Duration**: Sprint 20 (1 week)  
**Status**: Not started

**Deliverables**:

- Backup strategy documented and tested
- Disaster recovery playbook
- RTO/RPO defined and validated

**Success Metrics**:

- RTO (Recovery Time Objective): < 1 hour
- RPO (Recovery Point Objective): < 5 minutes
- DR drill successful (tested quarterly)

---

## Success Criteria (MVP - End of Q1 2026)

### Functional Requirements

- ✅ Gateway routes traffic to 3+ microservices
- ✅ Circuit breaker prevents cascading failures
- ✅ Graceful shutdown with zero dropped requests
- ✅ Health checks for all services

### Non-Functional Requirements

- **Performance**: P95 < 300ms, P99 < 500ms
- **Reliability**: Uptime > 99.9% (< 43 min downtime/month)
- **Security**: SSL Labs A+, OWASP Top 10 protected
- **Observability**: MTTD < 2 min, MTTR < 15 min

### Operational Requirements

- ✅ IaC 100% (Docker Compose + Terraform + Ansible)
- ✅ All infrastructure changes tested before deploy
- ✅ Zero manual configuration steps
- ✅ Rollback mechanism tested

---

## Risk Register

### HIGH Risk

1. **Performance degradation with traffic growth**
   - Mitigation: Load testing from Sprint 6, horizontal scaling plan
   - Owner: Tech Lead
   - Review: Monthly

2. **Security breach via misconfigured Cloudflare**
   - Mitigation: Terraform prevents manual changes, security audit Sprint 3
   - Owner: Security Engineer
   - Review: Weekly

### MEDIUM Risk

3. **Vendor lock-in to Platformatic Watt**
   - Mitigation: Abstract routing logic, keep Fastify plugins portable
   - Owner: Architect
   - Review: Quarterly

4. **Team capacity insufficient (16h/sprint)**
   - Mitigation: Ruthless YAGNI prioritization, defer non-critical epics
   - Owner: Product Owner
   - Review: Per sprint

### LOW Risk

5. **Documentation drift from code**
   - Mitigation: Docs-as-code, ADRs required for decisions
   - Owner: All developers
   - Review: Sprint retrospective

---

## Dependencies

### External Dependencies

- Hetzner server provisioning (owner: Antonio)
- Cloudflare account setup (owner: Antonio)
- Domain registration (owner: Antonio)

### Technical Dependencies

```
Epic 1 → Epic 2 (observability needs infrastructure)
Epic 1 → Epic 3 (security needs servers running)
Epic 3 → Epic 4 (Cloudflare needs server IP)
Epic 5 → Epic 6 (caching needs routing)
Epic 5 → Epic 7 (events need service mesh)
```

---

## Release Plan

**Based on**: Semantic versioning + conventional commits  
**Source**: `features-summary.json` (auto-generated)  
**Updated**: 2025-12-11

### v1.7.0 - Current Release (2025-12-11) ✅

**Released Features**:

- ✅ Auth Package foundation (JWT validation, Keycloak OIDC, Sessions)
- ✅ Gateway routing with Platformatic Watt
- ✅ DX tooling complete (ESLint, Prettier, Husky, semantic-release)
- ✅ Test infrastructure (68 tests: 28 unit + 37 integration + 3 E2E)
- ✅ Coverage baseline established (70%, v8 provider)
- ✅ Infrastructure Foundation (77% complete)

**Metrics**:

- Test Coverage: 70.27% (409/582 lines)
- Tests Passing: 68/68 (100%)
- Quality Gates: All passing (lint, format, complexity, security)

---

### v1.8.0 - Auth Package Complete (Target: Sprint 3, ~2025-12-20)

**Epic Focus**: EPIC-009 Auth Package (complete remaining 53%)

**Deliverables**:

- Complete US-041: TypeBox validation schemas (token.ts, user.ts)
- Complete US-042: Auth composition plugin (fastify-plugin wrapper)
- Add E2E tests for gateway index.ts (P0 coverage debt)
- Add integration tests for Keycloak + Session plugins (P1 coverage debt)

**Success Metrics**:

- Auth Package: 100% complete (6/6 user stories)
- Test Coverage: 80% (target: 466/582 lines)
- P0 + P1 coverage debt resolved (3 files)
- All BDD scenarios passing (6 .feature files)

**Breaking Changes**: None expected

---

### v1.9.0 - Production Deployment (Target: Sprint 5, ~2026-01-15)

**Epic Focus**: EPIC-008 Production Server Setup

**Prerequisites** (BLOCKERS):

- ⚠️ Hetzner server credentials (IP, SSH, password/key)
- ⚠️ Cloudflare Zone ID + API Token
- ⚠️ Domain confirmation (techcitizen.it)

**Deliverables**:

- Production deployment automation (Ansible playbooks)
- Cloudflare security (WAF, rate limiting, SSL Full Strict)
- Observability baseline (Prometheus alerts, Grafana dashboards)
- Complete US-043 - US-048 (production user stories)
- P2 coverage debt resolved (schema validation tests)

**Success Metrics**:

- Test Coverage: 85% (target: 494/582 lines)
- CIS Benchmark Level 1 compliance
- `https://api.techcitizen.it/health` returns 200
- Zero downtime deployments verified

**Breaking Changes**: None expected

---

### v2.0.0 - Enterprise Ready (Target: Q1 2026, ~2026-02-01)

**Epic Focus**: EPIC-005 Centralized Authentication + Multi-service routing

**Deliverables**:

- Centralized Auth microservice (depends on EPIC-009 complete)
- Multi-service routing (patient-api, appointment-api stubs)
- Event-driven architecture foundation (RabbitMQ + CloudEvents)
- Production monitoring (90%+ uptime, P95 < 300ms)
- Full E2E coverage (all user journeys tested)

**Success Metrics**:

- Test Coverage: 90% (target: 523/582 lines)
- All 5 features enabled in production
- SLA compliance: 99.9% uptime
- Security audit: Zero critical vulnerabilities

**Breaking Changes**: Possible (auth API contract changes)

---

## Technical Debt Register

### Coverage Gaps (v1.7.0 - Dec 2025)

**Status**: 70% global coverage (409/582 lines) ✅ Baseline established

**Files at 0% Coverage** (5 files identified):

1. **`packages/auth/src/plugins/keycloak.ts`** - Fastify plugin for Keycloak authentication
   - Priority: P1 (critical auth path)
   - Blocker: Requires Keycloak integration test setup
   - Target: v1.8.0 (add integration tests)

2. **`packages/auth/src/plugins/session.ts`** - Fastify plugin for session management
   - Priority: P1 (user sessions)
   - Blocker: Requires Redis session storage tests
   - Target: v1.8.0 (add integration tests)

3. **`packages/auth/src/schemas/token.ts`** - JWT token validation schemas
   - Priority: P2 (validation layer)
   - Blocker: Schema-only file, needs property-based tests
   - Target: v1.9.0 (add schema validation tests)

4. **`packages/auth/src/schemas/user.ts`** - User object validation schemas
   - Priority: P2 (validation layer)
   - Blocker: Schema-only file, needs property-based tests
   - Target: v1.9.0 (add schema validation tests)

5. **`services/gateway/src/index.ts`** - Gateway entry point (125 lines)
   - Priority: P0 (critical path)
   - Blocker: Requires E2E/integration tests with full stack
   - Target: v1.8.0 (add E2E tests with request flow)

**Coverage Milestones**:

- ✅ **v1.7.0**: 70% baseline established (v8 provider migration)
- 🎯 **v1.8.0 Target**: 80% coverage (P0+P1 files tested)
- 🎯 **v1.9.0 Target**: 85% coverage (P2 files tested)
- 🎯 **v2.0.0 Target**: 90% coverage (production-ready)

---

## Revision History

- **2025-12-11**: v1.7.0 released - Coverage analysis baseline (70%), 5 files at 0% documented as technical debt
- **2025-12-10**: Added Epic 10 Learning Path (EPIC-010) with 5 user stories for course documentation
- **2025-12-09**: Added Epic 3 Production Server Setup (EPIC-008) with 6 user stories, blocked until server credentials available
- **2025-12-08**: Initial roadmap created, Epic 1 60% complete
- **2025-12-08**: Added security hardening epics from SECURITY_CHECKLIST.md
- **2025-12-08**: Deferred Epic 6-7-9 per ADR-0001 YAGNI principle

**Next Review**: Sprint 2 planning (Dec 15, 2025)
