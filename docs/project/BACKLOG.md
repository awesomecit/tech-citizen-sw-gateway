# Tech Citizen SW Gateway - Product Backlog

**Project**: Healthcare API Gateway Suite  
**Product Owner**: Antonio Cittadino  
**Sprint Duration**: 1 week (timebox)  
**Team Capacity**: 16h agent coding per sprint  
**Last Updated**: 2025-12-09

---

## Backlog Prioritization

### Priority 1: Foundation (Sprint 1 - Current)

#### EPIC-001: Infrastructure Foundation ✅ IN PROGRESS

**Goal**: Setup minimal production-ready infrastructure following YAGNI

**Status**: 60% complete

**User Stories**:

- [x] US-001: As a DevOps, I want Docker Compose setup so infrastructure is reproducible
  - Task: Create docker-compose.yml with Caddy, Prometheus, Grafana
  - Acceptance: `docker compose up -d` starts all services
  - Estimate: 2h
  - **DONE** (Sprint 1)

- [x] US-002: As a SRE, I want Caddy reverse proxy so traffic is TLS-terminated
  - Task: Configure Caddyfile with self-signed certs, security headers
  - Acceptance: `https://localhost:18443/health` returns 200
  - Estimate: 2h
  - **DONE** (Sprint 1)

- [x] US-003: As a SRE, I want Prometheus metrics so I can monitor SLA (P50/P95/P99)
  - Task: Configure prometheus.yml to scrape gateway:3042/metrics
  - Acceptance: Prometheus UI shows gateway target UP
  - Estimate: 1h
  - **DONE** (Sprint 1)

- [x] US-004: As a SRE, I want Grafana dashboard so I can visualize health metrics
  - Task: Create gateway-health.json dashboard with request rate, latency, errors
  - Acceptance: Dashboard shows live metrics from Prometheus
  - Estimate: 2h
  - **DONE** (Sprint 1)

- [x] US-005: As a Developer, I want graceful shutdown so in-flight requests complete on deploy
  - Task: Add SIGTERM/SIGINT handlers in services/gateway/src/index.ts
  - Acceptance: Test verifies server completes requests before exit
  - Estimate: 2h
  - **DONE** (Sprint 1)

- [ ] US-006: As a DevOps, I want IaC tests so infrastructure changes don't break environments
  - Task: Add test/infrastructure.test.ts with Docker Compose validation
  - Acceptance: Tests verify all containers start, health checks pass
  - Estimate: 3h
  - **TODO** (Sprint 1)

- [ ] US-007: As a Security Engineer, I want security hardening checklist tracked
  - Task: Add SECURITY_CHECKLIST.md items to backlog as stories
  - Acceptance: Each checklist item has corresponding user story
  - Estimate: 1h
  - **TODO** (Sprint 1)

**Epic Estimate**: 13h total / 10h done / 3h remaining

---

#### EPIC-002: Observability Stack ⏸️ BLOCKED

**Goal**: Production-grade logging and tracing

**Status**: Not started (blocked by Epic-001 completion)

**User Stories**:

- [ ] US-008: As a SRE, I want Prometheus alerts so I'm notified of SLA violations
  - Task: Configure Alertmanager + alert rules (P95 > 300ms)
  - Acceptance: Test alert fires when latency breaches threshold
  - Estimate: 3h
  - Dependency: US-003 (Prometheus setup)

- [ ] US-009: As a Developer, I want structured logs so I can debug production issues
  - Task: Configure Fastify logger with pino, add correlation IDs
  - Acceptance: Logs include traceId, method, url, statusCode, duration
  - Estimate: 2h

- [ ] US-010: As a SRE, I want log aggregation so I can search across services
  - Task: Add Loki to docker-compose.yml when use case identified
  - Acceptance: YAGNI - defer until multi-service scenario
  - Estimate: 4h
  - **DEFERRED** (ADR-0001 minimal infrastructure)

**Epic Estimate**: 9h (5h active + 4h deferred)

---

### Priority 2: Production Deployment (Sprint 2)

#### EPIC-008: Production Server Setup ⏸️ BLOCKED

**Goal**: Deploy and secure production Hetzner server with enterprise architecture

**Status**: Blocked - awaiting server access credentials

**Prerequisites**:

