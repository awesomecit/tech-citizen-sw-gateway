# ADR-004: Structured Logging with Loki Readiness

**Status**: Accepted  
**Date**: 2025-12-12  
**Decision Makers**: Antonio Cittadino  
**Tags**: observability, logging, loki, grafana, correlation

---

## Context

Il gateway attualmente logga su stdout/stderr con Fastify logger (Pino), ma manca:

1. **Centralizzazione**: Logs solo su Docker stdout, non aggregati
2. **Query**: Impossibile cercare logs per correlation ID, user, status code
3. **Retention**: Logs persi quando container viene ricreato
4. **Correlazione**: Logs e metrics (Prometheus) in sistemi separati

**Infrastruttura Esistente**:

- ✅ Prometheus (metrics, porta 19090)
- ✅ Grafana (visualization, porta 3000)
- ❌ Loki (log aggregation) - **NON IMPLEMENTATO**

**Problema Attuale**:

```
Gateway → Fastify Logger (Pino) → stdout/stderr → Docker logs → ❌ Volatili
```

**Obiettivo**:

```
Gateway → Fastify Logger (JSON structured) → Promtail → Loki → Grafana
                                                         ↓
                                                   Prometheus (metrics)
                                                         ↓
                                                   Grafana (correlazione)
```

---

## Decision

**Fase 1 (Ora)**: Strutturare logs per export futuro a Loki  
**Fase 2 (Production)**: Implementare Loki stack completo (Epic 2)

### Fase 1: Structured Logging (Implementato)

#### 1.1 Configurazione Pino Logger

**Root `watt.json`**:

```json
{
  "server": {
    "logger": {
      "level": "{LOG_LEVEL}"
    }
  }
}
```

**Gateway `services/gateway/watt.json`**:

```json
{
  "server": {
    "logger": {
      "level": "{LOG_LEVEL}",
      "transport": {
        "target": "pino-pretty",
        "options": {
          "translateTime": "HH:MM:ss Z",
          "ignore": "pid,hostname",
          "colorize": true
        }
      }
    }
  }
}
```

**Rationale**:

- `pino-pretty`: Development readability (human-readable output)
- Production: Remove transport → Native JSON output per Loki
- `{LOG_LEVEL}`: Environment-specific (debug/info/warn/error)

#### 1.2 Structured Log Fields

**Standard Fields** (ogni log):

```typescript
{
  requestId: string;      // UUID v4 correlation ID
  method: string;         // HTTP method (GET, POST, etc.)
  url: string;           // Request URL
  statusCode: number;    // HTTP status code
  duration: number;      // Response time (ms)
  userId?: string;       // User ID (if authenticated)
}
```

**Implementazione** (`compose-gateway.use-case.ts`):

```typescript
app.addHook('onResponse', async (request, reply) => {
  const duration = context.getElapsedTime();

  request.log.info(
    {
      requestId: context.requestId,
      method: context.method,
      url: context.url,
      statusCode: reply.statusCode,
      duration,
      userId: request.user?.sub,
    },
    'HTTP request completed',
  );
});
```

**Benefici**:

- Logs queryabili per correlation ID (troubleshooting distribuito)
- User tracking (audit trail)
- Performance monitoring (duration)
- Standardizzazione per future export

#### 1.3 Correlation ID Propagation

**Flow**:

1. `onRequest` hook: Generate UUID v4 → `X-Request-ID` header
2. Child logger: `request.log.child({ requestId })`
3. All logs in request context include `requestId`
4. Downstream services: Propagate `X-Request-ID` header

**Esempio**:

```json
{
  "level": 30,
  "time": 1702342123456,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "url": "/api/protected",
  "statusCode": 200,
  "duration": 45,
  "userId": "user-123",
  "msg": "HTTP request completed"
}
```

---

### Fase 2: Loki Stack Implementation (Future - Epic 2)

**Non implementato ora** (YAGNI: non abbiamo production deployment).

#### 2.1 Infrastructure Components

**Loki** (Log Aggregation System):

```yaml
# infrastructure/loki/loki-config.yml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h # 7 days

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: true
  retention_period: 168h # 7 days
```

**Promtail** (Log Shipper):

```yaml
# infrastructure/promtail/promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: gateway
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'
    pipeline_stages:
      - json:
          expressions:
            level: level
            requestId: requestId
            method: method
            url: url
            statusCode: statusCode
            duration: duration
            userId: userId
      - labels:
          level:
          requestId:
          method:
          statusCode:
```

