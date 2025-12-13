# EPIC-002: Observability Stack (Gateway Admin Hub)

**Epic ID**: EPIC-002  
**Parent**: Phase 1 - Foundation  
**Status**: 🔄 IN PROGRESS (0/8 user stories)  
**Priority**: P1 (Blocks production deployment)  
**Owner**: Antonio Cittadino  
**Start Date**: 2025-12-13  
**Target Date**: 2025-12-20 (1 week)

---

## Vision

Implementare stack di osservabilità progressivo seguendo il modello L0→L1→L2→L3 definito in EPIC001.md (Gateway Admin Hub ADR-003). Ogni livello è deployabile, testabile e fornisce valore incrementale.

---

## Success Metrics

- ✅ L1 deployed: Prometheus scrapes `/metrics`, Grafana visualizza dashboard
- ✅ L2 deployed: Loki aggrega log, Tempo raccoglie trace, correlazione funzionante
- ✅ L3 ready: Node Exporter, cAdvisor attivi, dashboard infra funzionante
- ✅ E2E tests: Tutti i livelli validati con Tap (health checks, data flow, correlation)
- ✅ Resource limits: RAM < 2GB per L2, < 4GB per L3

---

## Architecture Overview

```
L0: Gateway Standalone (già implementato)
    └─→ Feature flags: telemetry=false

L1: Metrics Layer (+512MB RAM)
    Gateway → Prometheus → Grafana
    └─→ Feature flags: telemetry=true, metrics=prometheus

L2: Full Observability (+1GB RAM)
    Gateway → Prometheus → Grafana
            → Loki ←─ Promtail (Docker logs)
            → Tempo ←─ OTEL Collector
    └─→ Feature flags: telemetry=true, logging=loki, tracing=tempo

L3: Infrastructure Monitoring (+500MB RAM)
    [L2] + Node Exporter + cAdvisor
    └─→ Dashboards: Admin Hub, Infrastructure, Logs & Traces
```

---

## User Stories (8 totali)

### US-008: Setup Prometheus Scraping ✅ L1

**As a** SRE  
**I want** Prometheus to scrape gateway `/metrics` endpoint  
**So that** I can monitor request rate, latency (P50/P95/P99), and error rate

**Acceptance Criteria**:

- [ ] `infrastructure/prometheus/prometheus.yml` configurato con job `gateway`
- [ ] Prometheus scraping interval: 15s (production-ready)
- [ ] Prometheus UI (`localhost:19090`) mostra target `gateway` UP
- [ ] Metriche visibili: `http_request_duration_ms_bucket`, `http_request_duration_ms_sum`, `http_request_duration_ms_count`
- [ ] Test E2E: `e2e/observability/prometheus-scraping.e2e.test.ts` verifica:
  - Prometheus healthy
  - Gateway target UP
  - Almeno 1 metrica disponibile

**Tasks**:

1. Aggiorna `prometheus.yml` con job gateway (scrape port 3042)
2. Crea test E2E per validare scraping
3. Documenta metriche in `docs/operations/METRICS.md`

**Estimate**: 2h  
**Dependencies**: Gateway già espone `/metrics` (fatto in commit precedente)

**Definition of Done**:

- ✅ Commit atomico con message: `feat(infra): add Prometheus scraping for gateway metrics`
- ✅ Test E2E passa: `npm run test:e2e:infra -- e2e/observability/prometheus-scraping.e2e.test.ts`
- ✅ CI/CD green
- ✅ README.md aggiornato con comandi verifica Prometheus

---

### US-009: Grafana Datasource Provisioning ✅ L1

**As a** DevOps  
**I want** Grafana auto-configured with Prometheus datasource  
**So that** I can visualize metrics without manual setup

**Acceptance Criteria**:

- [ ] `infrastructure/grafana/provisioning/datasources/prometheus.yml` creato
- [ ] Grafana UI mostra datasource "Prometheus" (verde, healthy)
- [ ] Test query PromQL funzionante: `rate(http_request_duration_ms_count[5m])`
- [ ] Test E2E: `e2e/observability/grafana-datasource.e2e.test.ts` verifica:
  - Grafana healthy
  - Datasource Prometheus raggiungibile
  - Query PromQL restituisce dati

