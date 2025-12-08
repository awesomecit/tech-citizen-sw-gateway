# Deployment Simulation Guide

## Obiettivo

Simulare un deploy production-like su Hetzner Cloud + Cloudflare usando Docker локально:

- **Hetzner Server** → Container Docker (Ubuntu/Debian)
- **Cloudflare DNS/Proxy** → Container Caddy con DNS-01 challenge simulato
- **Deploy process** → Docker Compose + script bash (Ansible opzionale)

## Architettura Simulazione

```
┌─────────────────────────────────────────────────────────┐
│ Host Machine (tuo laptop)                               │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Docker Network: production-sim                  │    │
│  │                                                  │    │
│  │  ┌──────────────┐      ┌──────────────┐        │    │
│  │  │ hetzner-sim  │      │ cloudflare-  │        │    │
│  │  │ (Ubuntu 22)  │◄─────┤ sim (Caddy)  │        │    │
│  │  │              │      │ DNS Proxy    │        │    │
│  │  │ - Gateway    │      │              │        │    │
│  │  │ - Prometheus │      └──────────────┘        │    │
│  │  │ - Grafana    │              │               │    │
│  │  └──────────────┘              │               │    │
│  │         │                      │               │    │
│  │         └──────────────────────┘               │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Approccio: 3 Fasi

### Fase 1: Docker-only (YAGNI - ora)

Nessun Ansible, solo Docker Compose + script bash per deploy.

**Pro:**

- Veloce da implementare
- Testing immediato
- Zero dipendenze esterne

**Contro:**

- Meno realistic per multi-server
- Nessuna gestione configurazione

### Fase 2: Docker + Ansible (quando serve multi-server)

Aggiungi Ansible quando hai >1 server da gestire.

### Fase 3: Terraform + Ansible (production)

Terraform per infra Hetzner + Cloudflare, Ansible per provisioning.

## Implementazione Fase 1 (Docker-only)

### 1. Container "Hetzner Server"

```yaml
# docker-compose.staging.yml
services:
  hetzner-server:
    image: ubuntu:22.04
    container_name: hetzner-sim
    hostname: gateway.example.com
    privileged: true # Per systemd se necessario
    command: tail -f /dev/null # Keep alive
    volumes:
      - ./:/deploy:ro # Mount progetto
      - hetzner-data:/data
    networks:
      production-sim:
        ipv4_address: 172.30.0.10
    environment:
      - HETZNER_REGION=nbg1
      - ENV=staging
```

### 2. Simulatore Cloudflare (Caddy DNS)

```yaml
cloudflare-sim:
  image: caddy:2-alpine
  container_name: cloudflare-sim
  volumes:
    - ./infrastructure/cloudflare-sim/Caddyfile:/etc/caddy/Caddyfile
  ports:
    - '80:80'
    - '443:443'
  networks:
    production-sim:
      ipv4_address: 172.30.0.5
  environment:
    - DOMAIN=gateway.localtest.me # DNS pubblico che risolve a 127.0.0.1
```

### 3. Script Deploy (senza Ansible)

```bash
#!/bin/bash
# scripts/deploy-staging.sh

TARGET_HOST="hetzner-sim"  # Container name
DEPLOY_USER="root"

echo "🚀 Deploying to staging..."

# 1. Build immagini
docker compose build

# 2. Copy files al "server"
docker cp ./services $TARGET_HOST:/opt/gateway/
docker cp ./infrastructure $TARGET_HOST:/opt/gateway/

# 3. Installa dipendenze nel container
docker exec $TARGET_HOST bash -c "
  apt-get update && apt-get install -y docker.io docker-compose-v2
  cd /opt/gateway
  docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d
"

# 4. Health check
sleep 10
docker exec $TARGET_HOST curl -f http://localhost:3042/health || exit 1

echo "✅ Deploy completed"
```

## Alternative: LocalTest.me per DNS

Usa **localtest.me** o **nip.io** invece di simulare Cloudflare DNS:

```bash
# Questi domini risolvono automaticamente a 127.0.0.1
gateway.localtest.me    → 127.0.0.1
api.localtest.me        → 127.0.0.1

# O con nip.io (per IP specifici)
gateway.172.30.0.10.nip.io  → 172.30.0.10
```

## Quando serve Ansible?

Aggiungi Ansible **solo** quando hai:

- [ ] > 3 server da gestire
- [ ] Configurazioni complesse da template
- [ ] Idempotenza richiesta per CI/CD
- [ ] Secret management centralizzato (Vault)

**Per ora: NO** - Docker + bash è sufficiente per simulazione.

## Simulazione Cloudflare Features

### DNS Challenge (Let's Encrypt)

```caddyfile
# Usa HTTP-01 invece di DNS-01 localmente
gateway.localtest.me {
    tls {
        ca https://acme-staging-v02.api.letsencrypt.org/directory
    }
}
```

### WAF Rules

```caddyfile
# Simula Cloudflare rate limiting
gateway.localtest.me {
    rate_limit {
        zone requests_per_ip {
            key {remote_host}
            window 1m
            events 100
        }
    }
}
```

### SSL/TLS Settings

Già gestito da Caddy (simile a Cloudflare Full-Strict).

## Prossimi Step

1. **Ora**: Crea `docker-compose.staging.yml` + `scripts/deploy-staging.sh`
2. **Test**: Simula deploy con `npm run deploy:staging`
3. **Valida**: Verifica health checks, logs, metrics
4. **Ansible**: Solo quando serve (Epic-003 Security Hardening)

## Riferimenti

- [LocalTest.me](http://localtest.me) - DNS pubblico per testing
- [Nip.io](https://nip.io) - Wildcard DNS per IP
- [Caddy DNS Challenge](https://caddyserver.com/docs/automatic-https#dns-challenge)
