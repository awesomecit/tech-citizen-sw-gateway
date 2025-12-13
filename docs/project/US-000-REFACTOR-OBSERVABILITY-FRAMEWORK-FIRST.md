# US-000: Refactoring Observability - Framework-First Approach

**Epic**: EPIC-000 - Observability Stack Simplification  
**Type**: Refactoring  
**Priority**: P0 (blocca EPIC-002)  
**Estimate**: 7h (6 task atomici)  
**Owner**: Antonio Cittadino  
**Status**: Planning Complete  
**Created**: 2025-12-13

---

## Context & Motivation

Durante l'analisi dell'architettura del Tech Citizen Gateway, è emerso che abbiamo costruito astrazioni custom per funzionalità che **Platformatic Watt offre già nativamente**. Questo refactoring elimina il codice ridondante, sfrutta appieno il framework, e mantiene l'architettura esagonale dove ha senso.

**Principio guida**: Non scrivere codice che il framework già fa per te. Ogni riga di codice custom è una riga da mantenere, testare e debuggare.

**Riferimenti**:

- EPIC000.md - Piano completo di refactoring
- ADR-003 - Architettura esagonale (rimane valida per domain layer)
- ADR-004 - Logging strutturato (da archiviare, superato da Platformatic built-in)

---

## Problem Statement

**Codice da rimuovere** (~800 LOC):

- `packages/telemetry/` - Package OpenTelemetry custom
- `services/gateway/src/application/ports/metrics-collector.port.ts` - Interfaccia metriche
- `services/gateway/src/infrastructure/adapters/prometheus-metrics.adapter.ts` - Adapter Prometheus custom
- `services/gateway/src/infrastructure/adapters/noop-metrics.adapter.ts` - Adapter mock

**Codice da semplificare**:

- `services/gateway/src/index.ts` - Rimuovere registrazione plugin metriche custom
- `infrastructure/prometheus/prometheus.yml` - Aggiornare target porta 9090 (built-in)

**Codice da mantenere**:

- `packages/auth/` - Business logic autenticazione
- `services/gateway/src/domain/` - Business logic pura
- `infrastructure/grafana/`, `infrastructure/loki/`, `infrastructure/tempo/` - Backend observability

---

## Solution: Configuration over Code

### Nuovo Approccio

**Prima** (Over-Engineered):

```typescript
// packages/telemetry/src/index.ts (~300 LOC)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
// ... 300 righe di configurazione custom
```

**Dopo** (Framework-First):

```json
// watt.json (10 righe)
{
  "metrics": { "hostname": "0.0.0.0", "port": 9090 },
  "telemetry": {
    "serviceName": "tech-citizen-gateway",
    "exporter": { "type": "otlp", "options": { "url": "{OTEL_EXPORTER_URL}" } }
  }
}
```

### Architettura Post-Refactoring

**Zona 1: Configuration-Driven (Platformatic)**

- HTTP Server (Fastify built-in)
- Metrics `/metrics` su porta 9090
- Tracing via `@platformatic/telemetry`
- Logging via Pino built-in

**Zona 2: Hexagonal (Codice Custom)**

- Domain Layer: business logic pura
- Application Layer: Ports per Auth, Cache, Events
- Infrastructure Layer: Adapters per Keycloak, Redis, RabbitMQ

---

## Acceptance Criteria

### AC1: Metriche Prometheus Funzionanti

- [ ] `curl http://localhost:9090/metrics` restituisce metriche Prometheus
- [ ] Metriche standard presenti: `nodejs_heap_size_total_bytes`, `http_request_duration_seconds`
- [ ] Prometheus UI mostra target gateway UP
- [ ] Dashboard Grafana visualizza metriche senza errori

### AC2: Tracing OpenTelemetry Funzionante

- [ ] Traces arrivano a Tempo (o backend configurato)
- [ ] Trace context si propaga tra servizi Watt
- [ ] Traces visibili in Grafana Explore

### AC3: Logging Strutturato Funzionante

- [ ] Log in formato JSON quando `pino-pretty` rimosso (produzione)
- [ ] Promtail raccoglie log da stdout container
- [ ] Log queryabili in Grafana via Loki

### AC4: Test Suite Passing

