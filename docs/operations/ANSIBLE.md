# Ansible Playbooks - Multi-Environment

Automazione sicurezza e deployment per staging (Docker) e production (Hetzner).

## 📋 Playbooks Disponibili

| Playbook                | Staging     | Production | Descrizione                              |
| ----------------------- | ----------- | ---------- | ---------------------------------------- |
| `security-baseline.yml` | ⚠️ Parziale | ✅ Full    | SSH, UFW, Fail2Ban, sysctl, auto-updates |
| `docker-install.yml`    | ✅          | ✅         | Docker Engine + Compose v2.24.0          |
| `deploy-gateway.yml`    | ✅          | ✅         | Git clone, build, health check           |
| `security-audit.yml`    | ✅ Report   | ✅ Full    | CIS Benchmark verification               |
| `server-discovery.yml`  | ✅          | ✅         | Inventario software installato           |
| `server-cleanup.yml`    | ✅          | ✅         | Rimozione software inutilizzato          |

## 🏷️ Tags Disponibili

### Security Baseline

- `staging` - Solo task compatibili Docker (UFW, sysctl, kernel)
- `production` - Full hardening (SSH, Fail2Ban, auto-updates)
- `ssh` - SSH hardening (production only)
- `firewall` - UFW configuration
- `fail2ban` - Intrusion prevention (production only)
- `updates` - Automatic security updates (production only)
- `kernel` - Sysctl hardening
- `cloudflare` - Whitelist Cloudflare IPs (production only)

### Deploy

- `deploy` - Full deployment process

### Audit

- `audit-ssh` - SSH config checks (production only)
- `audit-firewall` - UFW checks
- `audit-fail2ban` - Fail2Ban checks (production only)
- `audit-updates` - Auto-update checks (production only)
- `audit-kernel` - Sysctl verification
- `audit-docker` - Docker daemon checks
- `audit-users` - User permission checks
- `audit-gateway` - Gateway health check
- `audit-report` - Generate report

## 🚀 Comandi Rapidi

### Staging (Docker Simulation)

```bash
# 1. Avvia container hetzner-sim
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d hetzner-server

# 2. Installa Docker nel container
ansible-playbook -i inventory/hosts.ini playbooks/docker-install.yml --limit=staging

# 3. Security baseline (skip SSH/Fail2Ban)
ansible-playbook -i inventory/hosts.ini playbooks/security-baseline.yml --limit=staging --tags=staging

# 4. Deploy gateway
ansible-playbook -i inventory/hosts.ini playbooks/deploy-gateway.yml --limit=staging

# 5. Security audit
ansible-playbook -i inventory/hosts.ini playbooks/security-audit.yml --limit=staging --tags=staging

# 6. Server discovery (analizza software installato)
ansible-playbook -i inventory/hosts.ini playbooks/server-discovery.yml --limit=staging

# 7. Server cleanup (dry-run prima, poi reale)
ansible-playbook -i inventory/hosts.ini playbooks/server-cleanup.yml --limit=staging
ansible-playbook -i inventory/hosts.ini playbooks/server-cleanup.yml --limit=staging --extra-vars "dry_run=false"
```

### Production (Hetzner Real Server)

```bash
# 1. Server discovery (SEMPRE PRIMA di qualsiasi modifica)
ansible-playbook -i inventory/hosts.ini playbooks/server-discovery.yml --limit=production

# 2. Security baseline completo
ansible-playbook -i inventory/hosts.ini playbooks/security-baseline.yml --limit=production

# 3. Installa Docker
ansible-playbook -i inventory/hosts.ini playbooks/docker-install.yml --limit=production

# 4. Deploy gateway
ansible-playbook -i inventory/hosts.ini playbooks/deploy-gateway.yml --limit=production

# 5. Audit completo
ansible-playbook -i inventory/hosts.ini playbooks/security-audit.yml --limit=production

# 6. Cleanup (SOLO dopo discovery, dry-run prima)
ansible-playbook -i inventory/hosts.ini playbooks/server-cleanup.yml --limit=production --check
ansible-playbook -i inventory/hosts.ini playbooks/server-cleanup.yml --limit=production --extra-vars "dry_run=false"
```

### Tag Selettivi

```bash
# Solo UFW (funziona su staging e production)
ansible-playbook -i inventory/hosts.ini playbooks/security-baseline.yml --tags=firewall

# Solo SSH hardening (production only)
ansible-playbook -i inventory/hosts.ini playbooks/security-baseline.yml --limit=production --tags=ssh

# Solo kernel hardening (staging e production)
ansible-playbook -i inventory/hosts.ini playbooks/security-baseline.yml --tags=kernel

# Dry-run (--check mode)
ansible-playbook -i inventory/hosts.ini playbooks/security-baseline.yml --limit=staging --check
```

## 🔧 Configurazione

### Inventory Setup

Modifica `inventory/hosts.ini`:

```ini
[production]
gateway-prod ansible_host=YOUR_HETZNER_IP ansible_user=deploy ansible_port=22

[all:vars]
domain=YOUR_DOMAIN
cloudflare_zone_id=YOUR_ZONE_ID
cloudflare_api_token=YOUR_API_TOKEN
```

### SSH Key Setup (Production)

```bash
# Genera chiave deploy
ssh-keygen -t ed25519 -f ~/.ssh/hetzner_deploy_key -C "deploy@techcitizen"

# Copia sul server
ssh-copy-id -i ~/.ssh/hetzner_deploy_key.pub root@HETZNER_IP
```

### Environment Variables Template

Modifica `playbooks/templates/env.production.j2` con secrets reali:

```bash
# Genera secrets
openssl rand -hex 32  # JWT_SECRET
openssl rand -hex 32  # SESSION_SECRET
openssl rand -base64 32  # REDIS_PASSWORD
```

## 📊 Limitazioni Staging vs Production

### ✅ Funziona in Staging (Docker)

- UFW firewall (in container privileged)
- Docker installation
- Sysctl kernel params (alcuni)
- Git clone + build + deploy
- Health checks
- Security audit (report parziale)

### ❌ NON funziona in Staging

- SSH hardening (container usa `docker exec`)
- Fail2Ban (richiede systemd)
- Unattended-upgrades (richiede systemd)
- Automatic reboots
- Cloudflare IP whitelist (network Docker interno)

## 📝 Note di Sicurezza

- **Staging**: Test sicuro in container isolato
- **Production**: Applica CIS Benchmark completo
- **Backup**: Sempre prima di modifiche production
- **Testing**: Usa `--check` per dry-run

## 🔍 Troubleshooting

```bash
# Test connessione staging
docker exec hetzner-sim whoami

# Test connessione production
ansible production -i inventory/hosts.ini -m ping

# Verifica sintassi playbook
ansible-playbook --syntax-check playbooks/security-baseline.yml

# Debug verbose
ansible-playbook -vvv -i inventory/hosts.ini playbooks/security-baseline.yml --limit=staging
```

## 📚 Riferimenti

- [SECURITY_CHECKLIST.md](../docs/SECURITY_CHECKLIST.md) - Checklist sicurezza
- [INFRASTRUCTURE.md](../docs/INFRASTRUCTURE.md) - Architettura infra
- [CIS Ubuntu Benchmark](https://www.cisecurity.org/benchmark/ubuntu_linux)
