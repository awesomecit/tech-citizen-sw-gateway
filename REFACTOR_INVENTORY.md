# EPIC-000 Task 1: Inventario Codice da Rimuovere

**Data**: 2025-12-13  
**Owner**: Antonio Cittadino  
**Status**: COMPLETATO  
**Durata**: 20 minuti

---

## Obiettivo

Inventario completo del codice da rimuovere e validazione prerequisiti per refactoring EPIC-000.

---

## File da Rimuovere

### 1. Package Telemetry Custom

**Path**: `packages/telemetry/`  
**Status**: Directory vuota (già rimossa o mai implementata)  
**LOC**: 0 righe

**Note**: La directory esiste ma è vuota. Può essere rimossa senza impatto.

---

### 2. Ports per Metriche

**Path**: `services/gateway/src/application/ports/metrics-collector.port.ts`  
**LOC**: 32 righe  
**Descrizione**: Interfaccia TypeScript per adapter metriche

**Interfaccia**:

```typescript
export interface MetricsCollectorPort {
  register(app: FastifyInstance): Promise<void>;
  recordRequest(
    context: GatewayContextEntity,
    statusCode: number,
    duration: number,
  ): void;
  isEnabled(): boolean;
  getCollectorName(): string;
}
```

**Usato in**:

- `services/gateway/src/index.ts` - Import del tipo per dependency injection

---

### 3. Adapter Prometheus Custom

**Path**: `services/gateway/src/infrastructure/adapters/prometheus-metrics.adapter.ts`  
**LOC**: 76 righe  
**Descrizione**: Implementazione Prometheus con prom-client

**Metriche Custom Esposte**:

1. `gateway_*` - Default Node.js metrics (heap, event loop, etc.)
2. `http_request_duration_ms` - Histogram con buckets [10, 50, 100, 300, 500, 1000, 3000, 5000]
   - Labels: method, route, status
3. `http_requests_total` - Counter totale richieste
   - Labels: method, route, status

**Endpoint esposto**: `/metrics` (registrato in Fastify)

**Note**: Queste metriche sono **equivalenti** a quelle che Platformatic fornisce built-in. Non ci sono metriche business-specific custom da preservare.

---

### 4. Adapter Noop (Mock per Test)

**Path**: `services/gateway/src/infrastructure/adapters/noop-metrics.adapter.ts`  
**LOC**: 30 righe  
**Descrizione**: Implementazione vuota per disabilitare metriche (feature flag)

**Note**: Usato quando `config.features.metrics = false`. Con Platformatic built-in, si può disabilitare via env variable `OTEL_ENABLED=false`.

---

### 5. Registrazione in Gateway Entry Point

**Path**: `services/gateway/src/index.ts`  
**LOC da rimuovere**: ~20 righe (import + factory function + registrazione)

**Codice da rimuovere**:

```typescript
// Import (righe 8-9)
import { PrometheusMetricsAdapter } from './infrastructure/adapters/prometheus-metrics.adapter.js';
import { NoopMetricsAdapter } from './infrastructure/adapters/noop-metrics.adapter.js';

// Factory function (righe 43-53)
function createMetricsAdapter(config: GatewayConfig) {
  if (config.features.metrics.enabled) {
    app.log.info('🔧 Metrics enabled: Prometheus');
    return new PrometheusMetricsAdapter();
  }

  return new NoopMetricsAdapter();
}

// Utilizzo (righe 68, 83, 91)
const metricsAdapter = createMetricsAdapter(config);
// ... metricsCollector: metricsAdapter.getCollectorName()
// ... metricsCollector: metricsAdapter
```

---

## Configurazione Infrastruttura Attuale

### Prometheus Scrape Config

**Path**: `infrastructure/prometheus/prometheus.yml`  
**Target attuale**: `gateway:3042/metrics` (porta custom)  
**Target futuro**: `gateway:9090/metrics` (porta built-in Platformatic)

**Cambiamento richiesto** (Task 3):

```yaml
# Prima
- targets: ['gateway:3042']

# Dopo
- targets: ['gateway:9090']
```

---

## Totale LOC da Rimuovere

| File                                       | LOC                 |
| ------------------------------------------ | ------------------- |
| `packages/telemetry/`                      | 0 (directory vuota) |
| `metrics-collector.port.ts`                | 32                  |
| `prometheus-metrics.adapter.ts`            | 76                  |
| `noop-metrics.adapter.ts`                  | 30                  |
| `services/gateway/src/index.ts` (parziale) | ~20                 |
| **TOTALE**                                 | **~158 LOC**        |