- [ ] Tutti i test esistenti passano (unit + integration + e2e)
- [ ] Test che verificavano adapter custom rimossi
- [ ] Coverage non diminuita su codice rimanente (>= 75%)

### AC5: Documentazione Aggiornata

- [ ] README.md riflette approccio framework-first
- [ ] VISION.md aggiornato con nuova architettura
- [ ] ADR-004 archiviato con nota "Superato da Platformatic built-in"
- [ ] Nessun riferimento a codice rimosso in docs

### AC6: Codice Pulito

- [ ] Nessun import a `packages/telemetry/` nel codebase
- [ ] Nessun import a `metrics-collector.port.ts`
- [ ] ESLint clean (nessun errore, nessun warning)
- [ ] TypeScript compila senza errori

---

## Task Breakdown

### Task 1: Inventario e Preparazione (30min)

**Obiettivo**: Inventario completo del codice da rimuovere e validazione prerequisiti

**Azioni**:

1. Verificare esistenza file da rimuovere:
   - `packages/telemetry/`
   - `services/gateway/src/application/ports/metrics-collector.port.ts`
   - `services/gateway/src/infrastructure/adapters/prometheus-metrics.adapter.ts`
   - `services/gateway/src/infrastructure/adapters/noop-metrics.adapter.ts`
2. Inventario metriche custom attualmente esposte:
   - `curl http://localhost:3042/metrics` (endpoint attuale)
   - Elencare metriche business-specific (se presenti)
3. Validare versione Platformatic:
   - Confermare 3.27.0 in `package-lock.json`
   - Verificare supporto `metrics` e `telemetry` in docs ufficiali

**Deliverable**: File `REFACTOR_INVENTORY.md` con:

- Lista file da rimuovere (path completi)
- Lista metriche custom da preservare (se presenti)
- Conferma versione Platformatic

**Test**: Manuale - Documento completo e validato

**Commit**: `docs(refactor): add inventory for EPIC-000 observability simplification`

**Acceptance Criteria**:

- [x] File da rimuovere identificati e confermati
- [ ] Metriche custom documentate (se presenti)
- [ ] Versione Platformatic validata (>= 3.27.0)

---

### Task 2: Abilitare Metriche e Telemetry Built-in (1h)

**Obiettivo**: Configurare `watt.json` per abilitare metriche Prometheus e tracing OTLP nativi

**Azioni**:

1. Aggiornare `watt.json` root:
   ```json
   {
     "metrics": {
       "hostname": "0.0.0.0",
       "port": 9090
     },
     "telemetry": {
       "serviceName": "tech-citizen-gateway",
       "version": "{npm_package_version}",
       "exporter": {
         "type": "otlp",
         "options": {
           "url": "{OTEL_EXPORTER_URL}"
         }
       }
     }
   }
   ```
2. Aggiornare `.env.example`:
   ```bash
   # Observability - Platformatic Built-in
   OTEL_EXPORTER_URL=http://tempo:4318/v1/traces
   OTEL_ENABLED=true
   ```
3. Creare `.env` locale per test:
   ```bash
   cp .env.example .env
   # Impostare OTEL_ENABLED=false per sviluppo locale
   ```
4. Testare metriche built-in:
   ```bash
   npm run dev
   curl http://localhost:9090/metrics | head -n 20
   ```

**Deliverable**:

- `watt.json` aggiornato con `metrics` e `telemetry`
- `.env.example` con variabili OTEL
- Screenshot/output di `curl http://localhost:9090/metrics`

**Test E2E**:

```bash
# e2e/refactor/metrics-builtin.e2e.test.ts
test('Built-in metrics endpoint responds on port 9090', async t => {
  const response = await fetch('http://localhost:9090/metrics');
  t.equal(response.status, 200, 'Metrics endpoint accessible');
  const text = await response.text();
  t.ok(text.includes('nodejs_heap_size_total_bytes'), 'Contains Node.js metrics');
  t.ok(text.includes('http_request_duration_seconds'), 'Contains HTTP metrics');
});
```

**Commit**: `feat(observability): enable Platformatic built-in metrics and telemetry`

**Acceptance Criteria**:

