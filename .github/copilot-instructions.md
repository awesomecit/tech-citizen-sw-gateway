# GitHub Copilot Instructions

> **Project**: Tech Citizen Software Gateway (Healthcare API Gateway Suite)  
> **Stack**: Platformatic Watt 3.x, Fastify 5.x, TypeScript, RabbitMQ, Redis  
> **Last Updated**: 2025-12-08

---

## Core Principles (Ordered by Priority)

1. **YAGNI** - Implement only what's explicitly needed now
2. **SOLID** - Single responsibility, depend on abstractions
3. **Clean Code** - Meaningful names, small functions (≤20 lines), early returns
4. **DRY** - Extract duplication, but prefer duplication over bad abstraction

---

## Code Style Standards

### TypeScript Rules

- Strict mode enabled, **no `any`** types
- Explicit return types for all functions
- Prefer `interface` over `type` for object shapes
- Use `const` assertions for literal types

### Naming Conventions

```typescript
// ✅ Correct
const MAX_RETRY_ATTEMPTS = 3; // UPPER_SNAKE_CASE for constants
interface HealthResponse {} // PascalCase for types/interfaces
async function checkServiceHealth() {} // camelCase for functions/variables

// ❌ Avoid
const max_retry = 3; // Wrong case
interface healthresponse {} // Wrong case
```

### Function Guidelines

- Maximum 20 lines per function
- Early return pattern (fail fast)
- No magic numbers or strings - use named constants
- Max 3 levels of nesting

### Pattern Examples

**✅ Do This:**

```typescript
interface ServiceResponse {
  id: string;
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
}

async function getServiceStatus(serviceId: string): Promise<ServiceResponse> {
  if (!serviceId) {
    throw new Error('Service ID is required');
  }

  const service = await findService(serviceId);
  if (!service) {
    throw new Error(`Service ${serviceId} not found`);
  }

  return {
    id: service.id,
    status: service.isHealthy ? 'healthy' : 'down',
    timestamp: new Date().toISOString(),
  };
}
```

**❌ Don't Do This:**

```typescript
function getServiceStatus(id: any): any {
  if (id) {
    const service = findService(id);
    if (service) {
      return {
        id: id,
        status: service.isHealthy ? 'healthy' : 'down',
        timestamp: new Date(),
      };
    }
  }
}
```

---

## Testing Approach

### TDD Workflow

```
1. RED    → Write failing test first
2. GREEN  → Write minimal code to pass
3. REFACTOR → Improve while keeping tests green
```

### Test Coverage Requirements

- **Happy path** - Primary use case
- **Error cases** - Invalid inputs, network failures, timeouts
- **Edge cases** - Empty arrays, null values, boundary conditions

### BDD for E2E

- Gherkin scenarios in `e2e/features/*.feature`
- Write scenarios BEFORE implementation
- Map to acceptance criteria

**Example:**

```gherkin
Feature: Service Health Check

  Scenario: Healthy service returns OK status
    Given a registered service "patient-api"
    When I request health check for "patient-api"
    Then the response status should be "healthy"
    And the response should include a timestamp
```

---

## Devil's Advocate Pattern

**Act as a critical partner, not a yes-man.**

### Before Implementation Checklist

- [ ] Does this solve the actual problem?
- [ ] Is there an existing library for this?
- [ ] What are the edge cases?
- [ ] Is there at least one concrete use case?
- [ ] Is this testable?
- [ ] Does this violate YAGNI?

### Always Propose 2-3 Alternatives

**Template:**

```
📌 Request: [what was asked]

🔍 Evaluated Alternatives:

**Option A: [Name]**
- ✅ Pros: Simple, leverages existing library X
- ❌ Cons: Adds 50KB dependency
- Use when: Quick implementation needed

**Option B: [Name]**
- ✅ Pros: Zero dependencies, full control
- ❌ Cons: More code to maintain
- Use when: Performance critical path

**Option C: [Name]**
- ✅ Pros: Standard pattern in Fastify ecosystem
- ❌ Cons: Requires plugin architecture
- Use when: Need extensibility

✅ Recommendation: [Option X] because [tradeoff explanation]
```