**Docker Compose** (add to `docker-compose.yml`):

```yaml
services:
  loki:
    image: grafana/loki:2.9.3
    restart: unless-stopped
    ports:
      - '3100:3100'
    volumes:
      - ./infrastructure/loki/loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - gateway-network
    healthcheck:
      test: ['CMD', 'wget', '--spider', '-q', 'http://localhost:3100/ready']
      interval: 10s
      timeout: 5s
      retries: 3

  promtail:
    image: grafana/promtail:2.9.3
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./infrastructure/promtail/promtail-config.yml:/etc/promtail/config.yml:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - gateway-network
    depends_on:
      - loki

volumes:
  loki-data:
    driver: local
```

**Grafana Datasource** (`infrastructure/grafana/provisioning/datasources/loki.yml`):

```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: false
    version: 1
    editable: true
    jsonData:
      derivedFields:
        - datasourceName: Prometheus
          matcherRegex: "requestId=(\\w+)"
          name: Metrics
          url: '$${__value.raw}'
```

#### 2.2 Query Examples (LogQL)

**Find all errors**:

```logql
{container="gateway"} | json | level="error"
```

**Trace request by correlation ID**:

```logql
{container="gateway"} | json | requestId="550e8400-e29b-41d4-a716-446655440000"
```

**Slow requests (>500ms)**:

```logql
{container="gateway"} | json | duration > 500
```

**User activity audit**:

```logql
{container="gateway"} | json | userId="user-123" | line_format "{{.method}} {{.url}} {{.statusCode}}"
```

**Error rate by endpoint**:

```logql
sum by (url) (rate({container="gateway"} | json | statusCode >= 500 [5m]))
```

#### 2.3 Grafana Dashboard (Logs + Metrics)

**Panel 1: Request Rate (Prometheus)**:

```promql
rate(http_request_duration_ms_count[5m])
```

**Panel 2: Error Logs (Loki)**:

```logql
{container="gateway"} | json | level="error"
```

**Panel 3: Correlation (Click → Logs)**:

- Click metric → Filter logs by `requestId`
- Grafana links Prometheus trace → Loki logs

---

## Consequences

### ✅ Positive (Fase 1 - Implemented)

1. **Loki-Ready Logs**
   - JSON structured output già compatibile con Promtail
   - Standard fields (requestId, userId, duration)
   - Zero refactoring quando aggiungeremo Loki

2. **Development Experience**
   - `pino-pretty`: Human-readable colorized logs
   - Correlation ID visibile in ogni log
   - Debug facilitato con structured fields

3. **Production Transition**
   - Rimuovere `transport` da `watt.json` → Native JSON
   - Deploy Loki stack → Logs automaticamente aggregati
   - No code changes needed

4. **Audit Trail**
   - User ID logged (GDPR compliance ready)
   - Request tracing con correlation ID
   - Performance tracking (duration)

### ✅ Positive (Fase 2 - Future)

1. **Centralized Observability**
   - Logs + Metrics in single Grafana dashboard
   - Query logs per user, endpoint, status code
   - Troubleshooting: Click metric → See logs

2. **Retention & Compliance**
   - Logs persistiti 7 giorni (configurabile)
   - Backup volume Loki
   - Audit trail completo

3. **Performance Analysis**
   - Correlate slow requests (logs) with high CPU (metrics)
   - P95/P99 latency analysis
   - Error rate by endpoint

### ⚠️ Negative

1. **Development Overhead** (Fase 1 - Minimal)
   - Dependency: `pino-pretty` (dev only)
   - Structured log slightly more verbose
   - Mitigazione: Template VSCode snippets

2. **Infrastructure Complexity** (Fase 2 - When Needed)
   - 2 new services (Loki + Promtail)
   - Disk space for log retention (~1GB/day production)
   - Docker socket access for Promtail (security consideration)
   - Mitigazione: Deploy solo in staging/production, skip dev

3. **Query Learning Curve** (Fase 2)
   - LogQL syntax diversa da SQL
   - Grafana dashboards da creare
   - Mitigazione: Template dashboards in `infrastructure/grafana/dashboards/`

---

## Alternatives Considered

### ❌ Option A: ELK Stack (Elasticsearch + Logstash + Kibana)

**Pro**: Industry standard, mature ecosystem  
**Contro**:

- Memory-hungry (Elasticsearch richiede 2GB+ heap)
- Over-engineering per 244 test e development stack
- Costo infrastrutturale alto
- Rejected: YAGNI

### ❌ Option B: CloudWatch Logs (AWS)