- [ ] `watt.json` contiene sezioni `metrics` e `telemetry`
- [ ] Endpoint `http://localhost:9090/metrics` risponde con metriche Prometheus
- [ ] Metriche standard Node.js presenti (heap, event loop)
- [ ] E2E test valida endpoint built-in

---

### Task 3: Aggiornare Infrastruttura Prometheus (30min)

**Obiettivo**: Aggiornare `prometheus.yml` per scrappare nuovo endpoint built-in

**Azioni**:

1. Aggiornare `infrastructure/prometheus/prometheus.yml`:
   ```yaml
   scrape_configs:
     - job_name: 'api-gateway'
       scrape_interval: 10s
       static_configs:
         - targets: ['gateway:9090'] # Porta cambiata da 3042 a 9090
       metrics_path: '/metrics'
   ```
2. Riavviare stack infrastruttura:
   ```bash
   docker compose restart prometheus
   ```
3. Verificare target in Prometheus UI:
   - Aprire `http://localhost:9091/targets`
   - Verificare che `api-gateway` sia UP
4. Verificare metriche in Grafana:
   - Aprire dashboard gateway-health
   - Verificare che i panel visualizzano dati

**Deliverable**:

- `prometheus.yml` aggiornato con porta 9090
- Screenshot Prometheus UI con target UP
- Screenshot Grafana dashboard funzionante

**Test E2E**:

```bash
# e2e/refactor/prometheus-scrape.e2e.test.ts
test('Prometheus scrapes built-in metrics endpoint', async t => {
  // Wait for scrape
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Query Prometheus
  const response = await fetch('http://localhost:9091/api/v1/query?query=up{job="api-gateway"}');
  const json = await response.json();
  t.equal(json.data.result[0].value[1], '1', 'Target is UP');
});
```

**Commit**: `chore(infra): update Prometheus to scrape built-in metrics endpoint`

**Acceptance Criteria**:

- [ ] `prometheus.yml` punta a `gateway:9090`
- [ ] Prometheus UI mostra target `api-gateway` UP
- [ ] Grafana dashboard visualizza metriche senza errori
- [ ] E2E test valida scraping Prometheus

---

### Task 4: Rimuovere Codice Ridondante (2h)

**Obiettivo**: Rimuovere package telemetry custom, ports e adapters metriche

**Azioni**:

1. Rimuovere `packages/telemetry/`:
   ```bash
   rm -rf packages/telemetry/
   ```
2. Rimuovere ports e adapters metriche:
   ```bash
   rm services/gateway/src/application/ports/metrics-collector.port.ts
   rm services/gateway/src/infrastructure/adapters/prometheus-metrics.adapter.ts
   rm services/gateway/src/infrastructure/adapters/noop-metrics.adapter.ts
   ```
3. Aggiornare `services/gateway/src/index.ts`:
   - Rimuovere import a `metrics-collector.port.ts`
   - Rimuovere registrazione plugin metriche custom
   - Mantenere solo business logic (auth, routes)
4. Aggiornare `package.json` root:
   - Rimuovere referenze a `@tech-citizen/telemetry`
5. Aggiornare `tsconfig.json` (se presente `paths` per telemetry)
6. Eseguire verifica compilazione:
   ```bash
   npm run build
   npx tsc --noEmit
   ```
7. Eseguire verifica lint:
   ```bash
   npm run lint:check
   ```

**Deliverable**:

- Codice rimosso (800 LOC)
- `services/gateway/src/index.ts` semplificato
- Build e lint clean

**Test**:

```bash
# Verificare che tutti i test passino senza codice custom
npm run test
npm run test:integration
```

**Commit**: `refactor(observability): remove custom telemetry package and metrics adapters`

**Acceptance Criteria**:

- [ ] `packages/telemetry/` rimosso
- [ ] Ports e adapters metriche rimossi
- [ ] `services/gateway/src/index.ts` non contiene import metriche custom
- [ ] Build TypeScript compila senza errori
- [ ] ESLint clean (nessun import a file rimossi)
- [ ] Tutti i test passano

---

### Task 5: Aggiornare e Validare Test Suite (2h)

**Obiettivo**: Rimuovere test per adapter custom, aggiungere test per funzionalità built-in