- Hetzner server IP address + SSH port
- Cloudflare Zone ID + API Token for techcitizen.it
- Domain root confirmation (techcitizen.it)

**User Stories**:

- [ ] US-030: As a DevOps, I want server inventory analysis so I understand current state before changes
  - Task: Execute server-discovery.yml to analyze installed packages, disk usage, running services
  - Acceptance: Report generated in /tmp/server-discovery-\*.txt with full inventory
  - Estimate: 0.5h
  - Command: `npm run ansible:prod:discovery`
  - Files: ansible/playbooks/server-discovery.yml

- [ ] US-031: As a DevOps, I want safe server cleanup so obsolete packages/logs are removed without breaking system
  - Task: Run server-cleanup.yml with --dry-run, verify report, execute real cleanup
  - Acceptance: Dry-run report shows items to remove, real cleanup executes without errors
  - Estimate: 1h
  - Command: `npm run ansible staging cleanup --dry-run` then `--real`
  - Files: ansible/playbooks/server-cleanup.yml

- [ ] US-032: As a Security Engineer, I want production security baseline so server is hardened against attacks
  - Task: Apply security-baseline.yml (SSH hardening, UFW, Fail2Ban, sysctl, Cloudflare IP whitelist)
  - Acceptance: security-audit.yml returns PRODUCTION PASS status
  - Estimate: 2h
  - Command: `npm run ansible:prod:security` then `npm run ansible:prod:audit`
  - Files: ansible/playbooks/security-baseline.yml, ansible/playbooks/security-audit.yml
  - Dependency: US-030 (need inventory first)

- [ ] US-033: As a Product Owner, I want WIP landing pages deployed so users see professional placeholder
  - Task: Create public/\*.html variants for all subdomains (api/gateway/app/admin/dashboard/grafana/prometheus/staging/dev/status/docs)
  - Acceptance: All 12 subdomains return 200 with "Work in Progress" page, branded design
  - Estimate: 2h
  - Files: public/index.html (template), infrastructure/caddy/Caddyfile (routing)

- [ ] US-034: As a DevOps, I want current DNS state documented so I can plan migrations without downtime
  - Task: Query Cloudflare API for techcitizen.it zone, document all A/CNAME/TXT records, identify conflicts
  - Acceptance: DNS analysis report in docs/operations/DNS_CURRENT_STATE.md with record table
  - Estimate: 1h
  - Tools: Cloudflare API v4, curl/jq scripts

- [ ] US-035: As a DevOps, I want enterprise DNS architecture implemented so services are accessible via subdomains
  - Task: Create Cloudflare DNS records for 12 subdomains, configure SSL Full Strict, HSTS, WAF, rate limiting
  - Acceptance: All subdomains resolve to server IP, SSL Labs A+ rating, WAF rules active
  - Estimate: 3h
  - Reference: docs/operations/PRODUCTION_SETUP.md section 3 (DNS enterprise)
  - Dependency: US-034 (need current state first)

- [ ] US-036: As a DevOps, I want gateway deployed to production so system is live and monitored
  - Task: Execute deploy-gateway.yml, verify /health endpoint, test /metrics, check Grafana dashboard
  - Acceptance: `curl https://api.techcitizen.it/health` returns 200, uptime > 0, metrics visible in Grafana
  - Estimate: 2h
  - Command: `npm run ansible:prod:deploy`
  - Files: ansible/playbooks/deploy-gateway.yml
  - Dependency: US-035 (DNS must resolve first)

**Epic Estimate**: 11.5h total (blocked until server access available)

**Critical Path**: US-030 → US-031 → US-032 → US-034 → US-035 → US-036 (US-033 can run parallel after US-032)

---

### Priority 3: Security Hardening (Sprint 2-3)

#### EPIC-003: Server Security Baseline

**Goal**: Implement SECURITY_CHECKLIST.md items for Hetzner deployment

**Status**: Not started

**User Stories** (from SECURITY_CHECKLIST.md):

- [ ] US-011: As a Security Engineer, I want SSH hardened so brute force attacks fail
  - Task: Ansible playbook for SSH config (disable root, change port, pubkey only)
  - Acceptance: ssh root@server fails, password auth disabled
  - Estimate: 2h
  - Checklist: SSH section 1.1