### Push Back Scenarios

- **Vague requirement** → Ask for clarification
- **Over-engineered solution** → Propose minimal approach
- **Reinventing the wheel** → Suggest established library
- **No concrete use case** → Request example
- **Violates YAGNI** → Question if it's needed now

### Critical Questions to Ask

1. Does an NPM package already solve this?
2. What's the primary use case?
3. What happens with null/empty/malformed input?
4. How does this scale 10x/100x?
5. Can this be unit tested?
6. Are we over-engineering? (YAGNI check)

---

## Project-Specific Context

### Technology Stack

| Layer          | Technology                     | Usage                      |
| -------------- | ------------------------------ | -------------------------- |
| Orchestrator   | Platformatic Watt 3.x          | Service mesh coordination  |
| API Gateway    | Fastify 5.x                    | HTTP routing, plugins      |
| Message Broker | RabbitMQ 3.13+                 | Event-driven communication |
| Cache          | Redis 7.x + async-cache-dedupe | Response caching           |
| Monitoring     | Prometheus + Grafana           | Metrics & dashboards       |
| Observability  | Loki + Tempo + OpenTelemetry   | Logs & traces              |
| Reverse Proxy  | Caddy 2.x                      | TLS, routing               |

### Project Structure

```
services/[name]/
├── src/
│   ├── index.ts       # Fastify app entry point
│   ├── routes/        # HTTP route handlers
│   ├── services/      # Business logic (stateless)
│   ├── types/         # TypeScript interfaces
│   └── utils/         # Pure helper functions
├── test/
│   ├── *.spec.ts      # Unit tests
│   ├── *.integration.spec.ts
│   └── *.e2e.spec.ts
└── watt.json          # Platformatic config

packages/[name]/       # Shared libraries
├── src/
└── package.json

e2e/features/          # BDD scenarios (Gherkin)
infrastructure/        # Docker Compose stacks
docs/architecture/     # ADRs, diagrams
```

### Service Communication Patterns

**Synchronous (HTTP):**

```typescript
// Use Fastify http-proxy plugin
import proxy from '@fastify/http-proxy';

fastify.register(proxy, {
  upstream: 'http://patient-service:3000',
  prefix: '/api/patients',
});
```

**Asynchronous (Events):**

```typescript
// Use CloudEvents standard
import { CloudEvent } from 'cloudevents';

const event = new CloudEvent({
  type: 'com.healthcare.patient.created',
  source: '/gateway',
  data: { patientId: '123' },
});

await rabbitMQ.publish('patient.events', event);
```

### Platformatic Watt Specifics

**Service Registration:**

```json
// watt.json
{
  "services": [
    {
      "id": "gateway",
      "path": "./services/gateway",
      "entrypoint": true
    },
    {
      "id": "patient-api",
      "path": "./services/patient-api"
    }
  ]
}
```

**Inter-service Calls:**

```typescript
// Use Watt's service mesh
const response = await watt.inject({
  method: 'GET',
  url: '/patient-api/patients/123',
});
```

---

## Task Template

Use this format when planning work:

```markdown
### Task: [Short descriptive name]

**Epic**: [Reference from roadmap - e.g., Epic 3: Platformatic Watt Core]

**Acceptance Criteria**:

- [ ] Criterion 1 (testable)
- [ ] Criterion 2 (testable)
- [ ] Criterion 3 (testable)

**Use Case**:
[Concrete example - e.g., "When patient-api is unavailable, gateway returns 503 with retry-after header"]

**Implementation Plan**:

1. Step 1 (what to build)
2. Step 2 (how to test)
3. Step 3 (how to verify)

**Tests Required**:

- [ ] Unit: Happy path - [describe scenario]
- [ ] Unit: Error case - [describe scenario]
- [ ] Integration: [describe scenario]
- [ ] E2E: [reference to .feature file]

**Alternatives Evaluated**:

- ❌ Option A: Rejected because [reason]
- ✅ Option B: Chosen because [tradeoff rationale]
```