**Azioni**:

1. Identificare test da rimuovere:
   ```bash
   grep -r "metrics-collector.port" test/
   grep -r "prometheus-metrics.adapter" test/
   grep -r "packages/telemetry" test/
   ```
2. Rimuovere test unitari per adapter custom:
   - `test/unit/adapters/prometheus-metrics.adapter.test.ts`
   - `test/unit/ports/metrics-collector.port.test.ts`
   - `packages/telemetry/test/**`
3. Creare test E2E per built-in:
   - `e2e/refactor/metrics-builtin.e2e.test.ts` (creato in Task 2)
   - `e2e/refactor/prometheus-scrape.e2e.test.ts` (creato in Task 3)
4. Aggiornare test di integrazione (se necessario):
   - Sostituire mock di `MetricsCollectorPort` con noop (metriche sono sempre abilitate)
5. Eseguire full test suite:
   ```bash
   npm run test
   npm run test:integration:infra
   npm run test:e2e:infra
   ```
6. Generare coverage report:
   ```bash
   npm run test:cov
   # Verificare coverage >= 75% su codice rimanente
   ```

**Deliverable**:

- Test per adapter custom rimossi
- Test E2E per built-in aggiunti
- Coverage report >= 75%
- Tutti i test passano

**Test**: Full test suite green

**Commit**: `test(observability): update test suite for built-in metrics and telemetry`

**Acceptance Criteria**:

- [ ] Test per adapter custom rimossi
- [ ] E2E test per built-in metriche aggiunti e passano
- [ ] E2E test per Prometheus scraping aggiunti e passano
- [ ] Coverage >= 75% su codice rimanente
- [ ] `npm test` completa con 0 errori

---

### Task 6: Aggiornare Documentazione (1h)

**Obiettivo**: Aggiornare README, VISION, ADRs per riflettere approccio framework-first

**Azioni**:

1. Aggiornare `README.md`:
   - Sezione "Observability Stack": spiegare approccio configuration-driven
   - Aggiungere esempio configurazione `watt.json`
   - Rimuovere riferimenti a `packages/telemetry/`
2. Aggiornare `VISION.md`:
   - Sezione "Observability Stack": allineare con framework-first
   - Aggiungere principio "Configuration over Code"
3. Archiviare `docs/architecture/decisions/ADR-004-structured-logging-loki-readiness.md`:
   - Aggiungere nota in testa:
     ```markdown
     **Status**: Superato  
     **Reason**: Platformatic fornisce logging strutturato built-in con Pino. Vedere EPIC000.md per dettagli.  
     **Replacement**: Configurazione `server.logger` in watt.json
     ```
4. Creare `docs/architecture/decisions/ADR-007-observability-framework-first.md`:
   - Documentare decisione di usare Platformatic built-in vs custom
   - Motivazioni: YAGNI, KISS, DRY, manutenibilità
   - Trade-off: flessibilità teorica vs pragmatismo
5. Aggiornare `.github/copilot-instructions.md`:
   - Sezione "Observability": documentare approccio framework-first
   - Esempio configurazione `watt.json`
6. Verificare nessun riferimento a codice rimosso:
   ```bash
   grep -r "packages/telemetry" docs/
   grep -r "metrics-collector.port" docs/
   grep -r "prometheus-metrics.adapter" docs/
   ```

**Deliverable**:

- README.md aggiornato
- VISION.md aggiornato
- ADR-004 archiviato
- ADR-007 creato
- Nessun riferimento a codice rimosso in docs

**Test**: Manuale - Documentazione completa e coerente

**Commit**: `docs(observability): update docs for framework-first approach and archive ADR-004`

**Acceptance Criteria**:

- [ ] README.md spiega approccio configuration-driven
- [ ] VISION.md allineato con framework-first
- [ ] ADR-004 archiviato con nota "Superato"
- [ ] ADR-007 creato con decisione framework-first
- [ ] `grep` non trova riferimenti a codice rimosso

---

## Testing Strategy

### Unit Tests

- **Rimossi**: Test per `MetricsCollectorPort`, `PrometheusAdapter`, `packages/telemetry`
- **Mantenuti**: Test per domain layer (business logic pura)