- [ ] US-012: As a Security Engineer, I want UFW firewall so only required ports are open
  - Task: Ansible playbook for UFW rules (SSH, HTTP, HTTPS only)
  - Acceptance: `ufw status` shows only configured ports
  - Estimate: 1h
  - Checklist: Firewall section 1.2

- [ ] US-013: As a Security Engineer, I want Fail2Ban so IPs are auto-banned after failed logins
  - Task: Ansible playbook for Fail2Ban config
  - Acceptance: Test shows IP banned after 3 failed SSH attempts
  - Estimate: 2h
  - Checklist: Fail2Ban section 1.3

- [ ] US-014: As a Security Engineer, I want automatic security updates so CVEs are patched
  - Task: Ansible playbook for unattended-upgrades
  - Acceptance: `/var/log/unattended-upgrades` shows recent security patches
  - Estimate: 1h
  - Checklist: Updates section 1.4

- [ ] US-015: As a Security Engineer, I want kernel hardening so attack surface is reduced
  - Task: Ansible playbook for sysctl security settings
  - Acceptance: `sysctl -a | grep net.ipv4` shows hardened values
  - Estimate: 1h
  - Checklist: Kernel hardening section 1.6

**Epic Estimate**: 7h

---

#### EPIC-004: Cloudflare Security

**Goal**: Implement SECURITY_CHECKLIST.md Cloudflare configurations

**Status**: Not started

**User Stories**:

- [ ] US-016: As a Security Engineer, I want SSL Full Strict so traffic is encrypted end-to-end
  - Task: Terraform module for Cloudflare SSL settings
  - Acceptance: Cloudflare dashboard shows "Full (strict)" mode
  - Estimate: 1h
  - Checklist: SSL section 2.1-2.2

- [ ] US-017: As a Security Engineer, I want HSTS so browsers enforce HTTPS
  - Task: Terraform config for HSTS with 12-month max-age
  - Acceptance: Response headers include `Strict-Transport-Security`
  - Estimate: 1h
  - Checklist: HSTS section 2.4

- [ ] US-018: As a Security Engineer, I want WAF enabled so common attacks are blocked
  - Task: Terraform config for Cloudflare Managed Ruleset + OWASP
  - Acceptance: Test SQL injection attempt is blocked
  - Estimate: 2h
  - Checklist: WAF section 2.6

- [ ] US-019: As a Security Engineer, I want rate limiting so brute force attacks fail
  - Task: Terraform config for /login rate limit (10 req/min)
  - Acceptance: Test shows 429 after exceeding limit
  - Estimate: 2h
  - Checklist: Rate limiting section 2.7

- [ ] US-020: As a Security Engineer, I want bot protection so scrapers are blocked
  - Task: Enable Cloudflare Bot Fight Mode
  - Acceptance: Bot detection logs visible in dashboard
  - Estimate: 1h
  - Checklist: Bot protection section 2.8

- [ ] US-021: As a Security Engineer, I want server IP hidden so Cloudflare can't be bypassed
  - Task: Configure UFW to only accept Cloudflare IP ranges
  - Acceptance: Direct IP access returns connection refused
  - Estimate: 2h
  - Checklist: IP hiding section 2.9

**Epic Estimate**: 9h

---

### Priority 3: User Management & Authentication (Sprint 3-5)

#### EPIC-009: Reusable Auth Package (Foundation) 🛠️

**Goal**: Create modular, reusable authentication package for mono-repo services

**Status**: Not started

**Package**: `@tech-citizen/auth` in `packages/auth/`

**Why**: Centralize auth logic for reuse across gateway, auth-api, and future microservices (patient-api, etc.)

**User Stories**:

- [ ] US-037: As a Developer, I want auth package structure so I can share logic across services
  - **Task 1**: Create `packages/auth/` with TypeScript + workspace setup
  - **Task 2**: Configure package.json with peerDependencies (fastify, @fastify/jwt)
  - **Task 3**: Setup tsconfig.json with paths alias (`@tech-citizen/auth`)
  - **Acceptance Criteria** (BDD):
    - **Given** mono-repo workspace configured
    - **When** I run `npm install` in root
    - **Then** `packages/auth` is linked in all services
    - **And** TypeScript resolves `import from '@tech-citizen/auth'`
  - **Files**: packages/auth/package.json, packages/auth/tsconfig.json, root package.json workspaces
  - **Estimate**: 1h