**Pro**: Managed service, zero infrastructure  
**Contro**:

- Vendor lock-in
- Non abbiamo deployment AWS
- Costo variabile
- Rejected: Multi-cloud strategy

### ❌ Option C: File Logs + Grep

**Pro**: Zero dependencies  
**Contro**:

- No retention (container restart = log loss)
- No query (grep su JSON inefficiente)
- No correlation con metrics
- Rejected: Non production-ready

### ✅ Option D: Structured Logging Now + Loki Later (CHOSEN)

**Pro**:

- YAGNI compliance (no production deployment yet)
- Loki-ready structured logs
- Low development overhead (30min)
- Smooth transition when needed

**Rationale**: Preparazione senza over-engineering.

---

## Implementation Checklist

### ✅ Fase 1 (Completed - 2025-12-12)

- [x] Root `watt.json`: Add logger config with `{LOG_LEVEL}`
- [x] Gateway `watt.json`: Add pino-pretty transport for dev
- [x] `compose-gateway.use-case.ts`: Add structured log in onResponse hook
- [x] `.env.example`: Include `LOG_LEVEL=info`
- [x] Install `pino-pretty` (devDependencies)
- [x] Test: Verify JSON fields in stdout
- [x] ADR-004: Document logging strategy

### ⏳ Fase 2 (Future - Epic 2: Observability)

- [ ] Create `infrastructure/loki/loki-config.yml`
- [ ] Create `infrastructure/promtail/promtail-config.yml`
- [ ] Update `docker-compose.yml`: Add Loki + Promtail services
- [ ] Create `infrastructure/grafana/provisioning/datasources/loki.yml`
- [ ] Create Grafana dashboard: Logs + Metrics correlation
- [ ] Remove `pino-pretty` transport from gateway watt.json (production)
- [ ] Test: Query logs with LogQL in Grafana
- [ ] Document LogQL common queries in operations docs

---

## Testing Strategy

### Unit Tests (Fase 1 - Now)

**No changes needed**: Logs non bloccano test (async fire-and-forget).

### Integration Tests (Fase 1 - Now)

**Verify structured fields**:

```typescript
test('onResponse hook logs structured data', async t => {
  const logs: string[] = [];
  const stream = split(JSON.parse);

  stream.on('data', log => {
    logs.push(log);
  });

  const app = buildGateway({ logger: { stream } });
  await app.inject({ method: 'GET', url: '/health' });

  const httpLog = logs.find(l => l.msg === 'HTTP request completed');
  t.ok(httpLog, 'Should log HTTP request');
  t.ok(httpLog.requestId, 'Should include requestId');
  t.equal(httpLog.method, 'GET', 'Should include method');
  t.equal(httpLog.statusCode, 200, 'Should include statusCode');
  t.type(httpLog.duration, 'number', 'Should include duration');
});
```

### E2E Tests (Fase 2 - With Loki)

**Verify log aggregation**:

```typescript
test('Loki aggregates gateway logs', async t => {
  // Generate traffic
  await fetch('http://gateway:3042/api/protected', {
    headers: { Authorization: 'Bearer <token>' },
  });

  // Wait for Promtail to ship logs
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Query Loki
  const response = await fetch('http://loki:3100/loki/api/v1/query', {
    method: 'POST',
    body: JSON.stringify({
      query: '{container="gateway"} | json | url="/api/protected"',
    }),
  });

  const data = await response.json();
  t.ok(data.data.result.length > 0, 'Loki should have logs');
});
```

---

## Migration Path

### Development → Staging

1. Keep `pino-pretty` for development
2. Staging: Remove transport, enable Loki stack
3. Verify logs in Grafana

### Staging → Production

1. Deploy Loki with persistent volume (`loki-data`)
2. Configure retention (30 days production vs 7 days staging)
3. Setup alerts: Loki ingestion failures
4. Backup strategy: Volume snapshots

---

## Related ADRs

- **ADR-001**: Gateway Composability (Feature Flags foundation)
- **ADR-002**: Hexagonal Architecture (Auth package)
- **ADR-003**: Gateway Hexagonal Composition (Current architecture)

---

## References

- [Grafana Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Pino Logger Documentation](https://getpino.io/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Promtail Configuration](https://grafana.com/docs/loki/latest/clients/promtail/)

---

**Last Updated**: 2025-12-12  
**Implementation**: Fase 1 completed (commit hash TBD)  
**Next Steps**: Deploy Loki stack when production deployment needed (Epic 2)