---

## Development Workflow

### Daily Cycle

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Run Watt in dev mode
npm run dev

# 3. Watch tests
npm run test:watch

# 4. Type check
npx tsc --noEmit

# 5. Lint & format
npm run quality:fix
```

### Pre-Commit Checklist

- [ ] All tests passing (`npm run test`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Lint clean (`npm run lint:check`)
- [ ] Formatted (`npm run format:check`)
- [ ] Complexity analysis passes (`npm run analyze:cognitive`)
- [ ] **Feature tracking updated** (`npm run features:update`)
- [ ] **features.json validated** (`npm run features:validate`)
- [ ] **Conventional commit format** (feat/fix/docs with US-XXX reference)

### Feature Tracking Workflow (MANDATORY)

**Before committing work on user stories:**

1. **Update features.json** from git commits:

   ```bash
   npm run features:update
   # Parses conventional commits since last release
   # Updates userStory.commits[], feature.commits[], release.unreleased
   ```

2. **Manually update progress** when completing user stories:

   ```json
   // features.json
   {
     "userStories": {
       "US-043": {
         "status": "done", // Update from "in-progress"
         "coverage": 100, // Add test coverage
         "completedAt": "2025-12-09T22:00:00Z" // Add timestamp
       }
     }
   }
   ```

3. **Validate schema compliance**:

   ```bash
   npm run features:validate
   # Ensures features.json matches features.schema.json
   ```

4. **Commit with conventional format**:

   ```bash
   git commit -m "feat(gateway): add prometheus metrics endpoint

   Implements US-043 with prom-client integration.
   Exposes /metrics endpoint with http_request_duration_ms histogram.

   BREAKING CHANGE: none"
   ```

**Conventional Commit Rules**:

- **Type**: `feat|fix|docs|style|refactor|perf|test|build|ci|chore`
- **Scope**: `gateway|auth|cache|telemetry|events` (optional)
- **Subject**: Imperative mood, lowercase, no period
- **Body**: Reference `US-XXX` or `EPIC-XXX` (auto-extracted by `features:update`)
- **Footer**: `BREAKING CHANGE:` triggers major version bump

**Pre-commit hook integration** (.husky/pre-commit):

```bash
#!/bin/bash
# Auto-update features.json before commit
npm run features:update
git add features.json

# Validate schema
npm run features:validate || exit 1
```

### Commands Reference

```bash
# Development
npm run dev              # Watt dev mode with auto-reload
npm run start            # Production build
npm run build            # TypeScript compilation

# Testing
npm run test             # Unit tests
npm run test:integration # Integration tests (requires .env.test)
npm run test:e2e         # E2E tests (BDD scenarios)
npm run test:cov         # Coverage report

# Quality
npm run lint             # ESLint with auto-fix
npm run format           # Prettier with auto-fix
npm run analyze          # Complexity analysis (cognitive + cyclomatic)
npm run verify           # Full verification (format + lint + test + build)

# Release
npm run release:suggest  # Preview version bump
npm run release          # Execute semantic release

# Security
npm run security:check   # Scan for hardcoded secrets
npm audit                # Dependency vulnerability check

# Keys & Secrets Generation
npm run keys:generate    # Interactive mode (all types)
npm run keys:rsa         # RSA key pair for JWT (2048-bit, dev)
npm run keys:rsa:prod    # RSA key pair for JWT (4096-bit, prod)
npm run keys:jwt         # JWT secret (HMAC-SHA256)
npm run keys:api         # API key (service-to-service)
npm run keys:session     # Session secret (cookie signing)
npm run keys:keycloak    # Keycloak client secret
npm run keys:all         # Generate all keys (development)
npm run keys:all:prod    # Generate all keys (production)

# Feature Tracking
npm run features:update  # Auto-update from git commits
npm run features:preview # Dry-run (preview changes)
npm run features:validate # JSON Schema validation
```

---

## Code Quality Gates

### ESLint Rules (Enforced)

- **Cognitive Complexity**: Max 10 (SonarJS)
- **Cyclomatic Complexity**: Max 10
- **Function Length**: Max 50 lines
- **Parameters**: Max 4
- **Nesting Depth**: Max 3
- **Statements per Line**: Max 1

### Anti-Patterns to Avoid

```typescript
// ❌ Deep nesting
if (user) {
  if (user.role) {
    if (user.role === 'admin') {
      // Bad!
    }
  }
}