**Tasks**:

1. Crea `provisioning/datasources/prometheus.yml` con URL `http://prometheus:9090`
2. Testa query PromQL da Grafana Explore
3. Crea test E2E per validare datasource
4. Documenta in `docs/operations/GRAFANA_SETUP.md`

**Estimate**: 2h  
**Dependencies**: US-008 (Prometheus scraping attivo)

**Definition of Done**:

- ✅ Commit: `feat(infra): add Grafana Prometheus datasource provisioning`
- ✅ Test E2E passa
- ✅ Screenshot datasource verde in `docs/operations/screenshots/grafana-datasource.png`

---

### US-010: Dashboard Admin Hub (Foundation) ✅ L1

**As a** SRE  
**I want** Grafana dashboard "Admin Hub" con metriche gateway essenziali  
**So that** I can monitor system health at a glance

**Acceptance Criteria**:

- [ ] Dashboard JSON in `infrastructure/grafana/dashboards/admin-hub.json`
- [ ] Pannelli implementati:
  - Request Rate (req/s) - PromQL: `rate(http_request_duration_ms_count[5m])`
  - Latency P50/P95/P99 (ms) - PromQL: `histogram_quantile(0.95, ...)`
  - Error Rate (%) - PromQL: `rate(http_request_duration_ms_count{status=~"5.."}[5m])`
  - Uptime (%) - PromQL: `up{job="gateway"}`
- [ ] Dashboard auto-loaded via `provisioning/dashboards/default.yml`
- [ ] Test E2E: `e2e/observability/admin-hub-dashboard.e2e.test.ts` verifica:
  - Dashboard esiste in Grafana
  - Tutti i 4 pannelli mostrano dati

**Tasks**:

1. Crea dashboard JSON con 4 pannelli base
2. Configura provisioning per auto-load
3. Genera traffic test per popolare metriche
4. Crea test E2E per validare dashboard
5. Documenta query PromQL in `docs/operations/PROMQL_QUERIES.md`

**Estimate**: 3h  
**Dependencies**: US-009 (datasource configurato)

**Definition of Done**:

- ✅ Commit: `feat(infra): add Admin Hub dashboard with gateway metrics`
- ✅ Test E2E passa
- ✅ Screenshot dashboard in `docs/operations/screenshots/admin-hub.png`
- ✅ Video 30s demo in `docs/operations/videos/admin-hub-demo.mp4`

---

### US-011: Loki + Promtail Setup ✅ L2

**As a** DevOps  
**I want** Loki to aggregate logs from gateway container  
**So that** I can search and filter logs without SSH into containers

**Acceptance Criteria**:

- [ ] `docker-compose.observability.yml` creato con servizi Loki + Promtail
- [ ] Loki config: `infrastructure/loki/loki-config.yml` (retention 7 giorni)
- [ ] Promtail config: `infrastructure/promtail/promtail-config.yml` (scrape Docker logs)
- [ ] Gateway log format: JSON strutturato (già fatto in ADR-004)
- [ ] Grafana datasource Loki aggiunto in provisioning
- [ ] Test E2E: `e2e/observability/loki-aggregation.e2e.test.ts` verifica:
  - Loki healthy
  - Promtail invia logs a Loki
  - Query LogQL restituisce gateway logs: `{job="gateway"}`

**Tasks**:

1. Crea `docker-compose.observability.yml` con Loki, Promtail
2. Configura Loki storage (retention, limits)
3. Configura Promtail scraping Docker `/var/lib/docker/containers`
4. Aggiungi datasource Loki a Grafana provisioning
5. Crea test E2E con log injection + query LogQL
6. Documenta LogQL queries in `docs/operations/LOGQL_QUERIES.md`

**Estimate**: 4h  
**Dependencies**: ADR-004 (structured logging già implementato)

**Definition of Done**:

- ✅ Commit: `feat(infra): add Loki and Promtail for log aggregation`
- ✅ Test E2E passa
- ✅ Comando deploy L2: `docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d`
- ✅ README.md aggiornato con sezione "Logging with Loki"

---

