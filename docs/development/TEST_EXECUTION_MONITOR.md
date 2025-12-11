# Test Execution Monitor

**Purpose**: Real-time tracking of test suite health and flakiness  
**Updated**: Auto-generated on each `npm test` run

---

## 📊 Current Snapshot (2025-12-11)

### Overall Status

```
✅ PASSING   68/68 tests (100%)
⏱️ DURATION  ~62s total
📈 COVERAGE  70% (409/582 lines)
🎯 TARGET    80% (v1.8.0)
```

---

## 🧪 Test Suites Breakdown

### Unit Tests

```bash
npm run test:unit
```

| Metric          | Value                 | Status    |
| --------------- | --------------------- | --------- |
| **Total Tests** | 28                    | ✅        |
| **Passing**     | 28                    | ✅        |
| **Failing**     | 0                     | ✅        |
| **Duration**    | ~1s                   | ✅ Fast   |
| **Coverage**    | 100% (modules tested) | ✅        |
| **Flakiness**   | 0%                    | ✅ Stable |

**Files**:

- `packages/auth/test/plugins/jwt.spec.ts` (7 tests)
- `packages/auth/test/keycloak.test.ts` (14 tests)
- `packages/auth/test/index.spec.ts` (7 tests)

**Last Failure**: None (stable since v1.7.0)

---

### Integration Tests

```bash
npm run test:integration:infra
```

| Metric          | Value                | Status    |
| --------------- | -------------------- | --------- |
| **Total Tests** | 37                   | ✅        |
| **Passing**     | 37                   | ✅        |
| **Failing**     | 0                    | ✅        |
| **Duration**    | ~4s                  | ✅ Fast   |
| **Coverage**    | 85% (Keycloak flows) | ✅        |
| **Flakiness**   | 0%                   | ✅ Stable |
| **Infra Start** | ~2s (Docker)         | ✅        |
| **Infra Stop**  | ~1s                  | ✅        |

**Infrastructure**:

- Keycloak 26.0.5 (Docker, port 8091)
- Redis 7.x (Docker, port 6381)
- Auto-managed by `scripts/test-infra-start.sh`

**Files**:

- `packages/auth/test/keycloak.integration.test.ts` (14 tests)
- `packages/auth/test/keycloak-complete-flow.integration.test.ts` (14 tests)
- `packages/auth/test/keycloak-with-helpers.integration.test.ts` (9 tests)

**Last Failure**: None (stable since v1.7.0)

**Known Issues**: None

---

### E2E Tests

```bash
npm run test:e2e:infra
```

| Metric          | Value               | Status    |
| --------------- | ------------------- | --------- |
| **Total Tests** | 3                   | ✅        |
| **Passing**     | 3                   | ✅        |
| **Failing**     | 0                   | ✅        |
| **Duration**    | ~57s                | ⚠️ Slow   |
| **Coverage**    | 60% (startup flows) | ⚠️ Low    |
| **Flakiness**   | 0%                  | ✅ Stable |
| **Infra Start** | ~15s (Full stack)   | ⚠️        |
| **Infra Stop**  | ~2s                 | ✅        |

**Infrastructure**:

- Gateway (Platformatic Watt)
- Keycloak 26.0.5 (Docker, port 8091)
- Redis 7.x (Docker, port 6381)
- Auto-managed by `scripts/test-infra-start.sh`

**Files**:

- `e2e/smoke/startup.test.ts` (3 tests)

**Last Failure**: None (stable since v1.7.0)

**Known Issues**:

- ⚠️ **PIPEWRAP handle warning** (non-critical, Redis connection cleanup)
- ⚠️ **Long startup time** (15s for Watt, optimization needed)

---

## 🚨 Failure Tracking

### Recent Failures (Last 7 Days)

| Date | Suite | Test | Reason | Status         |
| ---- | ----- | ---- | ------ | -------------- |
| -    | -     | -    | -      | ✅ No failures |

### Flaky Tests (Last 30 Days)

| Test | Failures | Success Rate | Action            |
| ---- | -------- | ------------ | ----------------- |
| -    | -        | -            | ✅ No flaky tests |

---

## 📈 Trends

### Coverage Progression

```
v1.5.0  62% (84/135 lines)  ← babel provider
v1.6.0  62% (84/135 lines)  ← no change
v1.7.0  70% (409/582 lines) ← v8 provider migration ✅
v1.8.0  80% (target)        ← P0 gaps closed
```

### Test Count Growth

```
v1.5.0  54 tests
v1.6.0  62 tests (+8)
v1.7.0  68 tests (+6)
v1.8.0  85+ tests (target +17)
```

### Duration Changes

```
v1.5.0  ~45s total
v1.6.0  ~52s total
v1.7.0  ~62s total
v1.8.0  ~120s target (with new E2E tests)
```

---

## ⚠️ Performance Alerts

### Slow Tests (> 5s)

| Test                                 | Duration | Threshold | Status                |
| ------------------------------------ | -------- | --------- | --------------------- |
| `startup.test.ts` - Gateway startup  | 15s      | 10s       | ⚠️ **Over threshold** |
| `keycloak-complete-flow` - Full auth | 3.2s     | 5s        | ✅ OK                 |