// ✅ Early returns
if (!user) return;
if (!user.role) return;
if (user.role !== 'admin') return;
// Clean!

// ❌ Magic values
setTimeout(callback, 86400000);

// ✅ Named constants
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
setTimeout(callback, ONE_DAY_MS);

// ❌ God functions
async function handleRequest(req) {
  // 200 lines of logic
}

// ✅ Composed functions
async function handleRequest(req) {
  const validated = validateRequest(req);
  const enriched = await enrichData(validated);
  return formatResponse(enriched);
}
```

---

## Error Handling Patterns

### HTTP Errors (Fastify)

```typescript
import createError from '@fastify/error';

const ServiceUnavailableError = createError(
  'SERVICE_UNAVAILABLE',
  'Service %s is temporarily unavailable',
  503,
);

// Usage
if (!service.isHealthy) {
  throw new ServiceUnavailableError(service.name);
}
```

### Async Error Handling

```typescript
// ✅ Explicit error handling
async function fetchPatient(id: string): Promise<Patient> {
  try {
    const response = await patientApi.get(`/patients/${id}`);
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new ServiceUnavailableError('patient-api');
    }
    throw error; // Re-throw unknown errors
  }
}

// ❌ Silent failures
async function fetchPatient(id: string): Promise<Patient | null> {
  try {
    return await patientApi.get(`/patients/${id}`);
  } catch {
    return null; // Lost error context!
  }
}
```

### Circuit Breaker Pattern

```typescript
import { CircuitBreaker } from '@platformatic/circuit-breaker';

