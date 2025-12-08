# Tech Citizen SW Gateway - Roadmap

**Vision**: Production-ready API Gateway for healthcare suite with enterprise-grade observability, security, and performance.

**Timeline**: Q4 2025 - Q2 2026 (6 months MVP)

---

## Phase 1: Foundation (Q4 2025)

**Goal**: Minimal viable infrastructure + security baseline

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

### Epic 2: Observability Stack ⏸️ BLOCKED

**Duration**: Sprint 2-3 (2 weeks)  
**Status**: Blocked by Epic 1

**Deliverables**:

- Prometheus alerting (P95 > 300ms, error rate > 5%)
- Structured logging with correlation IDs
- Basic Grafana alerts

**Success Metrics**:

- Alerts fire within 1 minute of SLA breach
- All logs include traceId for distributed tracing
- Mean Time To Detect (MTTD) < 2 minutes

---

### Epic 3: Server Security Hardening

**Duration**: Sprint 2 (1 week)  
**Status**: Not started

**Deliverables**:

- SSH hardening (Ansible playbook)
- UFW firewall + Fail2Ban
- Automatic security updates
- Kernel hardening

**Success Metrics**:

- Pass CIS Benchmark Level 1 (automated check)
- No direct root SSH access possible
- Auto-ban after 3 failed login attempts

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

## Phase 2: Core Gateway (Q1 2026)

**Goal**: Production-ready routing and resilience

### Epic 5: Service Routing & Discovery

**Duration**: Sprint 4-6 (3 weeks)  
**Status**: Not started

**Deliverables**:

- Platformatic Watt service mesh configured
- Dynamic service registration
- HTTP routing with path-based rules
- Circuit breaker pattern implemented

**Success Metrics**:

- New service auto-discovered in < 30s
- Circuit opens after 50% error rate in 10s window
- Zero manual routing config changes needed

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

### Epic 11: CI/CD Pipeline

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

### Epic 12: Disaster Recovery

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

### v0.1.0 - Foundation (End Sprint 2)

- Infrastructure setup complete
- Basic monitoring
- Security baseline

### v0.2.0 - Core Gateway (End Sprint 6)

- Service routing working
- Circuit breaker tested
- Production-ready observability

### v0.3.0 - Performance (End Sprint 10)

- Caching layer (if needed)
- Events system (if needed)
- P95 < 200ms target

### v1.0.0 - Production MVP (End Q1 2026)

- All Phase 2 epics complete
- CI/CD automated
- DR tested

---

## Revision History

- **2025-12-08**: Initial roadmap created, Epic 1 60% complete
- **2025-12-08**: Added security hardening epics from SECURITY_CHECKLIST.md
- **2025-12-08**: Deferred Epic 6-7-9 per ADR-0001 YAGNI principle

**Next Review**: Sprint 2 planning (Dec 15, 2025)
