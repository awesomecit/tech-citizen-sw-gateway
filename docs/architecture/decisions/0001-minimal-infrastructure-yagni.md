# ADR-0001: Minimal Infrastructure Setup (YAGNI Principle)

**Status**: Accepted  
**Date**: 2025-12-08  
**Decision Makers**: Antonio Cittadino

## Context

Roadmap originale prevedeva Epic 1 con Docker Compose per Redis, RabbitMQ, PostgreSQL, Caddy.  
**Problema**: Non abbiamo ancora un caso d'uso concreto per questi servizi.

### YAGNI Violation Indicators

- Redis: Nessun endpoint che richiede cache al momento
- RabbitMQ: Nessun evento async da processare
- PostgreSQL: Nessuna entità persistente definita

Aggiungere questi servizi ora significa:

- Manutenzione di container inutilizzati
- Configurazione dead code
- Falsi positivi in monitoring

## Decision

**Setup minimalista Epic 1-2**:

1. **Caddy reverse proxy** - Necessario per:
   - TLS terminazione (anche in dev con certificati self-signed)
   - Routing HTTP verso Platformatic Watt
   - Header security (HSTS, CSP base)

2. **Prometheus + Grafana** - Necessario per:
   - Metriche runtime Platformatic (disponibili out-of-the-box)
   - Dashboard health check del gateway
   - Baseline per SLA tracking (P50/P95/P99)

3. **Graceful Shutdown Handler** - Necessario per:
   - Evitare dropped requests durante deploy
   - Cleanup risorse Fastify
   - Signal handling (SIGTERM/SIGINT)

**NON implementare ora**:

- ❌ Redis (fino a caso d'uso cache)
- ❌ RabbitMQ (fino a caso d'uso eventi)
- ❌ PostgreSQL (fino a entità persistente)
- ❌ Loki/Tempo (monitoring avanzato - nice to have)

## Consequences

**Positive:**

- Setup più veloce (1-2 ore vs 1 giorno)
- Meno superficie di attacco in dev
- Infrastruttura aggiunta solo quando serve
- Docker Compose più semplice

**Negative:**

- Dovremo aggiungere servizi in futuro quando serve
- Possibile refactoring configurazione Caddy

## Implementation Checklist

- [ ] `infrastructure/caddy/Caddyfile` - Reverse proxy config
- [ ] `infrastructure/prometheus/prometheus.yml` - Metrics scraping
- [ ] `infrastructure/grafana/provisioning/` - Auto-load dashboards
- [ ] `docker-compose.yml` - Solo Caddy, Prometheus, Grafana
- [ ] `services/gateway/src/index.ts` - Graceful shutdown hook
- [ ] `test/graceful-shutdown.test.ts` - Regression test
- [ ] ADR-0002 per primo caso d'uso Redis/RabbitMQ/PostgreSQL

## Alternatives Considered

**Option A: Full stack subito**

- ❌ Violazione YAGNI
- ❌ Overhead manutenzione
- ✅ Environment simile a produzione

**Option B: Zero infrastructure**

- ✅ Massimo YAGNI
- ❌ Nessun reverse proxy (problema TLS)
- ❌ Nessun monitoring (SLA impossibili da verificare)

**Option C: Minimal (scelta)** ✅

- ✅ Solo componenti con caso d'uso immediato
- ✅ Baseline per SLA
- ✅ Facile aggiungere servizi quando serve
