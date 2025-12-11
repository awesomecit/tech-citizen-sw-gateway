# Test Coverage Analysis & Improvement Plan

**Last Updated**: 2025-12-11  
**Current Coverage**: 70% (409/582 lines)  
**Target v1.8.0**: 80%

---

## 📊 Current State

### Integration Tests (37 tests, ~4s)

**Existing** ✅:

- `packages/auth/test/keycloak.integration.test.ts` (14 tests)
  - OIDC discovery
  - Authorization Code Flow
  - Token validation
  - Error handling (invalid tokens, network failures)
- `packages/auth/test/keycloak-complete-flow.integration.test.ts` (14 tests)
  - Full authentication flow (login → callback → protected resource)
  - Session management
  - Token refresh
- `packages/auth/test/keycloak-with-helpers.integration.test.ts` (9 tests)
  - User management (create, find, delete)
  - Test helpers validation

**Infrastructure**:

- Keycloak 26.0.5 (auto-managed, Docker)
- Redis 7.x (auto-managed, Docker)
- Auto-start/stop via `scripts/test-infra-start.sh`

---

### E2E Tests (3 tests, ~57s)

**Existing** ✅:

- `e2e/smoke/startup.test.ts` (3 tests)
  - Gateway starts without crash loop
  - Health check responds
  - Graceful shutdown works

**Infrastructure**:

- Full stack (Gateway + Keycloak + Redis)
- Platformatic Watt runtime
- Real HTTP requests

---

## 🔴 Critical Gaps (P0 - Target v1.8.0)

### 1. Gateway E2E Tests (MISSING)

**File**: `services/gateway/src/index.ts` - **0% coverage** (125 lines)

**Missing Scenarios**:

```typescript
// e2e/gateway/routing.e2e.test.ts
describe('Gateway Routing E2E', () => {
  it('should route /auth/* to auth plugin');
  it('should protect routes with @fastify/jwt');
  it('should add correlation-id to all requests');
  it('should return 401 for missing token');
  it('should return 403 for invalid token');
  it('should handle OPTIONS preflight (CORS)');
});
```

**Why Critical**: Gateway entry point orchestrates everything, 0% coverage is unacceptable.

---

### 2. Session Management Integration Tests (MISSING)

**File**: `packages/auth/src/plugins/session.ts` - **0% coverage** (67 lines)

**Missing Scenarios**:

```typescript
// packages/auth/test/session.integration.test.ts
describe('Session Management Integration', () => {
  it('should create session in Redis');
  it('should retrieve session by session ID');
  it('should destroy session on logout');
  it('should handle session expiration (TTL)');
  it('should handle Redis connection failure gracefully');
  it('should regenerate session ID on login');
});
```

**Why Critical**: Sessions are core to authentication, no tests = production risk.

---

### 3. Keycloak Plugin Integration Tests (MISSING)

**File**: `packages/auth/src/plugins/keycloak.ts` - **0% coverage** (89 lines)

**Missing Scenarios**:

```typescript
// packages/auth/test/keycloak-plugin.integration.test.ts
describe('Keycloak Plugin Integration', () => {
  it('should register as Fastify plugin');
  it('should decorate Fastify with keycloak methods');
  it('should handle OIDC discovery at startup');
  it('should fail fast if Keycloak unreachable');
  it('should register /auth/login route');
  it('should register /auth/callback route');
  it('should register /auth/logout route');
});
```

**Why Critical**: Plugin registration is the entry point for all auth flows.

---

## 🟡 Important Gaps (P1 - Target v1.8.0)

### 4. Error Handling E2E Tests

**File**: `e2e/gateway/errors.e2e.test.ts` (NEW)

**Missing Scenarios**:

```gherkin
Feature: Gateway Error Handling

  Scenario: Service unavailable returns 503
    Given patient-api is down
    When I request GET /api/patients/123
    Then response status is 503
    And response contains "Service Temporarily Unavailable"
    And retry-after header is present

  Scenario: Invalid JSON returns 400
    When I POST /api/patients with invalid JSON "{broken"
    Then response status is 400
    And error code is "INVALID_JSON"

  Scenario: Rate limit exceeded returns 429
    Given I make 100 requests in 1 second
    Then response status is 429
    And retry-after header indicates cooldown
```

**Why Important**: Error responses are part of API contract, need E2E validation.

---

### 5. Performance E2E Tests

**File**: `e2e/performance/latency.e2e.test.ts` (NEW)

**Missing Scenarios**:

```typescript
describe('Gateway Performance E2E', () => {
  it('should respond to /health in < 50ms (P50)');
  it('should respond to authenticated request in < 300ms (P95)');
  it('should handle 100 concurrent requests without errors');
  it('should not leak memory during 1000 requests');
});
```

**Why Important**: SLA compliance verification (P95 < 300ms target).

---

## 🟢 Nice to Have (P2 - Target v1.9.0)

### 6. Schema Validation Tests

**Files**:

- `packages/auth/src/schemas/token.ts` - **0% coverage** (45 lines)
- `packages/auth/src/schemas/user.ts` - **0% coverage** (38 lines)

**Missing Scenarios**:

```typescript
// packages/auth/test/schemas.spec.ts (UNIT TEST)
describe('Token Schema Validation', () => {
  it('should validate valid JWT payload');
  it('should reject token without sub claim');
  it('should reject token with wrong type');
  it('should validate optional claims');
});
```

**Why Nice-to-Have**: Schemas are TypeBox definitions, property-based testing adds value but not critical.

---

### 7. Observability E2E Tests

**File**: `e2e/observability/metrics.e2e.test.ts` (NEW)

**Missing Scenarios**:

```typescript
describe('Observability E2E', () => {
  it('should expose Prometheus metrics at /metrics');
  it('should increment http_requests_total on each request');
  it('should track http_request_duration_ms histogram');
  it('should include correlation-id in all logs');
  it('should log errors with proper severity');
});
```

**Why Nice-to-Have**: Metrics are monitored but not business-critical for MVP.

---

### 8. BDD E2E Implementation

**Status**: 6 .feature files exist, **0 step definitions implemented**

**Files**:

```
e2e/features/
├── auth-jwt-validation.feature          (US-038) ✅ Unit tested
├── auth-keycloak-integration.feature    (US-039) ⚠️ Missing step defs
├── auth-session-management.feature      (US-040) ⚠️ Missing step defs
├── auth-schema-validation.feature       (US-041) ⚠️ Missing step defs
├── auth-plugin-registration.feature     (US-042) ⚠️ Missing step defs
└── keycloak-oidc-auth.feature          (US-039) ⚠️ Missing step defs
```

**Action Required**: Implement Cucumber/Jest step definitions or convert to E2E tests.

---

## 🎯 Improvement Plan (Phased)

### Phase 1: P0 Gaps (v1.8.0 - Sprint 3)

| Task                          | Effort   | Impact        | Owner    |
| ----------------------------- | -------- | ------------- | -------- |
| **Gateway routing E2E**       | 3 SP     | 🔴 Critical   | TBD      |
| **Session integration tests** | 2 SP     | 🔴 Critical   | TBD      |
| **Keycloak plugin tests**     | 2 SP     | 🔴 Critical   | TBD      |
| **Total**                     | **7 SP** | +10% coverage | Sprint 3 |

**Expected Coverage**: 70% → 80%

---

### Phase 2: P1 Gaps (v1.8.0 - Sprint 3/4)

| Task                   | Effort   | Impact       | Owner    |
| ---------------------- | -------- | ------------ | -------- |
| **Error handling E2E** | 2 SP     | 🟡 Important | TBD      |
| **Performance E2E**    | 3 SP     | 🟡 Important | TBD      |
| **Total**              | **5 SP** | +5% coverage | Sprint 4 |

