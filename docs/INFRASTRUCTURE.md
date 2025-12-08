# Infrastructure Setup Guide

## Overview

Minimal infrastructure following YAGNI principle:

- ✅ Caddy (reverse proxy + TLS)
- ✅ Prometheus (metrics)
- ✅ Grafana (dashboards)
- ❌ Redis (added when caching needed)
- ❌ RabbitMQ (added when events needed)
- ❌ PostgreSQL (added when persistence needed)

See `docs/architecture/decisions/0001-minimal-infrastructure-yagni.md` for rationale.

## Quick Start

```bash
# Start infrastructure
docker compose up -d

# Verify services
docker compose ps

# View logs
docker compose logs -f caddy
docker compose logs -f prometheus
docker compose logs -f grafana

# Stop all
docker compose down
```

## Service Endpoints

| Service     | URL                    | Credentials    |
| ----------- | ---------------------- | -------------- |
| Gateway     | https://localhost:8443 | -              |
| Prometheus  | http://localhost:9090  | -              |
| Grafana     | http://localhost:3000  | admin/admin    |
| Caddy Admin | http://localhost:2019  | localhost only |

## Caddy Configuration

**Self-signed TLS in dev**:

```bash
# Trust Caddy's local CA (first time only)
docker compose exec caddy caddy trust
```

**Reload config without restart**:

```bash
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## Prometheus

**Metrics endpoint**: http://localhost:9090/metrics

**Targets**:

- `api-gateway` (scrapes `gateway:3042/metrics`)
- `prometheus` (self-monitoring)
- `caddy` (if metrics enabled)

## Grafana

**Default credentials**: `admin/admin` (change on first login)

**Auto-provisioned**:

- Datasource: Prometheus
- Dashboard: "API Gateway - Health & Performance"

**Access**: http://localhost:3000

## Graceful Shutdown

Gateway handles SIGTERM/SIGINT:

```typescript
// services/gateway/src/index.ts
const GRACEFUL_SHUTDOWN_TIMEOUT = 10000; // 10s

process.once('SIGTERM', gracefulShutdown);
process.once('SIGINT', gracefulShutdown);
```

**Behavior**:

1. Receive SIGTERM/SIGINT
2. Stop accepting new connections
3. Complete in-flight requests
4. Close Fastify server
5. Exit (0 = clean, 1 = timeout)

**Test**:

```bash
npm run test:integration
# Includes test/graceful-shutdown.test.ts
```

## Monitoring

**SLA Targets** (from .github/copilot-instructions.md):

- P50 < 100ms
- P95 < 300ms
- P99 < 500ms

**Grafana Dashboard**: "API Gateway - Health & Performance"

- Gateway status (UP/DOWN)
- HTTP request rate
- Response time percentiles
- Error rate (4xx, 5xx)

**Alerts** (when P95 > 300ms for 5min):

- Dashboard panel has alert configured
- TODO: Configure Alertmanager when needed

## Troubleshooting

**Caddy won't start**:

```bash
# Check Caddyfile syntax
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile

# View detailed logs
docker compose logs caddy | grep ERROR
```

**Prometheus not scraping**:

```bash
# Check targets
curl http://localhost:9090/api/v1/targets

# Verify gateway metrics endpoint
curl http://localhost:3042/metrics
```

**Grafana dashboard empty**:

```bash
# Verify datasource
curl http://localhost:3000/api/datasources

# Check Prometheus query
curl 'http://localhost:9090/api/v1/query?query=up{job="api-gateway"}'
```

## Next Steps (YAGNI)

Add these services **only when use case arises**:

1. **Redis** - When implementing cache layer (Epic 5)
2. **RabbitMQ** - When implementing event system (Epic 4)
3. **PostgreSQL** - When implementing persistence
4. **Loki** - When log aggregation needed
5. **Tempo** - When distributed tracing needed

Document decision in ADR-NNNN when adding new service.
