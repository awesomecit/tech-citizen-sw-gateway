# Production Deployment Status - 2025-12-11

## ✅ Deployment Completato

### Server Infrastructure

- **Provider**: Hetzner Cloud
- **IP**: 46.224.61.146
- **OS**: Ubuntu 22.04 LTS (Linux 6.8.0-71-generic x86_64)
- **SSH**: Configurato con chiave `~/.ssh/hetzner_techcitizen`

### Software Installato

- ✅ Docker 29.1.2
- ✅ Docker Compose plugin
- ✅ UFW (firewall configurato)
- ✅ fail2ban (protezione SSH)
- ✅ unattended-upgrades (aggiornamenti automatici)

### Services Attivi (Docker Compose)

```
NAME                 STATUS                  PORTS
gateway-caddy        Up (healthy)            0.0.0.0:18080->8080/tcp, :18443->8443/tcp, :12019->2019/tcp
gateway-prometheus   Up (healthy)            0.0.0.0:19090->9090/tcp
gateway-grafana      Up (healthy)            0.0.0.0:3000->3000/tcp
```

### Health Check Results

- ✅ **Prometheus**: `http://localhost:19090/-/healthy` → "Prometheus Server is Healthy."
- ✅ **Grafana**: `http://localhost:3000/api/health` → `{"database":"ok","version":"11.3.1"}`
- ⚠️ **Caddy**: `http://localhost:8080/health` → Nessuna risposta (normale, proxy non configurato)

### Firewall Rules (UFW)

```
Port    Service         Status
22      SSH             ALLOW
80      HTTP            ALLOW
443     HTTPS           ALLOW
3001    Grafana         ALLOW (temp, da rimuovere dopo reverse proxy)
9090    Prometheus      ALLOW (temp, da rimuovere dopo reverse proxy)
```

---

## ⏳ Configurazione DNS Pendente

### Record A da Creare su Cloudflare

**Dashboard**: https://dash.cloudflare.com
**Domain**: tech-citizen.me
**Target IP**: 46.224.61.146

| #   | Type | Name    | IPv4 Address  | Proxy       | Creato? |
| --- | ---- | ------- | ------------- | ----------- | ------- |
| 1   | A    | @       | 46.224.61.146 | DNS only ☁️ | ❌      |
| 2   | A    | www     | 46.224.61.146 | DNS only ☁️ | ❌      |
| 3   | A    | gateway | 46.224.61.146 | DNS only ☁️ | ❌      |
| 4   | A    | auth    | 46.224.61.146 | DNS only ☁️ | ❌      |
| 5   | A    | grafana | 46.224.61.146 | DNS only ☁️ | ❌      |
| 6   | A    | app     | 46.224.61.146 | DNS only ☁️ | ❌      |

**IMPORTANTE**: Usare "DNS only" (nuvola grigia ☁️), NON "Proxied" (nuvola arancione 🟠)

### Verifica DNS (dopo 5 minuti dalla creazione)

```bash
dig +short tech-citizen.me           # Deve restituire: 46.224.61.146
dig +short www.tech-citizen.me       # Deve restituire: 46.224.61.146
dig +short gateway.tech-citizen.me   # Deve restituire: 46.224.61.146
dig +short auth.tech-citizen.me      # Deve restituire: 46.224.61.146
dig +short grafana.tech-citizen.me   # Deve restituire: 46.224.61.146
dig +short app.tech-citizen.me       # Deve restituire: 46.224.61.146
```

---

## 📋 Next Steps (Post-DNS)

### 1. Configurare Caddy per Reverse Proxy

**File**: `/opt/gateway/infrastructure/caddy/Caddyfile`

Attualmente configurato per:

- `localhost:8080` → Health check endpoint
- Necessario aggiungere:
  - `tech-citizen.me` → Gateway API
  - `www.tech-citizen.me` → Redirect a `tech-citizen.me`
  - `gateway.tech-citizen.me` → Gateway API (alias)
  - `auth.tech-citizen.me` → Keycloak (da deployare)
  - `grafana.tech-citizen.me` → Grafana dashboard
  - `app.tech-citizen.me` → Future UI

### 2. Deploy Gateway Service (Platformatic Watt)

Attualmente deployati solo:

- Caddy (reverse proxy)
- Prometheus (metrics)
- Grafana (dashboard)

**Mancano**:

- Gateway service (Fastify + Platformatic Watt)
- Keycloak (authentication)
- Redis (cache)
- RabbitMQ (events)
- PostgreSQL (database)

### 3. TLS/SSL Configuration

- Caddy con Let's Encrypt automatic
- Certificati generati automaticamente al primo accesso HTTPS
- Richiede DNS configurato correttamente

### 4. Security Hardening

- ✅ UFW configurato (default deny)
- ✅ fail2ban attivo
- ✅ SSH solo con chiave
- ⏳ Rimuovere accesso pubblico a porte 3000, 19090 (usare solo reverse proxy)
- ⏳ Configurare rate limiting
- ⏳ Abilitare CORS policies
- ⏳ Hardening PostgreSQL/Redis/RabbitMQ credentials

### 5. Monitoring Setup

- ✅ Prometheus attivo (raccolta metriche)
- ✅ Grafana attivo (visualizzazione)
- ⏳ Configurare dashboards Grafana
- ⏳ Configurare alerts (email, Slack)
- ⏳ Abilitare Loki (log aggregation)
- ⏳ Abilitare Tempo (tracing)