const breaker = new CircuitBreaker({
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

const result = await breaker.fire(() => fetch('http://patient-api/health'));
```

---

## Environment-Specific Guidelines

### Claude AI Environment Limitations

- **No network access** - Provide full output in code blocks
- **No file system persistence** - Confirm file operations
- **Iterative approach** - Small incremental changes
- **Context retention** - Reference this document if lost

### Development Environment

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_NAME=gateway_dev
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
```

### Test Environment

```bash
# .env.test (required for integration/e2e)
NODE_ENV=test
DATABASE_NAME=gateway_test  # MUST contain "test"
REDIS_URL=redis://localhost:6380
```

### Safety Guards

- `test-env-guard.sh` prevents running tests against production databases
- Database names with "prod", "production", "live" are blocked
- Always verify `NODE_ENV=test` before destructive operations

---

## Documentation Standards

### ADR (Architecture Decision Record)

Store in `docs/architecture/decisions/NNNN-title.md`

**Template:**

```markdown
# ADR-NNNN: [Title]

**Status**: Proposed | Accepted | Deprecated  
**Date**: YYYY-MM-DD  
**Decision Makers**: [Names]

## Context

[What problem are we solving?]

## Decision

[What did we decide?]

## Consequences

**Positive:**

- Benefit 1
- Benefit 2

**Negative:**

- Tradeoff 1
- Tradeoff 2

## Alternatives Considered

1. Option A - rejected because...
2. Option B - rejected because...
```

### Code Comments

```typescript
// ✅ Explain WHY, not WHAT
// Circuit breaker prevents cascading failures to patient-api
const breaker = new CircuitBreaker({ timeout: 3000 });

// ❌ State the obvious
// Create a circuit breaker
const breaker = new CircuitBreaker({ timeout: 3000 });

// ✅ Document non-obvious behavior
// RabbitMQ requires manual ACK in manual mode to prevent message loss
await channel.ack(msg);

// ✅ Warning comments
// WARNING: Changing this timeout affects SLA for patient lookup
const PATIENT_API_TIMEOUT = 2000;
```

---

## Security Guidelines

### Input Validation

```typescript
import { Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

// Define schema
const PatientSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String({ minLength: 1, maxLength: 100 }),
  birthDate: Type.String({ format: 'date' }),
});

// Compile for performance
const validator = TypeCompiler.Compile(PatientSchema);

// Validate
if (!validator.Check(input)) {
  throw new ValidationError(validator.Errors(input));
}
```

### Secrets Management

- **NEVER** commit secrets to Git
- Use `.env.example` as template
- `check-secrets.js` runs pre-commit to detect leaks
- Patterns detected:
  - API keys (AWS, GitHub, Stripe)
  - Private keys (RSA, PGP)
  - JWT tokens
  - Database credentials
  - Hardcoded passwords

### Dependency Security

```bash
# Run before each release
npm audit --audit-level=moderate
npm run security:check
```

---

## Performance Considerations

### Caching Strategy

```typescript
import { Cache } from '@platformatic/cache';

const cache = new Cache({
  ttl: 60, // seconds
  storage: 'redis',
});

// Cache expensive operations
const patient = await cache.define('patient', async (id: string) => {
  return await patientApi.get(`/patients/${id}`);
});

const result = await patient('123'); // Cached for 60s
```

### Response Time Targets

- **P50**: < 100ms
- **P95**: < 300ms
- **P99**: < 500ms

### Monitoring

```typescript
// Prometheus metrics
import { register, Counter, Histogram } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status'],
});

// Use in route handlers
const timer = httpRequestDuration.startTimer();
// ... handle request ...
timer({ method: 'GET', route: '/patients', status: 200 });
```

---

## Roadmap Context

### Epic Priorities

1. **Epic 1**: Infrastructure Foundation (Docker, Caddy, Redis, RabbitMQ)
2. **Epic 2**: Observability Stack (Prometheus, Loki, Tempo, Grafana)
3. **Epic 3**: Platformatic Watt Core (Gateway, routing, service discovery)
4. **Epic 4**: Event System (RabbitMQ, CloudEvents, DLQ)
5. **Epic 5**: Cache Layer (async-cache-dedupe)
6. **Epic 6**: n8n Workflows
7. **Epic 7**: Security & Hardening

### Current Focus

**Epic 3: Platformatic Watt Core** - Building service mesh and routing layer

---

## Quick Reference

### File Locations

- **Watt config**: `watt.json` (root + per service)
- **ESLint config**: `eslint.config.mjs`
- **Jest configs**: `jest.config.js`, `jest.integration.config.js`, `jest.e2e.config.js`
- **Git hooks**: `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push`
- **Scripts**: `scripts/*.js`, `scripts/*.sh`
- **BDD scenarios**: `e2e/features/*.feature`
- **ADRs**: `docs/architecture/decisions/`

### Key Scripts

- **Auto-release**: `scripts/auto-release.js` (semantic versioning)
- **Complexity**: `scripts/analyze-complexity.js` (cognitive + cyclomatic)
- **Secrets**: `scripts/check-secrets.js` (pre-commit scan)
- **Test guard**: `scripts/test-env-guard.sh` (safety checks)
- **AI context**: `scripts/prepare-copilot-context.sh` (token optimization)

### Commit Message Format

```
type(scope): subject

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

**Examples:**

```
feat(gateway): add circuit breaker for patient-api
fix(cache): prevent race condition in Redis connection
docs(adr): add decision record for event schema
test(routes): add e2e scenario for health check
```

---

## When in Doubt

1. **Check this document first** - Most patterns are documented here
2. **Search existing code** - Consistency over novelty
3. **Propose alternatives** - Devil's advocate pattern
4. **Ask for clarification** - Better than guessing
5. **Start minimal** - YAGNI over premature optimization

---

**Project**: Tech Citizen Software Gateway  
**Owner**: Antonio Cittadino  
**Methodology**: XP (Extreme Programming) with TDD/BDD  
**Quality Gates**: ESLint + SonarJS + Prettier + Commitlint  
**License**: MIT (adapt to project needs)

---

_Last Updated: 2025-12-08_  
_This document is auto-loaded by GitHub Copilot in this workspace._