### US-012: Tempo + OTEL Collector Setup ✅ L2

**As a** Developer  
**I want** distributed tracing with Tempo  
**So that** I can debug slow requests across microservices

**Acceptance Criteria**:

- [ ] Tempo aggiunto a `docker-compose.observability.yml`
- [ ] Tempo config: `infrastructure/tempo/tempo.yml` (storage local, retention 48h)
- [ ] OTEL Collector config: `infrastructure/otel/otel-collector-config.yml`
- [ ] Gateway instrumentato con `@opentelemetry/sdk-node` (già fatto parzialmente)
- [ ] Grafana datasource Tempo aggiunto
- [ ] Correlazione traceId: Log → Trace navigation funzionante
- [ ] Test E2E: `e2e/observability/tempo-tracing.e2e.test.ts` verifica:
  - Tempo healthy
  - OTEL Collector riceve spans
  - Query trace per traceId restituisce span gateway

**Tasks**:

1. Aggiungi Tempo + OTEL Collector a `docker-compose.observability.yml`
2. Configura OTEL pipeline (receivers, processors, exporters)
3. Instrumenta gateway con OTEL SDK (auto-instrumentation Fastify)
4. Configura trace context propagation (W3C Trace Context)
5. Aggiungi traceId a log strutturati (correlazione)
6. Crea test E2E con request → span → log correlation
7. Documenta in `docs/operations/TRACING.md`

**Estimate**: 5h  
**Dependencies**: US-011 (Loki per correlazione log-trace)

**Definition of Done**:

- ✅ Commit: `feat(infra): add Tempo and OTEL Collector for distributed tracing`
- ✅ Test E2E passa
- ✅ Demo correlation: Click log → jump to trace in Grafana
- ✅ Video 60s in `docs/operations/videos/trace-correlation-demo.mp4`

---

### US-013: Node Exporter + cAdvisor Setup ✅ L3

**As a** SRE  
**I want** host and container metrics  
**So that** I can monitor CPU, RAM, disk, network usage

**Acceptance Criteria**:

- [ ] Node Exporter aggiunto a `docker-compose.observability.yml`
- [ ] cAdvisor aggiunto per container metrics
- [ ] Prometheus scraping configurato per:
  - `node-exporter:9100` (host metrics)
  - `cadvisor:8080` (container metrics)
- [ ] Test E2E: `e2e/observability/infra-metrics.e2e.test.ts` verifica:
  - Node Exporter healthy
  - cAdvisor healthy
  - Metriche disponibili: `node_cpu_seconds_total`, `container_memory_usage_bytes`

**Tasks**:

1. Aggiungi Node Exporter con mount `/proc`, `/sys`
2. Aggiungi cAdvisor con mount `/var/run/docker.sock`
3. Configura Prometheus scraping per entrambi
4. Crea test E2E per validare metriche
5. Documenta in `docs/operations/INFRASTRUCTURE_MONITORING.md`

**Estimate**: 2h  
**Dependencies**: US-008 (Prometheus già configurato)

**Definition of Done**:

- ✅ Commit: `feat(infra): add Node Exporter and cAdvisor for infrastructure metrics`
- ✅ Test E2E passa
- ✅ Query Prometheus mostra metriche infra

---

### US-014: Dashboard Infrastructure ✅ L3

**As a** SRE  
**I want** Grafana dashboard "Infrastructure" con metriche host e container  
**So that** I can monitor resource usage and capacity planning

**Acceptance Criteria**:

- [ ] Dashboard JSON in `infrastructure/grafana/dashboards/infrastructure.json`
- [ ] Pannelli implementati:
  - **Host Metrics**:
    - CPU Usage (%) - PromQL: `100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`
    - RAM Usage (%) - PromQL: `(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100`
    - Disk Usage (%) - PromQL: `100 - ((node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100)`
    - Network I/O (MB/s) - PromQL: `rate(node_network_receive_bytes_total[5m])`
  - **Container Metrics**:
    - CPU per container - PromQL: `rate(container_cpu_usage_seconds_total[5m])`
    - RAM per container - PromQL: `container_memory_usage_bytes`
    - Container restart count - PromQL: `container_last_seen`
