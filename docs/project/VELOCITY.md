# Tech Citizen SW Gateway - Velocity & Sprint Tracking

**Last Updated**: 2025-12-10  
**Team**: AI-Assisted Development (Antonio Cittadino + Claude Sonnet 4.5)  
**Sprint Duration**: 1 week (flexible, timeboxed)

---

## Current Sprint

**Sprint #**: 2  
**Start Date**: 2025-12-09  
**End Date**: 2025-12-15  
**Goal**: Complete Epic 3 (Platformatic Watt Core) - Session Management & TypeBox Validation

### Sprint Capacity

- **Planned Story Points**: 12 SP
- **Committed Story Points**: 8 SP
- **Completed Story Points**: 4 SP (50% complete)

### Sprint Backlog

| User Story                          | Status  | Estimate | Actual | Notes                                     |
| ----------------------------------- | ------- | -------- | ------ | ----------------------------------------- |
| US-040: Enhanced Session Management | ✅ DONE | 4 SP     | 4 SP   | Sliding window + auto-refresh implemented |
| US-041: TypeBox Schema Validation   | 📋 TODO | 3 SP     | -      | Planned for mid-sprint                    |
| US-042: Auth Plugin Composition     | 📋 TODO | 5 SP     | -      | Stretch goal                              |

---

## Velocity History

### Sprint 1 (2025-12-01 → 2025-12-08)

**Goal**: Foundation + Auth Package Core

**Metrics**:

- **Planned**: 15 SP
- **Completed**: 13 SP
- **Velocity**: 13 SP/week
- **Completion Rate**: 87%

**Completed User Stories**:

| User Story                                  | Estimate | Actual | Variance                |
| ------------------------------------------- | -------- | ------ | ----------------------- |
| US-037: Auth Package Structure              | 1 SP     | 1 SP   | 0%                      |
| US-038: JWT Validation Plugin (7 scenarios) | 3 SP     | 4 SP   | +33%                    |
| US-039: Keycloak OIDC Integration           | 4 SP     | 5 SP   | +25%                    |
| Gateway Integration                         | 3 SP     | 3 SP   | 0%                      |
| E2E Tests (9 scenarios)                     | 2 SP     | -      | Not estimated initially |

**Velocity Breakdown**:

- **Coding**: 10 SP (77%)
- **Testing**: 2 SP (15%)
- **Debugging/Fixes**: 1 SP (8%)

**Learnings**:

- ✅ BDD scenarios upfront accelerano sviluppo
- ⚠️ Underestimated Keycloak complexity (+25%)
- ✅ E2E tests caught integration issues early
- 🔄 Need buffer for unplanned work (secret scanner, demo users)

---

### Sprint 0 (2025-11-24 → 2025-11-30)

**Goal**: Infrastructure Foundation

**Metrics**:

- **Planned**: 13 SP (Epic-001)
- **Completed**: 10 SP
- **Velocity**: 10 SP/week
- **Completion Rate**: 77%

**Completed User Stories**:

| User Story                   | Estimate | Actual |
| ---------------------------- | -------- | ------ |
| US-001: Docker Compose Setup | 2 SP     | 2 SP   |
| US-002: Caddy Reverse Proxy  | 2 SP     | 2 SP   |
| US-003: Prometheus Metrics   | 1 SP     | 1 SP   |
| US-004: Grafana Dashboard    | 2 SP     | 2 SP   |
| US-005: Graceful Shutdown    | 2 SP     | 3 SP   |

**Deferred**:

- US-006: IaC Tests (3 SP) → moved to Sprint 2
- US-007: Security Checklist (1 SP) → moved to Sprint 2

---

## Velocity Trends

### Summary

| Sprint             | Planned | Completed     | Velocity | Completion %      |
| ------------------ | ------- | ------------- | -------- | ----------------- |
| Sprint 0           | 13 SP   | 10 SP         | 10 SP    | 77%               |
| Sprint 1           | 15 SP   | 13 SP         | 13 SP    | 87%               |
| Sprint 2 (current) | 12 SP   | 4 SP (so far) | TBD      | 33% (in progress) |

**Average Velocity**: 11.5 SP/week  
**Trend**: 📈 Improving (+30% from Sprint 0 to Sprint 1)

### Burndown Chart (Sprint 2)

```
Story Points Remaining
12 SP │●
11 SP │ ●
10 SP │  ●
 9 SP │   ●
 8 SP │    ● ← Day 1: US-040 started
 7 SP │    │
 6 SP │    │
 5 SP │    │
 4 SP │    ● ← Day 2: US-040 completed
 3 SP │     │
 2 SP │     │
 1 SP │     │
 0 SP └─────●──────────────→ Day 7 (target)
      D0  D1  D2  D3  D4  D5  D6  D7
```

**Status**: On track (33% complete after 2 days = ~17% expected)

---

## Story Point Reference

### Estimation Scale (Fibonacci)