### Integration Tests

- **Aggiornati**: Mock di `MetricsCollectorPort` sostituiti con noop (metriche sempre abilitate)
- **Focus**: Auth, cache, events (business logic)

### E2E Tests

- **Nuovi**:
  - `e2e/refactor/metrics-builtin.e2e.test.ts` - Valida endpoint built-in porta 9090
  - `e2e/refactor/prometheus-scrape.e2e.test.ts` - Valida Prometheus scrape funzionante
  - `e2e/refactor/grafana-dashboard.e2e.test.ts` - Valida dashboard visualizza metriche
- **Esistenti**: Devono continuare a passare senza modifiche (health, routing, auth)

### BDD Scenarios (opzionale)

```gherkin
Feature: Built-in Observability Stack

  Scenario: Gateway exposes built-in metrics
    Given the gateway is running
    When I request GET http://localhost:9090/metrics
    Then the response status should be 200
    And the response should contain "nodejs_heap_size_total_bytes"
    And the response should contain "http_request_duration_seconds"

  Scenario: Prometheus scrapes built-in metrics
    Given the gateway is running
    And Prometheus is configured to scrape gateway:9090
    When I wait 15 seconds for scrape
    And I query Prometheus for "up{job='api-gateway'}"
    Then the result should be 1 (UP)
```

---

## Resource Estimates

| Task                      | Estimate | Risk   | Dependencies |
| ------------------------- | -------- | ------ | ------------ |
| Task 1: Inventario        | 30min    | LOW    | None         |
| Task 2: Config watt.json  | 1h       | LOW    | Task 1       |
| Task 3: Update Prometheus | 30min    | LOW    | Task 2       |
| Task 4: Rimuovi codice    | 2h       | MEDIUM | Task 3       |
| Task 5: Aggiorna test     | 2h       | MEDIUM | Task 4       |
| Task 6: Aggiorna docs     | 1h       | LOW    | Task 5       |
| **TOTAL**                 | **7h**   |        |              |

**Buffer**: 1h per imprevisti (totale 8h)

---

## Success Metrics

### Quantitative

- **LOC rimossi**: ~800 righe (packages/telemetry + ports + adapters)
- **Test rimossi**: ~200 righe (unit test adapter custom)
- **Test aggiunti**: ~100 righe (E2E built-in validation)
- **Build time**: invariato o migliorato (meno codice da compilare)
- **Coverage**: >= 75% su codice rimanente

### Qualitative

- Metriche Prometheus funzionanti (target UP in Prometheus UI)
- Dashboard Grafana visualizza dati senza errori
- Traces arrivano a Tempo (se configurato)
- Log strutturati queryabili in Loki
- Documentazione aggiornata e coerente
- Team comprende principio "Configuration over Code"

---

## Rollback Plan

Se il refactoring introduce regressioni critiche:

1. **Fase 1-3** (Config watt.json, Prometheus):
   - Rollback: Ripristinare endpoint custom porta 3042 in parallelo
   - Tempo: 30min

2. **Fase 4** (Rimozione codice):
   - Rollback: `git revert` commit rimozione
   - Re-installare `packages/telemetry/` da backup
   - Tempo: 1h

3. **Fase 5-6** (Test, docs):
   - Rollback: `git revert` commit documentazione
   - Tempo: 30min

**Trigger rollback**:

- Metriche non arrivano a Prometheus dopo 1h troubleshooting
- Test suite non passa dopo 2h troubleshooting
- Regressione critica in produzione (metriche perse)

---

## Risks & Mitigations

### Risk 1: Perdita Metriche Custom

- **Probabilità**: MEDIUM
- **Impatto**: HIGH
- **Mitigazione**: Task 1 inventario metriche attuali, preservare metriche business-specific se presenti
- **Fallback**: Aggiungere metriche custom con `prom-client` puntualmente

### Risk 2: Incompatibilità Versione Platformatic

- **Probabilità**: LOW
- **Impatto**: HIGH
- **Mitigazione**: Task 1 valida versione 3.27.0 supporta `metrics` e `telemetry`
- **Fallback**: Upgrade Platformatic se necessario

### Risk 3: Regressione Test Suite