- [ ] Test E2E: `e2e/observability/infrastructure-dashboard.e2e.test.ts` verifica:
  - Dashboard esiste
  - Tutti i pannelli mostrano dati

**Tasks**:

1. Crea dashboard JSON con pannelli host + container
2. Configura provisioning per auto-load
3. Testa query PromQL per tutte le metriche
4. Crea test E2E per validare dashboard
5. Documenta query in `docs/operations/PROMQL_QUERIES.md`

**Estimate**: 3h  
**Dependencies**: US-013 (Node Exporter + cAdvisor attivi)

**Definition of Done**:

- ✅ Commit: `feat(infra): add Infrastructure dashboard with host and container metrics`
- ✅ Test E2E passa
- ✅ Screenshot dashboard in `docs/operations/screenshots/infrastructure.png`

---

### US-015: Dashboard Logs & Traces ✅ L2

**As a** Developer  
**I want** Grafana dashboard "Logs & Traces" per debugging  
**So that** I can correlate logs, traces e metriche in un'unica vista

**Acceptance Criteria**:

- [ ] Dashboard JSON in `infrastructure/grafana/dashboards/logs-traces.json`
- [ ] Pannelli implementati:
  - **Log Stream**: Loki query con filtri per service, level, traceId
  - **Trace Search**: Tempo query per traceId lookup
  - **Service Map**: Visualizzazione dipendenze (future: quando multi-service)
  - **Error Grouping**: Log filter `{level="error"}` con count per endpoint
- [ ] Correlazione funzionante:
  - Click su log → Jump to trace (se traceId presente)
  - Click su trace span → Jump to logs (filter by traceId)
- [ ] Test E2E: `e2e/observability/logs-traces-dashboard.e2e.test.ts` verifica:
  - Dashboard esiste
  - Log stream mostra gateway logs
  - Trace search funziona
  - Correlazione log→trace→log funzionante

**Tasks**:

1. Crea dashboard JSON con pannelli log, trace, correlation
2. Configura data links per correlazione (traceId field)
3. Testa correlazione end-to-end con request reale
4. Crea test E2E con log injection + trace + correlation
5. Documenta in `docs/operations/CORRELATION_GUIDE.md`
6. Video demo 90s

**Estimate**: 4h  
**Dependencies**: US-011 (Loki), US-012 (Tempo)

**Definition of Done**:

- ✅ Commit: `feat(infra): add Logs & Traces dashboard with correlation`
- ✅ Test E2E passa
- ✅ Video demo correlation in `docs/operations/videos/correlation-demo.mp4`
- ✅ README.md aggiornato con sezione "Debugging with Logs & Traces"

---

## Testing Strategy

### Unit Tests (N/A per questo epic)

Configuration files non richiedono unit test (validati da schema YAML).

### Integration Tests

Ogni user story ha **test E2E con Tap** che verifica:

- Service health check (Prometheus, Loki, Tempo, Grafana)
- Data flow (gateway → collector → storage)
- Query funzionanti (PromQL, LogQL, Trace search)
- Correlation (log ↔ trace navigation)

### E2E Test Structure

```typescript
// e2e/observability/prometheus-scraping.e2e.test.ts
import { test } from 'tap';
import { fetch } from 'undici';

test('Prometheus scrapes gateway metrics', async t => {
  // 1. Check Prometheus health
  const promHealth = await fetch('http://localhost:19090/-/healthy');
  t.equal(promHealth.status, 200, 'Prometheus healthy');

  // 2. Check gateway target UP
  const targets = await fetch('http://localhost:19090/api/v1/targets').then(r =>
    r.json(),
  );
  const gatewayTarget = targets.data.activeTargets.find(
    t => t.labels.job === 'gateway',
  );
  t.ok(gatewayTarget, 'Gateway target exists');
  t.equal(gatewayTarget.health, 'up', 'Gateway target UP');

  // 3. Query gateway metrics
  const query = encodeURIComponent('http_request_duration_ms_count');
  const metrics = await fetch(
    `http://localhost:19090/api/v1/query?query=${query}`,
  ).then(r => r.json());
  t.ok(metrics.data.result.length > 0, 'Gateway metrics available');
});
```

### Test Execution Order

```bash
# L1 tests (sequenziali)
npm run test:e2e:infra -- e2e/observability/prometheus-scraping.e2e.test.ts
npm run test:e2e:infra -- e2e/observability/grafana-datasource.e2e.test.ts
npm run test:e2e:infra -- e2e/observability/admin-hub-dashboard.e2e.test.ts