**Action**: Optimize Gateway startup time (investigate Watt initialization).

---

### Resource Usage

| Metric                | Value                | Threshold | Status     |
| --------------------- | -------------------- | --------- | ---------- |
| **Memory Peak**       | ~450MB               | 1GB       | ✅ OK      |
| **Docker Containers** | 2 (Keycloak + Redis) | 5         | ✅ OK      |
| **Open Handles**      | 1 (PIPEWRAP)         | 5         | ⚠️ Warning |

**Action**: Investigate Redis connection cleanup in E2E tests.

---

## 🎯 Coverage Gaps (From Analysis)

### P0 - Critical (v1.8.0)

| File                                    | Current | Target | Gap  | Tests Needed         |
| --------------------------------------- | ------- | ------ | ---- | -------------------- |
| `services/gateway/src/index.ts`         | 0%      | 80%    | -80% | 🔴 E2E routing tests |
| `packages/auth/src/plugins/session.ts`  | 0%      | 80%    | -80% | 🔴 Integration tests |
| `packages/auth/src/plugins/keycloak.ts` | 0%      | 80%    | -80% | 🔴 Integration tests |

### P1 - Important (v1.8.0)

| Area           | Current | Target | Gap  | Tests Needed           |
| -------------- | ------- | ------ | ---- | ---------------------- |
| Error handling | 0%      | 70%    | -70% | 🟡 E2E error scenarios |
| Performance    | 0%      | 50%    | -50% | 🟡 E2E latency tests   |

### P2 - Nice to Have (v1.9.0)

| Area              | Current | Target | Gap  | Tests Needed         |
| ----------------- | ------- | ------ | ---- | -------------------- |
| Schema validation | 0%      | 60%    | -60% | 🟢 Unit tests        |
| Observability     | 0%      | 40%    | -40% | 🟢 E2E metrics tests |

---

## 🔧 Infrastructure Health

### Docker Containers Status

```bash
# Check running containers
docker ps --filter "name=keycloak" --filter "name=redis"
```

| Container       | Status     | Port | Health     |
| --------------- | ---------- | ---- | ---------- |
| `keycloak-test` | ✅ Running | 8091 | ✅ Healthy |
| `redis-test`    | ✅ Running | 6381 | ✅ Healthy |

### Test Environment Variables

```bash
# .env.test (auto-loaded)
NODE_ENV=test
KEYCLOAK_URL=http://localhost:8091
REDIS_URL=redis://localhost:6381
LOG_LEVEL=error
```

---

## 📋 Quick Troubleshooting

### Common Issues

| Issue                       | Solution                                       |
| --------------------------- | ---------------------------------------------- | ----------- |
| **Port already in use**     | `npm run test:cleanup`                         |
| **Keycloak not responding** | Check Docker logs: `docker logs keycloak-test` |
| **Redis connection error**  | Verify Redis running: `docker ps               | grep redis` |
| **Tests hang**              | Kill stale processes: `pkill -f "wattpm dev"`  |
| **Coverage not generated**  | Run: `npm run test:cov` (separate command)     |

### Manual Cleanup

```bash
# Stop all test infrastructure
npm run test:cleanup

# Force kill all Docker containers
docker compose -f docker-compose.test.yml down -v

# Clean Jest cache
npx jest --clearCache
```

---

## 🎬 CI/CD Integration (Proposed)

### GitHub Actions Workflow

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    timeout-minutes: 2
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit

  integration:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration:infra

  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:e2e:infra

  coverage:
    needs: [unit, integration, e2e]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:cov
      - uses: codecov/codecov-action@v4
```

---

## 📊 Monitoring Commands

### Real-time Test Execution

```bash
# Watch mode (unit tests only)
npm run test:watch

# Run specific suite
npm run test:unit
npm run test:integration:infra
npm run test:e2e:infra

# Run all suites
npm test
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:cov

# Open HTML report
open coverage/lcov-report/index.html

# Check coverage thresholds
npx jest --coverage --coverageThreshold='{"global":{"lines":70}}'
```

### Performance Profiling

```bash
# Analyze test duration
npm test -- --verbose

# Memory leak detection
node --expose-gc node_modules/.bin/jest --logHeapUsage
```

---

## 🔔 Alerts & Notifications

### Failure Thresholds

| Metric                | Threshold | Action         |
| --------------------- | --------- | -------------- |
| **Test Failures**     | > 0       | 🚨 Block merge |
| **Coverage Drop**     | < 70%     | 🚨 Block merge |
| **Duration Increase** | > 20%     | ⚠️ Investigate |
| **Flakiness**         | > 5%      | ⚠️ Fix or skip |

### Escalation Path

1. **Test fails** → Developer notified immediately
2. **Flaky test detected** → Create issue, tag owner
3. **Coverage drops** → Require additional tests before merge
4. **Performance degradation** → Profile and optimize

---

**Last Updated**: 2025-12-11 (auto-generated)  
**Next Review**: 2025-12-15 (Sprint 3 planning)  
**Owner**: Development Team