- **Probabilità**: MEDIUM
- **Impatto**: MEDIUM
- **Mitigazione**: Task 4-5 incrementali, verifica test dopo ogni rimozione
- **Fallback**: Rollback commit specifico che introduce regressione

### Risk 4: Resistenza al Cambiamento

- **Probabilità**: LOW (solo io lavoro al progetto)
- **Impatto**: LOW
- **Mitigazione**: Documentare chiaramente benefici in ADR-007
- **Fallback**: N/A

---

## Dependencies & Blockers

### Prerequisites

- [x] Gateway funzionante con metriche attuali (US-001 a US-005 completati)
- [x] Prometheus configurato e funzionante
- [x] Test suite esistente passa
- [ ] Tempo backend disponibile (opzionale per tracing)

### Blocks

- **EPIC-002**: Blocca US-008 (Prometheus scraping) fino a completamento US-000
- **EPIC-002**: Blocca US-009 (Grafana datasource) fino a completamento US-000

### Enables

- **EPIC-002**: Dopo US-000, EPIC-002 può procedere con L1 Metrics (US-008+)
- **Future Work**: Approccio framework-first applicabile ad altri aspetti (auth, cache)

---

## References

### Internal

- EPIC000.md - Piano completo refactoring
- ADR-003 - Architettura esagonale
- ADR-004 - Logging strutturato (da archiviare)
- US-007 - L0 Gateway Standalone (prerequisito)

### External

- [Platformatic Runtime Configuration](https://docs.platformatic.dev/docs/reference/runtime/configuration)
- [Platformatic Metrics](https://docs.platformatic.dev/docs/guides/add-custom-functionality/monitoring)
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
- [Pino Documentation](https://getpino.io/)

---

## Appendix A: Configurazione Completa watt.json

```json
{
  "$schema": "https://schemas.platformatic.dev/@platformatic/runtime/3.0.0.json",
  "entrypoint": "gateway",
  "autoload": {
    "path": "services",
    "exclude": []
  },
  "server": {
    "hostname": "{PLT_SERVER_HOSTNAME}",
    "port": "{PORT}",
    "logger": {
      "level": "{LOG_LEVEL}"
    }
  },
  "metrics": {
    "hostname": "0.0.0.0",
    "port": 9090
  },
  "telemetry": {
    "serviceName": "tech-citizen-gateway",
    "version": "{npm_package_version}",
    "exporter": {
      "type": "otlp",
      "options": {
        "url": "{OTEL_EXPORTER_URL}"
      }
    }
  },
  "watch": true
}
```

---

## Appendix B: File da Rimuovere (Inventario Completo)

```bash
# Package telemetry custom
packages/telemetry/

# Ports metriche
services/gateway/src/application/ports/metrics-collector.port.ts

# Adapters metriche
services/gateway/src/infrastructure/adapters/prometheus-metrics.adapter.ts
services/gateway/src/infrastructure/adapters/noop-metrics.adapter.ts

# Test adapter custom
test/unit/adapters/prometheus-metrics.adapter.test.ts
test/unit/ports/metrics-collector.port.test.ts
packages/telemetry/test/
```

**Totale stimato**: ~800 LOC

---

## Appendix C: Metriche Standard Platformatic

Dopo il refactoring, l'endpoint `/metrics` su porta 9090 esporrà automaticamente:

**Node.js Metrics**:

- `nodejs_heap_size_total_bytes` - Heap total
- `nodejs_heap_size_used_bytes` - Heap used
- `nodejs_external_memory_bytes` - External memory
- `nodejs_eventloop_lag_seconds` - Event loop lag
- `nodejs_gc_duration_seconds` - Garbage collection duration

**HTTP Metrics**:

- `http_request_duration_seconds` - Request latency histogram
- `http_request_summary_seconds` - Request summary (P50/P95/P99)
- `http_requests_total` - Total requests counter

**Custom Metrics** (se necessario):
Aggiungere puntualmente con `prom-client` in `services/gateway/src/index.ts`:

```typescript
import { register, Counter } from 'prom-client';

const businessMetric = new Counter({
  name: 'business_operations_total',
  help: 'Total business operations',
  labelNames: ['type', 'status'],
});
```

---

**End of Document**