| Points | Complexity   | Time Estimate | Example                        |
| ------ | ------------ | ------------- | ------------------------------ |
| 1 SP   | Trivial      | < 1 hour      | Config change, simple CRUD     |
| 2 SP   | Simple       | 1-2 hours     | Basic endpoint, unit tests     |
| 3 SP   | Moderate     | 2-4 hours     | Plugin integration, validation |
| 5 SP   | Complex      | 4-8 hours     | OAuth flow, RBAC system        |
| 8 SP   | Very Complex | 1-2 days      | Event sourcing, collaboration  |
| 13 SP  | Epic-level   | 2-3 days      | Full service implementation    |
| 21 SP  | Too Large    | Split it      | Needs decomposition            |

### Velocity Factors

**Accelerators** (increase velocity):

- ✅ Clear acceptance criteria (BDD scenarios)
- ✅ Reusable patterns (plugins, hooks)
- ✅ AI code generation (Copilot + Claude)
- ✅ Good test coverage (prevents rework)

**Decelerators** (reduce velocity):

- ⚠️ Unclear requirements (discovery work)
- ⚠️ External dependencies (Keycloak config)
- ⚠️ Technical debt (refactoring needed)
- ⚠️ Unplanned work (bugs, security fixes)

---

## Epic Progress

### Epic 1: Infrastructure Foundation

**Status**: ✅ 77% COMPLETE (10/13 SP)

| User Story                 | Status  | SP  |
| -------------------------- | ------- | --- |
| US-001: Docker Compose     | ✅ DONE | 2   |
| US-002: Caddy Proxy        | ✅ DONE | 2   |
| US-003: Prometheus         | ✅ DONE | 1   |
| US-004: Grafana            | ✅ DONE | 2   |
| US-005: Graceful Shutdown  | ✅ DONE | 3   |
| US-006: IaC Tests          | 📋 TODO | 3   |
| US-007: Security Checklist | 📋 TODO | 1   |

**Remaining Work**: 3 SP  
**ETA**: Sprint 3 (low priority)

---

### Epic 3: Platformatic Watt Core

**Status**: 🔄 33% COMPLETE (4/12 SP)

| User Story                 | Status  | SP  |
| -------------------------- | ------- | --- |
| US-040: Session Manager    | ✅ DONE | 4   |
| US-041: TypeBox Validation | 📋 TODO | 3   |
| US-042: Auth Composition   | 📋 TODO | 5   |

**Remaining Work**: 8 SP  
**ETA**: Sprint 2 completion (Dec 15)

---

### Epic 9: Reusable Auth Package

**Status**: ✅ 60% COMPLETE (8/13 SP)

| User Story                  | Status  | SP  |
| --------------------------- | ------- | --- |
| US-037: Package Structure   | ✅ DONE | 1   |
| US-038: JWT Plugin          | ✅ DONE | 3   |
| US-039: Keycloak Plugin     | ✅ DONE | 4   |
| US-043: Metrics Integration | 📋 TODO | 2   |
| US-044: Circuit Breaker     | 📋 TODO | 3   |

**Remaining Work**: 5 SP  
**ETA**: Sprint 3

---

## Forecast

### Based on Average Velocity (11.5 SP/week)

| Epic                      | Remaining SP | Estimated Completion |
| ------------------------- | ------------ | -------------------- |
| Epic 3: Platformatic Watt | 8 SP         | Sprint 2 (Dec 15)    |
| Epic 9: Auth Package      | 5 SP         | Sprint 3 (Dec 22)    |
| Epic 1: Infrastructure    | 3 SP         | Sprint 3 (Dec 22)    |
| Epic 2: Observability     | 9 SP         | Sprint 4 (Dec 29)    |

**Total Remaining Work**: ~25 SP  
**Estimated Completion**: End of Sprint 4 (Dec 29)

---

## Continuous Improvement

### Sprint 1 Retrospective

**What Went Well** ✅:

- BDD scenarios as acceptance criteria accelerated development
- AI-assisted refactoring (ESLint fixes) saved ~2 hours
- E2E tests caught Keycloak integration issues early
- Demo users auto-provisioning avoided manual setup

**What Needs Improvement** ⚠️:

- Better estimation for external dependencies (Keycloak)
- Buffer time for unplanned work (secret scanner, smoke tests)
- Earlier integration testing (caught signal handler conflict late)

**Action Items** 🎯:

1. Add 20% buffer for stories with external dependencies
2. Run smoke tests after each major feature (not just at end)
3. Document common patterns (auth flow, plugin registration) for faster development

---

## Next Sprint Planning

### Sprint 3 Forecast (2025-12-16 → 2025-12-22)

**Capacity**: 12 SP (based on average velocity)

**Candidates**:

1. US-041: TypeBox Validation (3 SP) - if not completed in Sprint 2
2. US-042: Auth Composition (5 SP) - if not completed in Sprint 2
3. US-043: Metrics Integration (2 SP)
4. US-006: IaC Tests (3 SP) - low priority
5. New: Operator Service CRUD (5 SP) - start next epic?

**Priority**: Complete Epic 3 before starting new epics

---

**Maintainer**: Antonio Cittadino  
**Last Review**: 2025-12-10  
**Next Review**: 2025-12-15 (Sprint 2 retrospective)