**Note**: La stima iniziale di 800 LOC includeva il package `telemetry/` completo che nella realtà non è stato mai implementato. Il refactoring rimuoverà comunque codice ridondante significativo.

---

## Metriche Custom Business-Specific

**Risultato**: ❌ NESSUNA metrica business-specific trovata

Tutte le metriche attuali sono standard HTTP/Node.js:

- `http_request_duration_ms` → Equivalente a `http_request_duration_seconds` Platformatic built-in
- `http_requests_total` → Equivalente a `http_requests_total` Platformatic built-in
- Default Node.js metrics → Fornite da `collectDefaultMetrics()` di prom-client, equivalenti a Platformatic

**Conclusione**: Possiamo rimuovere tutto il codice custom senza perdita di funzionalità.

---

## Validazione Prerequisiti

### Versione Platformatic

**Path**: `package-lock.json`  
**Versione installata**: `@platformatic/watt@3.27.0`

**Verifica supporto funzionalità**:

- ✅ `metrics`: Supportato da Platformatic Runtime 3.x
- ✅ `telemetry`: Supportato da Platformatic Runtime 3.x (OpenTelemetry built-in)
- ✅ `server.logger`: Pino built-in configurabile

**Riferimenti**:

- [Platformatic Metrics Guide](https://docs.platformatic.dev/docs/guides/add-custom-functionality/monitoring)
- [Platformatic Runtime Config](https://docs.platformatic.dev/docs/reference/runtime/configuration)

**Conclusione**: ✅ Versione 3.27.0 supporta tutte le funzionalità necessarie per il refactoring.

---

## Test Impattati

### Test da Rimuovere

**Stima**:

- `test/unit/adapters/prometheus-metrics.adapter.test.ts` (se esiste)
- `test/unit/ports/metrics-collector.port.test.ts` (se esiste)
- `packages/telemetry/test/**` (directory vuota, nessun test)

**Verifica richiesta** (Task 5):

```bash
find test/ -name "*metrics*" -o -name "*prometheus*" -o -name "*telemetry*"
```

### Test da Aggiungere

**E2E per built-in** (Task 2-3):

- `e2e/refactor/metrics-builtin.e2e.test.ts` - Valida endpoint `/metrics` porta 9090
- `e2e/refactor/prometheus-scrape.e2e.test.ts` - Valida Prometheus scrape funzionante

---

## Rischi Identificati

### Risk 1: Perdita Metriche Custom

**Probabilità**: ❌ NESSUNA (nessuna metrica business-specific trovata)  
**Impatto**: LOW  
**Mitigazione**: Non necessaria

### Risk 2: Prometheus Scraping Non Funzionante

**Probabilità**: MEDIUM (cambio porta richiede riavvio Prometheus)  
**Impatto**: HIGH (monitoring down)  
**Mitigazione**:

- Testare endpoint built-in prima di rimuovere codice custom (Task 2)
- Aggiornare `prometheus.yml` prima di rimozione adapter (Task 3)
- Mantenere rollback plan (restore commit precedente)

### Risk 3: Test Suite Rotta

**Probabilità**: MEDIUM (rimozione interface potrebbe rompere mock)  
**Impatto**: MEDIUM (blocca deploy)  
**Mitigazione**:

- Eseguire test dopo ogni rimozione (Task 4)
- Aggiornare mock prima di rimuovere interface (Task 5)

---

## Next Steps

**Task 2** (1h): Abilitare metrics/telemetry built-in in `watt.json`

- Aggiungere sezione `metrics: { hostname: "0.0.0.0", port: 9090 }`
- Aggiungere sezione `telemetry` con OTLP exporter
- Testare endpoint `http://localhost:9090/metrics`

**Blockers**: ❌ NESSUNO - possiamo procedere con Task 2

---

## Conclusioni

✅ **Inventario completato con successo**

**Summary**:

- 158 LOC da rimuovere (non 800, package telemetry mai implementato)
- Nessuna metrica business-specific da preservare
- Platformatic 3.27.0 supporta tutte le funzionalità necessarie
- Prometheus scrape config richiede update porta 3042 → 9090
- Nessun blocker per procedere con Task 2

**Decisione**: ✅ Procediamo con refactoring framework-first approach

---

**Fine Inventario**