# L2 tests (dopo L1)
npm run test:e2e:infra -- e2e/observability/loki-aggregation.e2e.test.ts
npm run test:e2e:infra -- e2e/observability/tempo-tracing.e2e.test.ts
npm run test:e2e:infra -- e2e/observability/logs-traces-dashboard.e2e.test.ts

# L3 tests (dopo L2)
npm run test:e2e:infra -- e2e/observability/infra-metrics.e2e.test.ts
npm run test:e2e:infra -- e2e/observability/infrastructure-dashboard.e2e.test.ts
```

---

## Resource Estimates

| Level | RAM Total | Disk | Containers |
| ----- | --------- | ---- | ---------- |
| L0    | 128MB     | 1GB  | 1          |
| L1    | 640MB     | 5GB  | 4          |
| L2    | 1.7GB     | 15GB | 8          |
| L3    | 2.2GB     | 20GB | 10         |

---

## Dependencies & Risks

### Dependencies

- ✅ ADR-004 (Structured Logging) - già implementato
- ✅ Gateway `/metrics` endpoint - già implementato
- ✅ Docker Compose base - già funzionante

### Risks

| Risk                                | Probability | Impact | Mitigation                                |
| ----------------------------------- | ----------- | ------ | ----------------------------------------- |
| Loki RAM usage > 1GB                | Medium      | High   | Configure limits, retention 7 giorni      |
| OTEL instrumentation complessa      | Medium      | Medium | Auto-instrumentation Fastify, test solo   |
| Dashboard non mostra dati           | Low         | Medium | Test E2E valida data flow                 |
| Correlazione log-trace non funziona | Medium      | High   | Test dedicato, documentazione dettagliata |

---

## Deployment Commands

```bash
# L1 - Metrics Layer
docker compose up -d
# Services: caddy, prometheus, grafana

# L2 - Full Observability
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
# Services: [L1] + loki, promtail, tempo, otel-collector

# L3 - Infrastructure Monitoring
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
# Services: [L2] + node-exporter, cadvisor

# Verify all healthy
docker compose ps
npm run test:e2e:infra -- e2e/observability/
```

---

## Documentation Deliverables

| Document                               | Content                         |
| -------------------------------------- | ------------------------------- |
| `docs/operations/METRICS.md`           | Gateway metrics reference       |
| `docs/operations/PROMQL_QUERIES.md`    | PromQL query examples           |
| `docs/operations/LOGQL_QUERIES.md`     | LogQL query examples            |
| `docs/operations/TRACING.md`           | Distributed tracing guide       |
| `docs/operations/CORRELATION_GUIDE.md` | Log-trace correlation howto     |
| `docs/operations/GRAFANA_SETUP.md`     | Grafana provisioning reference  |
| `docs/operations/screenshots/`         | Dashboard screenshots (3 files) |
| `docs/operations/videos/`              | Demo videos (3 files, 30-90s)   |

---

## Acceptance Criteria (Epic Level)

- [ ] Tutti gli 8 user stories completati (8/8)
- [ ] Tutti i test E2E passano (8/8)
- [ ] Docker Compose profiles funzionanti (L1, L2, L3)
- [ ] Resource usage entro limiti:
  - L1: < 700MB RAM
  - L2: < 2GB RAM
  - L3: < 2.5GB RAM
- [ ] Documentazione completa (8 documenti)
- [ ] Video demo per correlation (2 video)
- [ ] README.md aggiornato con comandi deploy e verify
- [ ] ROADMAP.md Epic 2 status: ✅ COMPLETE

---

**Total Estimate**: 25h (5 giorni × 5h/giorno)  
**Sprint**: Sprint 3 (2025-12-13 → 2025-12-20)  
**Next Epic**: EPIC-003 Production Server Setup (dopo Epic 2)