**Expected Coverage**: 80% → 85%

---

### Phase 3: P2 Gaps (v1.9.0 - Sprint 5)

| Task                        | Effort   | Impact       | Owner    |
| --------------------------- | -------- | ------------ | -------- |
| **Schema validation tests** | 1 SP     | 🟢 Nice      | TBD      |
| **Observability E2E**       | 2 SP     | 🟢 Nice      | TBD      |
| **BDD step definitions**    | 3 SP     | 🟢 Nice      | TBD      |
| **Total**                   | **6 SP** | +5% coverage | Sprint 5 |

**Expected Coverage**: 85% → 90%

---

## 📋 Test Templates

### Integration Test Template

```typescript
// packages/<package>/test/<feature>.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';

/**
 * Integration Tests for <Feature>
 *
 * Infrastructure: <list dependencies>
 * Managed by: test:integration:infra wrapper
 */
describe('<Feature> Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    // Register plugin/setup
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Happy Path', () => {
    it('should <expected behavior>', async () => {
      // Arrange
      // Act
      // Assert
    });
  });

  describe('Error Handling', () => {
    it('should handle <error case>', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

---

### E2E Test Template

```typescript
// e2e/<area>/<feature>.e2e.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { setTimeout } from 'timers/promises';

/**
 * E2E Tests for <Feature>
 *
 * Infrastructure: Full stack (Gateway + deps)
 * Managed by: test:e2e:infra wrapper
 */
describe('<Feature> E2E', () => {
  let gatewayProcess: ChildProcess;
  const BASE_URL = 'http://localhost:3042';

  beforeAll(async () => {
    // Gateway already started by test:e2e:infra
    await setTimeout(2000); // Wait for readiness
  });

  afterAll(async () => {
    // Cleanup handled by test:e2e:infra
  });

  describe('User Journey', () => {
    it('should complete <end-to-end flow>', async () => {
      // Step 1: Arrange
      // Step 2: Act (HTTP requests)
      // Step 3: Assert (response validation)
    });
  });
});
```

---

## 🔍 Monitoring & Metrics

### Test Health Dashboard (Proposed)

```json
{
  "testSuites": {
    "unit": {
      "total": 28,
      "passing": 28,
      "duration": "1s",
      "coverage": "100%"
    },
    "integration": {
      "total": 37,
      "passing": 37,
      "duration": "4s",
      "coverage": "85%"
    },
    "e2e": {
      "total": 3,
      "passing": 3,
      "duration": "57s",
      "coverage": "60%"
    }
  },
  "overallCoverage": "70%",
  "target": "80%",
  "gap": "-10%"
}
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml (PROPOSED)
name: Test Suite
on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:unit

  integration:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:integration:infra

  e2e:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:e2e:infra
```

---

## 🎯 Success Metrics

| Milestone             | Coverage | Tests | Duration | SLA              |
| --------------------- | -------- | ----- | -------- | ---------------- |
| **v1.7.0** (Current)  | 70%      | 68    | ~1 min   | -                |
| **v1.8.0** (Sprint 3) | 80%      | 85+   | ~2 min   | P0 gaps closed   |
| **v1.9.0** (Sprint 5) | 85%      | 100+  | ~3 min   | P1 gaps closed   |
| **v2.0.0** (Q1 2026)  | 90%      | 120+  | ~4 min   | Production-ready |

---

## 📚 References

- **Testing Guide**: [docs/development/TESTING.md](TESTING.md)
- **BDD Scenarios**: [e2e/features/\*.feature](../../e2e/features/)
- **Coverage Report**: Run `npm run test:cov`
- **Technical Debt**: [docs/project/ROADMAP.md](../project/ROADMAP.md#technical-debt-register)

---

**Next Review**: Sprint 3 planning (2025-12-15)  
**Owner**: Development Team  
**Status**: 🟡 In Progress (P0 gaps identified)