- [ ] US-038: As a Developer, I want JWT validation plugin so services can verify tokens
  - **Task 1**: Create `src/plugins/jwt.ts` with @fastify/jwt wrapper
  - **Task 2**: Add Keycloak public key fetching + caching
  - **Task 3**: Add `fastify.authenticate` decorator
  - **Task 4**: Write unit tests for JWT verify/decode/validate
  - **Acceptance Criteria** (BDD):
    - **Scenario 1: Valid JWT**
      - **Given** a valid JWT signed by Keycloak
      - **When** I call `fastify.authenticate(request, reply)`
      - **Then** request.user is populated with decoded payload
      - **And** no error is thrown
    - **Scenario 2: Expired JWT**
      - **Given** a JWT with exp claim in the past
      - **When** I call `fastify.authenticate(request, reply)`
      - **Then** reply sends 401 Unauthorized
      - **And** error is `TokenExpiredError`
    - **Scenario 3: Invalid signature**
      - **Given** a JWT with tampered signature
      - **When** I call `fastify.authenticate(request, reply)`
      - **Then** reply sends 401 Unauthorized
      - **And** error is `JsonWebTokenError`
  - **Files**: packages/auth/src/plugins/jwt.ts, packages/auth/test/jwt.test.ts
  - **Test Coverage**: >90% (happy path + 3 error cases)
  - **Estimate**: 3h

- [ ] US-039: As a Developer, I want Keycloak integration plugin so I can manage users
  - **Task 1**: Create `src/plugins/keycloak.ts` with keycloak-admin-client
  - **Task 2**: Add methods: createUser, findUserByEmail, updatePassword, deleteUser
  - **Task 3**: Add connection pooling + retry logic
  - **Task 4**: Write integration tests with Keycloak testcontainer
  - **Acceptance Criteria** (BDD):
    - **Scenario 1: Create user successfully**
      - **Given** Keycloak is running
      - **And** I have valid admin credentials
      - **When** I call `keycloak.createUser({ email, password })`
      - **Then** user is created in realm `techcitizen`
      - **And** user ID is returned
      - **And** user can login with credentials
    - **Scenario 2: User already exists**
      - **Given** user with email `test@example.com` exists
      - **When** I call `keycloak.createUser({ email: 'test@example.com' })`
      - **Then** error is thrown with code `USER_EXISTS`
      - **And** original user is unchanged
    - **Scenario 3: Keycloak unavailable**
      - **Given** Keycloak container is stopped
      - **When** I call any keycloak method
      - **Then** retry 3 times with exponential backoff
      - **And** after retries, throw `SERVICE_UNAVAILABLE`
  - **Files**: packages/auth/src/plugins/keycloak.ts, packages/auth/test/keycloak.integration.test.ts
  - **Test Coverage**: >85% (mocked + real Keycloak container)
  - **Estimate**: 4h

- [ ] US-040: As a Developer, I want session management plugin so I can handle refresh tokens
  - **Task 1**: Create `src/plugins/session.ts` with Redis integration
  - **Task 2**: Add methods: storeRefreshToken, validateRefreshToken, revokeToken, rotateTokens
  - **Task 3**: Implement token blacklist with TTL = token exp
  - **Task 4**: Write unit tests with ioredis-mock
  - **Acceptance Criteria** (BDD):
    - **Scenario 1: Store and retrieve refresh token**
      - **Given** a valid refresh token with userId and exp
      - **When** I call `session.storeRefreshToken(token, userId)`
      - **Then** token is stored in Redis with key `refresh:{userId}:{tokenId}`
      - **And** TTL is set to token exp - current time
      - **And** subsequent `validateRefreshToken(token)` returns true
    - **Scenario 2: Revoke token (logout)**
      - **Given** an active refresh token
      - **When** I call `session.revokeToken(token)`
      - **Then** token is added to blacklist `blacklist:{tokenId}`
      - **And** `validateRefreshToken(token)` returns false
      - **And** blacklist entry expires at token exp
    - **Scenario 3: Rotate tokens (refresh endpoint)**
      - **Given** a valid refresh token
      - **When** I call `session.rotateTokens(oldToken)`
      - **Then** new access + refresh tokens are generated
      - **And** old refresh token is revoked
      - **And** new refresh token is stored
  - **Files**: packages/auth/src/plugins/session.ts, packages/auth/test/session.test.ts
  - **Dependencies**: Redis container in docker-compose.yml
  - **Test Coverage**: >90%
  - **Estimate**: 3h