### 6. Security Audit

**Script**: `bash scripts/bootstrap-server.sh --audit-only`

Checklist POST_DEPLOYMENT_AUDIT.md (15 checks):

1. SSL/TLS validation
2. Port scanning (nmap)
3. SSH hardening
4. Firewall rules
5. Docker security
6. Secret exposure
7. Keycloak security
8. Database access
9. Rate limiting
10. CORS validation
11. Log analysis
12. Backup verification
13. Monitoring alerts
14. Compliance scan
15. Vulnerability scanning

---

## 🎯 Prossimi User Stories (EPIC-013)

### Phase 1: Core User Management (17 SP)

- **US-057**: Email Verification Flow (5 SP)
- **US-058**: Password Reset Flow (3 SP)
- **US-059**: Profile Management API (5 SP)
- **US-060**: Rate Limiting + CORS (4 SP)

### Phase 2: Gateway Integration (13 SP)

- **US-061**: Gateway Keycloak Integration (5 SP)
- **US-062**: JWT Validation Middleware (3 SP)
- **US-063**: Session Management (3 SP)
- **US-064**: Role-Based Access Control (2 SP)

### Phase 3: UI Backend (10 SP)

- **US-065**: GraphQL/REST API (5 SP)
- **US-066**: Real-time Notifications (5 SP)

---

## 📊 Current Deployment Metrics

### Coverage Status

- **Gateway E2E Tests**: 97.36% (US-054 ✅)
- **Unit Tests**: In progress
- **Integration Tests**: Keycloak + Redis (US-055, US-056 pending)

### Infrastructure Costs (Estimated)

- **Hetzner VPS**: €4.49/month (CX21: 2 vCPU, 4GB RAM, 40GB SSD)
- **Cloudflare**: €0/month (Free plan)
- **Total**: ~€5/month

### Performance Baselines (Target)

- **P50**: < 100ms
- **P95**: < 300ms
- **P99**: < 500ms

### Availability Target

- **Uptime**: 99.9% (43 minutes downtime/month)
- **RTO**: < 15 minutes (Recovery Time Objective)
- **RPO**: < 1 hour (Recovery Point Objective)

---

## 📝 Deployment Commands Reference

### Accesso Server

```bash
ssh -i ~/.ssh/hetzner_techcitizen root@46.224.61.146
```

### Docker Compose Management

```bash
cd /opt/gateway
docker compose ps              # Stato services
docker compose logs -f         # Logs real-time (tutti i services)
docker compose logs -f caddy   # Logs specifico service
docker compose restart         # Restart tutti i services
docker compose down            # Stop tutti i services
docker compose up -d           # Start in background
```

### Health Checks

```bash
# Prometheus
curl http://localhost:19090/-/healthy

# Grafana
curl http://localhost:3000/api/health | jq '.'

# Caddy (dopo DNS config)
curl http://localhost:8080/health
```

### Firewall Management

```bash
ufw status verbose             # Stato firewall
ufw allow 8080/tcp             # Apri porta
ufw delete allow 8080/tcp      # Chiudi porta
ufw reload                     # Ricarica regole
```

### fail2ban Status

```bash
fail2ban-client status         # Status generale
fail2ban-client status sshd    # Status jail SSH
fail2ban-client set sshd unbanip 1.2.3.4  # Sblocca IP
```

### System Monitoring

```bash
docker stats                   # Uso risorse containers
df -h                          # Spazio disco
free -h                        # Memoria RAM
htop                           # Processi (Ctrl+C per uscire)
```

---

## 🔐 Security Notes

### Secrets Location

- **Local**: `ansible/secrets.env` (git-ignored, chmod 600)
- **Server**: `/opt/gateway/.env` (chmod 600)

### Backup Secrets

```bash
# Backup locale
cp ansible/secrets.env ansible/secrets.env.backup.$(date +%Y%m%d)

# Backup remoto (encrypted)
gpg -c ansible/secrets.env
# Output: ansible/secrets.env.gpg (commit to git)
```

### Rotate Secrets (quando necessario)

```bash
# Rigenera secrets
bash scripts/generate-secrets.sh

# Rideploy con nuovi secrets
ansible-playbook -i ansible/inventory/hosts.ini \
  ansible/playbooks/bootstrap.yml \
  --limit=production \
  --tags=deploy
```

---

## 📞 Support & Resources

### Documentation

- **Quick Start**: `docs/operations/QUICK_START.md`
- **Deployment Checklist**: `docs/operations/DEPLOYMENT_CHECKLIST.md`
- **Security Audit**: `docs/security/POST_DEPLOYMENT_AUDIT.md`
- **Ansible Guide**: `docs/operations/ANSIBLE.md`

### External Resources

- **Hetzner Console**: https://console.hetzner.cloud
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Grafana**: http://46.224.61.146:3000 (user: admin, password: vedi secrets.env)
- **Prometheus**: http://46.224.61.146:19090

### Emergency Contacts

- **Hetzner Support**: https://docs.hetzner.com/robot/general/contact/
- **Cloudflare Support**: https://support.cloudflare.com

---

**Deployment Date**: 2025-12-11  
**Deployed By**: Antonio Cittadino  
**Status**: ✅ Infrastructure Ready, ⏳ DNS Pending  
**Version**: v1.7.0-dev
