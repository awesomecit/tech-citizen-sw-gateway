# Quick Start - Production Deployment

**Single-command deployment da zero a produzione**

---

## Prerequisites

✅ Server Hetzner con Ubuntu 22.04  
✅ Dominio configurato (DNS punta al server)  
✅ SSH key generata: `~/.ssh/hetzner_techcitizen`  
✅ Ansible installato localmente

---

## Step 1: Generate Secrets (una tantum)

```bash
bash scripts/generate-secrets.sh
```

**Output**: `ansible/secrets.env` (git-ignored, contiene password)

---

## Step 2: Configure Inventory

Edita `ansible/inventory/hosts.ini`:

```ini
[production]
gateway-prod ansible_host=<IL_TUO_IP_HETZNER> ansible_user=root

[production:vars]
ansible_python_interpreter=/usr/bin/python3
ansible_ssh_private_key_file=~/.ssh/hetzner_techcitizen
domain=your-domain.com
cloudflare_zone_id=<CF_ZONE_ID>  # Opzionale
```

**Sostituisci**:

- `<IL_TUO_IP_HETZNER>` → IP del server Hetzner
- `your-domain.com` → Il tuo dominio
- `<CF_ZONE_ID>` → Cloudflare Zone ID (se usi Cloudflare)

---

## Step 3: Test SSH Connection

```bash
ssh -i ~/.ssh/hetzner_techcitizen root@<IL_TUO_IP>
```

Se non riesci a connetterti:

1. Verifica che la chiave pubblica sia stata aggiunta al server Hetzner
2. Copia chiave pubblica: `cat ~/.ssh/hetzner_techcitizen.pub`
3. Aggiungi in Hetzner Cloud Console → Server → SSH Keys

---

## Step 4: Bootstrap Server (tutto automatico!)

### Full Bootstrap (prima volta)

```bash
bash scripts/bootstrap-server.sh
```

Questo esegue **tutto in ordine**:

1. ✅ Security hardening (firewall, fail2ban, SSH)
2. ✅ Docker + Docker Compose installation
3. ✅ Gateway + Keycloak + Redis + RabbitMQ deployment
4. ✅ Caddy reverse proxy + TLS
5. ✅ Prometheus + Grafana monitoring

**Tempo stimato**: 10-15 minuti

### Re-deployment (solo Gateway)

```bash
bash scripts/bootstrap-server.sh --deploy-only
```

**Tempo**: 2-3 minuti

### Security Audit

```bash
bash scripts/bootstrap-server.sh --audit-only
```

---

## Step 5: Verify Deployment

### Health Check

```bash
curl https://your-domain.com/health
```

**Expected**:

```json
{
  "status": "healthy",
  "timestamp": "2025-12-11T..."
}
```

### Prometheus Metrics

```bash
curl https://your-domain.com/metrics
```

### Grafana Dashboard

```
https://your-domain.com:3001
User: admin
Password: (from ansible/secrets.env → grafana_admin_password)
```

### Keycloak Admin

```
https://your-domain.com/auth
User: admin
Password: (from ansible/secrets.env → keycloak_admin_password)
```

---

## Step 6: View Logs

```bash
# SSH into server
ssh -i ~/.ssh/hetzner_techcitizen root@<IL_TUO_IP>

# View Gateway logs
cd /opt/gateway
docker compose logs -f gateway

# View all services
docker compose ps
docker compose logs -f
```

---

## Troubleshooting

### Bootstrap fails at security step

```bash
# Skip security and retry
bash scripts/bootstrap-server.sh --skip-security
```

### Docker already installed

```bash
# Skip Docker installation
bash scripts/bootstrap-server.sh --skip-docker
```

### Re-deploy after code changes

```bash
# Only deploy Gateway (skip infrastructure)
bash scripts/bootstrap-server.sh --deploy-only
```

### View bootstrap log on server

```bash
ssh -i ~/.ssh/hetzner_techcitizen root@<IL_TUO_IP>
cat /var/log/gateway-bootstrap-*.log
```

---

## Commands Reference

| Command                                             | Description             | Time     |
| --------------------------------------------------- | ----------------------- | -------- |
| `bash scripts/generate-secrets.sh`                  | Generate secrets (once) | 5s       |
| `bash scripts/bootstrap-server.sh`                  | Full bootstrap          | 10-15min |
| `bash scripts/bootstrap-server.sh --deploy-only`    | Re-deploy only          | 2-3min   |
| `bash scripts/bootstrap-server.sh --audit-only`     | Security audit          | 1-2min   |
| `bash scripts/bootstrap-server.sh --skip-discovery` | Skip discovery          | -        |
| `bash scripts/bootstrap-server.sh --skip-security`  | Skip security           | -        |
| `bash scripts/bootstrap-server.sh --skip-docker`    | Skip Docker             | -        |

---

## What Gets Deployed

### Services (Docker Compose)

| Service    | Port | URL                 |
| ---------- | ---- | ------------------- |
| Gateway    | 3042 | https://domain/     |
| Keycloak   | 8090 | https://domain/auth |
| Redis      | 6379 | Internal            |
| RabbitMQ   | 5672 | Internal            |
| PostgreSQL | 5432 | Internal            |
| Prometheus | 9090 | https://domain:9090 |
| Grafana    | 3001 | https://domain:3001 |
| Loki       | 3100 | Internal            |

### Security

- ✅ UFW firewall (ports 22, 80, 443, 3001, 9090)
- ✅ Fail2ban (SSH brute-force protection)
- ✅ SSH hardening (no root password, key-only)
- ✅ TLS certificates (Let's Encrypt via Caddy)
- ✅ Docker security (non-root user, read-only filesystems)

### Monitoring

- ✅ Prometheus metrics collection
- ✅ Grafana dashboards
- ✅ Loki log aggregation
- ✅ Alerting rules (CPU, memory, disk)

---

## Next Steps

1. ✅ Configure DNS records (A/AAAA → server IP)
2. ✅ Test all endpoints
3. ✅ Review Grafana dashboards
4. ✅ Setup alerting (email/Slack notifications)
5. ✅ Configure backups (see `docs/operations/PRODUCTION_SETUP.md`)
6. ✅ Run security audit: `bash scripts/bootstrap-server.sh --audit-only`

---

## Rollback

```bash
# SSH into server
ssh -i ~/.ssh/hetzner_techcitizen root@<IL_TUO_IP>

# Stop services
cd /opt/gateway
docker compose down

# Restore previous version
cd /opt
mv gateway.backup.<timestamp> gateway

# Start services
cd /opt/gateway
docker compose up -d
```

---

**Last Updated**: 2025-12-11  
**Deployment Time**: ~15 minutes  
**Minimum Requirements**: 2 vCPU, 4GB RAM, 40GB disk