- [ ] US-041: As a Developer, I want TypeBox schemas so I can validate auth requests
  - **Task 1**: Create `src/schemas/user.ts` with RegisterUserSchema, LoginUserSchema
  - **Task 2**: Create `src/schemas/token.ts` with TokenResponseSchema, RefreshTokenSchema
  - **Task 3**: Compile schemas with TypeCompiler for performance
  - **Task 4**: Export schemas for reuse in services
  - **Acceptance Criteria** (BDD):
    - **Scenario 1: Valid registration data**
      - **Given** RegisterUserSchema compiled validator
      - **When** I validate `{ email: 'test@example.com', password: 'SecureP@ss1' }`
      - **Then** validation passes
      - **And** TypeScript infers correct type
    - **Scenario 2: Invalid email format**
      - **Given** RegisterUserSchema compiled validator
      - **When** I validate `{ email: 'invalid-email', password: 'SecureP@ss1' }`
      - **Then** validation fails with error path `/email`
      - **And** error message is `must match format "email"`
    - **Scenario 3: Weak password**
      - **Given** RegisterUserSchema with password rules (min 8 chars, 1 upper, 1 number)
      - **When** I validate `{ email: 'test@example.com', password: 'weak' }`
      - **Then** validation fails with error path `/password`
      - **And** error message describes requirements
  - **Files**: packages/auth/src/schemas/user.ts, packages/auth/src/schemas/token.ts, packages/auth/test/schemas.test.ts
  - **Performance**: TypeCompiler validation <1ms per request (10-100x faster than class-validator)
  - **Estimate**: 2h

- [ ] US-042: As a Developer, I want main auth plugin so I can register all features at once
  - **Task 1**: Create `src/index.ts` exporting main plugin with options
  - **Task 2**: Compose jwt + keycloak + session plugins
  - **Task 3**: Add optional route handlers (register, login, logout, refresh)
  - **Task 4**: Write E2E test registering plugin in Fastify app
  - **Acceptance Criteria** (BDD):
    - **Scenario 1: Register plugin with routes enabled**
      - **Given** a Fastify instance
      - **When** I register `@tech-citizen/auth` with `enableRoutes: true`
      - **Then** plugin registers successfully
      - **And** routes `/auth/register`, `/auth/login`, `/auth/logout` exist
      - **And** decorators `authenticate`, `keycloak`, `session` are available
    - **Scenario 2: Register plugin without routes (gateway mode)**
      - **Given** a Fastify instance (gateway)
      - **When** I register `@tech-citizen/auth` with `enableRoutes: false`
      - **Then** plugin registers successfully
      - **And** no `/auth/*` routes exist
      - **And** only decorators are available (for JWT validation)
    - **Scenario 3: Missing required options**
      - **Given** a Fastify instance
      - **When** I register plugin without `keycloakUrl`
      - **Then** plugin throws error `Missing required option: keycloakUrl`
  - **Files**: packages/auth/src/index.ts, packages/auth/test/e2e.test.ts
  - **API**:
    ```typescript
    fastify.register(authPlugin, {
      keycloakUrl: 'http://localhost:8080',
      realm: 'techcitizen',
      clientId: 'gateway',
      clientSecret: 'secret',
      redisUrl: 'redis://localhost:6379',
      enableRoutes: true, // false for gateway
    });
    ```
  - **Estimate**: 2h

**Epic Estimate**: 15h

**BDD Feature Files** (to create in `e2e/features/`):

- `auth-jwt-validation.feature` (US-038 scenarios)
- `auth-keycloak-integration.feature` (US-039 scenarios)
- `auth-session-management.feature` (US-040 scenarios)
- `auth-schema-validation.feature` (US-041 scenarios)
- `auth-plugin-registration.feature` (US-042 scenarios)

**Test Strategy**:

1. **Unit tests**: Mocked dependencies (ioredis-mock, nock for Keycloak)
2. **Integration tests**: Real Keycloak + Redis testcontainers
3. **E2E tests**: Full Fastify app with plugin registered

**Dependencies**:

- `@fastify/jwt` (peer dependency)
- `@sinclair/typebox` + `@sinclair/typebox/compiler`
- `keycloak-admin-client`
- `ioredis`
- `fastify-plugin` (for plugin wrapper)

---

#### EPIC-005: Centralized Authentication with Keycloak

**Goal**: Implement user registration, authentication, and centralized session management

**Status**: Not started

**Prerequisites**:

- Keycloak instance deployed (Docker or Hetzner)
- Realm configured for techcitizen.it
- Client credentials for gateway integration

**User Stories**:

- [ ] US-022: As a DevOps, I want Keycloak deployed so user auth is centralized
  - Task: Add Keycloak container to docker-compose.yml, configure realm + client
  - Acceptance: Keycloak admin UI accessible, realm `techcitizen` created with OIDC client
  - Estimate: 3h
  - Files: infrastructure/keycloak/realm-export.json, docker-compose.yml

- [ ] US-023: As a Developer, I want auth microservice (Platformatic) so I can manage user lifecycle
  - Task: Create services/auth-api with Platformatic Service, import @tech-citizen/auth package
  - Acceptance: POST /auth/register creates user in Keycloak, returns JWT
  - Estimate: 2h (reduced from 4h - logic in package)
  - Tech Stack: Platformatic Service, @tech-citizen/auth (from EPIC-009)
  - Routes: Exposed by @tech-citizen/auth plugin with `enableRoutes: true`
  - Dependencies: EPIC-009 US-037 to US-042 (auth package must exist first)

- [ ] US-024: As a User, I want sign-up page so I can create account
  - Task: Create public/signup.html with form (email, password, confirm), integrate with /auth/register
  - Acceptance: Form submission creates Keycloak user, redirects to login with success message
  - Estimate: 3h
  - Files: public/signup.html, public/js/auth.js
  - Validation: Email format, password strength (min 8 chars, 1 upper, 1 number), CSRF protection

- [ ] US-025: As a User, I want sign-in page so I can access protected resources
  - Task: Create public/signin.html with OAuth2 PKCE flow, exchange code for JWT
  - Acceptance: Successful login sets httpOnly cookie with refresh token, stores access token in sessionStorage
  - Estimate: 3h
  - Files: public/signin.html, public/js/auth.js
  - Security: PKCE flow, secure cookie flags (httpOnly, secure, sameSite=strict)

- [ ] US-026: As a Developer, I want JWT validation middleware so only authenticated requests access protected routes
  - Task: Register @tech-citizen/auth plugin in gateway with `enableRoutes: false`
  - Acceptance: GET /api/profile returns 401 without valid JWT, 200 with user data when authenticated
  - Estimate: 1h (reduced from 2h - plugin from EPIC-009)
  - Files: services/gateway/src/plugins/auth.ts
  - Usage: `onRequest: [fastify.authenticate]` decorator from plugin
  - Dependencies: EPIC-009 US-038 (JWT plugin)

- [ ] US-027: As a Security Engineer, I want session management so refresh tokens rotate and revoke
  - Task: Use fastify.session decorator from @tech-citizen/auth for token rotation
  - Acceptance: POST /auth/refresh returns new access token, old refresh token invalidated
  - Estimate: 1h (reduced from 3h - logic in package)
  - Implementation: Call `fastify.session.rotateTokens(oldRefreshToken)` in route handler
  - Dependencies: EPIC-009 US-040 (session plugin)

- [ ] US-028: As a User, I want password reset flow so I can recover account access
  - Task: Add /auth/reset-password endpoint, send email with reset link (integrate Keycloak email)
  - Acceptance: Email received with link, clicking opens reset form, password updated in Keycloak
  - Estimate: 4h
  - Dependencies: Email service (defer if no SMTP - use Keycloak admin reset for MVP)

**Epic Estimate**: 15h (was 22h, -7h thanks to EPIC-009 reusable package)

**Dependencies**: EPIC-009 must complete first (auth package foundation)

**Tech Stack**:

- **Keycloak**: Identity provider (OIDC/OAuth2)
- **Platformatic Service**: Auth microservice (services/auth-api)
- **TypeBox**: Schema validation + OpenAPI auto-generation (@sinclair/typebox)
- **Fastify Plugins**: @fastify/jwt, @fastify/cors, @fastify/rate-limit
- **Redis**: Token blacklist for logout/revocation
- **Vanilla JS**: Sign-up/sign-in pages (no framework overhead)

**Platformatic Benefits**:

- Auto OpenAPI docs from TypeBox schemas
- Built-in Fastify optimization (10x faster than Express)
- Watt service mesh auto-discovery
- Zero config TypeScript compilation

---

### Priority 4: Advanced Features (Future Sprints)

#### EPIC-006: Caching Layer

**Goal**: Add Redis when concrete use case identified

**Status**: Deferred per ADR-0001 (YAGNI)

**Trigger**: When response time P95 > 300ms due to repeated backend calls

---

#### EPIC-007: Event System

**Goal**: Add RabbitMQ for async processing

**Status**: Deferred per ADR-0001 (YAGNI)

**Trigger**: When first async workflow identified (e.g., patient notification)

---

#### EPIC-008: Persistence Layer

**Goal**: Add PostgreSQL for data storage

**Status**: Deferred per ADR-0001 (YAGNI)

**Trigger**: When first persistent entity defined (e.g., audit logs)

---

## Sprint Planning

### Sprint 1 (Dec 8-14, 2025) - Current

**Goal**: Complete Epic-001 Infrastructure Foundation

**Committed Stories**:

- ✅ US-001: Docker Compose (2h) - DONE
- ✅ US-002: Caddy reverse proxy (2h) - DONE
- ✅ US-003: Prometheus metrics (1h) - DONE
- ✅ US-004: Grafana dashboard (2h) - DONE
- ✅ US-005: Graceful shutdown (2h) - DONE
- 🔄 US-006: IaC tests (3h) - IN PROGRESS
- 📋 US-007: Security backlog (1h) - TODO

**Capacity**: 16h (13h committed)  
**Actual**: 10h completed / 3h remaining  
**Velocity**: On track

---

### Sprint 2 (Dec 15-21, 2025) - Planned

**Goal**: Security hardening baseline (Epic-003)

**Proposed Stories**:

- US-011: SSH hardening (2h)
- US-012: UFW firewall (1h)
- US-013: Fail2Ban (2h)
- US-014: Auto updates (1h)
- US-015: Kernel hardening (1h)
- US-008: Prometheus alerts (3h) - from Epic-002
- US-009: Structured logging (2h) - from Epic-002

**Capacity**: 16h (12h proposed)  
**Buffer**: 4h for spillover from Sprint 1

---

## Definition of Done

### User Story DoD

- [ ] Code implemented following .github/copilot-instructions.md patterns
- [ ] Unit tests pass (npm run test)
- [ ] Integration tests pass if applicable (npm run test:integration)
- [ ] Code reviewed (linted, complexity < 10)
- [ ] Documentation updated (ADR if architectural decision)
- [ ] Committed with conventional commit message
- [ ] Pushed to GitHub

### Epic DoD

- [ ] All user stories complete
- [ ] E2E test scenario exists in e2e/features/\*.feature
- [ ] Performance verified (no P95 regression)
- [ ] Security reviewed (no new vulnerabilities)
- [ ] Production deployment validated

---

## Technical Debt Log

### TD-001: Markdown lint errors in ADR/docs

- **Impact**: CI warnings on format:check
- **Effort**: 1h
- **Priority**: Low
- **Created**: Sprint 1

### TD-002: Vitest dependency in gateway/package.json unused

- **Impact**: Wasted disk space, confusion
- **Effort**: 0.5h
- **Priority**: Low
- **Created**: Sprint 1

### TD-003: No health check timeout in Docker Compose

- **Impact**: Containers marked healthy before actually ready
- **Effort**: 0.5h
- **Priority**: Medium
- **Created**: Sprint 1

---

## Metrics Tracking

### Sprint 1 Metrics (In Progress)

- **Planned Story Points**: 13h
- **Completed Story Points**: 10h
- **Velocity**: 10h/week (first sprint baseline)
- **Bugs Found**: 0
- **Deployment Failures**: 1 (first commit broken - fixed with regression test)

### Quality Metrics

- **Test Coverage**: 85% (2 unit tests, 2 integration tests)
- **Code Complexity**: Max 8 (within limit of 10)
- **Security Issues**: 0 known vulnerabilities
- **Performance**: P95 < 50ms (well within 300ms SLA)

---

**Next Review**: End of Sprint 1 (Dec 14, 2025)
