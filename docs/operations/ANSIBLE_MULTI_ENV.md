# Ansible Multi-Environment Setup - Tech Citizen Gateway

## 🎯 Overview

Struttura Ansible aggiornata per deployment multi-environment con **secrets esterni al repository**.

### ✅ Security Features

- ✅ IP server NON hardcoded (caricato da env var)
- ✅ Credentials Cloudflare esterne al repo
- ✅ Email SSL configurabile
- ✅ Secrets in `~/secrets/` (chmod 600, fuori da git)
- ✅ Template Jinja2 per configurazioni dinamiche

---

## 📁 Struttura File

```
ansible/
├── inventory/
│   ├── hosts.ini                    # ✅ Template con variabili d'ambiente
│   └── group_vars/
│       ├── production.yml           # 🆕 Variabili production
│       └── staging.yml              # 🆕 Variabili staging
├── playbooks/
│   ├── templates/
│   │   ├── Caddyfile.j2             # 🆕 Template multi-domain
│   │   └── env.production.j2        # ✅ Esistente
│   ├── bootstrap.yml                # ✅ Master playbook
│   ├── setup-caddy.yml              # 🆕 Caddy configuration
│   ├── security-baseline.yml        # ✅ Security hardening
│   ├── docker-install.yml           # ✅ Docker setup
│   └── deploy-gateway.yml           # ✅ Gateway deployment
├── production.env.example           # 🆕 Template per secrets
└── secrets.env                      # ✅ Ansible secrets (git-ignored)

~/secrets/                           # 🔒 FUORI DAL REPO
└── production.env                   # 🆕 Production credentials
```

---

## 🚀 Usage

### 1. Setup Secrets (Prima Volta)

```bash
# Copia template e compila valori reali
cp ansible/production.env.example ~/secrets/production.env
nano ~/secrets/production.env

# Contenuto esempio:
# export PRODUCTION_SERVER_IP="46.224.61.146"
# export DOMAIN="tech-citizen.me"
# export SSL_EMAIL="your-email@example.com"
# export CLOUDFLARE_ZONE_ID="your_zone_id"
# export CLOUDFLARE_API_TOKEN="your_token"

# Proteggi file
chmod 600 ~/secrets/production.env
```

### 2. Deploy Production

```bash
# Carica environment variables
source ~/secrets/production.env

# Bootstrap completo (security + docker + gateway)
ansible-playbook -i ansible/inventory/hosts.ini \
  ansible/playbooks/bootstrap.yml \
  --limit=production

# Setup Caddy reverse proxy
ansible-playbook -i ansible/inventory/hosts.ini \
  ansible/playbooks/setup-caddy.yml \
  --limit=production
```

### 3. Deploy Staging (Futuro)

```bash
# Setup staging environment
source ~/secrets/staging.env

ansible-playbook -i ansible/inventory/hosts.ini \
  ansible/playbooks/bootstrap.yml \
  --limit=staging \
  --tags=staging
```

---

## 🔧 Playbooks Disponibili

### `bootstrap.yml` - Complete Server Setup

```bash
# Full bootstrap (security + docker + gateway + verification)
ansible-playbook -i inventory/hosts.ini playbooks/bootstrap.yml --limit=production

# Solo security hardening
ansible-playbook -i inventory/hosts.ini playbooks/bootstrap.yml --limit=production --tags=security

# Solo Docker installation
ansible-playbook -i inventory/hosts.ini playbooks/bootstrap.yml --limit=production --tags=docker

# Solo Gateway deployment
ansible-playbook -i inventory/hosts.ini playbooks/bootstrap.yml --limit=production --tags=deploy
```

### `setup-caddy.yml` - Reverse Proxy Configuration

```bash
# Configure Caddy con multi-domain SSL
ansible-playbook -i inventory/hosts.ini playbooks/setup-caddy.yml --limit=production
```

### `security-baseline.yml` - Security Hardening

```bash
# UFW, fail2ban, SSH hardening
ansible-playbook -i inventory/hosts.ini playbooks/security-baseline.yml --limit=production
```

### `deploy-gateway.yml` - Gateway Deployment

```bash
# Deploy Gateway services
ansible-playbook -i inventory/hosts.ini playbooks/deploy-gateway.yml --limit=production
```

---

## 🌐 DNS Configuration

### Production (6 records su Cloudflare)

| #   | Type | Name      | Target IP     | Proxy       | Domain Result           |
| --- | ---- | --------- | ------------- | ----------- | ----------------------- |
| 1   | A    | `@`       | 46.224.61.146 | ☁️ DNS only | tech-citizen.me         |
| 2   | A    | `www`     | 46.224.61.146 | ☁️ DNS only | www.tech-citizen.me     |
| 3   | A    | `gateway` | 46.224.61.146 | ☁️ DNS only | gateway.tech-citizen.me |
| 4   | A    | `auth`    | 46.224.61.146 | ☁️ DNS only | auth.tech-citizen.me    |
| 5   | A    | `grafana` | 46.224.61.146 | ☁️ DNS only | grafana.tech-citizen.me |
| 6   | A    | `app`     | 46.224.61.146 | ☁️ DNS only | app.tech-citizen.me     |

**⚠️ IMPORTANTE**: Usa **"DNS only" (nuvola grigia ☁️)**, NON "Proxied"

### Staging (4 records - Futuro)

| #   | Type | Name              | Target IP | Proxy       |
| --- | ---- | ----------------- | --------- | ----------- |
| 1   | A    | `staging`         | SERVER_IP | ☁️ DNS only |
| 2   | A    | `gateway.staging` | SERVER_IP | ☁️ DNS only |
| 3   | A    | `auth.staging`    | SERVER_IP | ☁️ DNS only |
| 4   | A    | `grafana.staging` | SERVER_IP | ☁️ DNS only |

---

## 📊 Group Variables

### `production.yml`

```yaml
environment: production
domain: tech-citizen.me

# Subdomains
gateway_domain: gateway.tech-citizen.me
auth_domain: auth.tech-citizen.me
grafana_domain: grafana.tech-citizen.me
app_domain: app.tech-citizen.me

# SSL
ssl_email: admin@tech-citizen.me
ssl_staging: false # Production Let's Encrypt
```

### `staging.yml`

```yaml
environment: staging
domain: tech-citizen.me

# Subdomains (nested)
gateway_domain: gateway.staging.tech-citizen.me
auth_domain: auth.staging.tech-citizen.me
grafana_domain: grafana.staging.tech-citizen.me

# SSL
ssl_staging: true # Let's Encrypt staging (no rate limits)
```

---

## 🔐 Security Checklist

### ✅ File Protetti da Git

- ✅ `~/secrets/production.env` (fuori repo)
- ✅ `ansible/secrets.env` (git-ignored)
- ✅ `ansible/production.env` (git-ignored)
- ✅ `.vault_pass` (git-ignored)

### ✅ Valori Parametrizzati

- ✅ IP server: `{{ lookup('env', 'PRODUCTION_SERVER_IP') }}`
- ✅ Domain: `{{ lookup('env', 'DOMAIN') }}`
- ✅ SSL Email: `{{ lookup('env', 'SSL_EMAIL') }}`
- ✅ Cloudflare: `{{ lookup('env', 'CLOUDFLARE_*') }}`

### ⚠️ NON Committare MAI

- ❌ IP server hardcoded
- ❌ Cloudflare Zone ID/Token
- ❌ Email address reale
- ❌ SSH private keys
- ❌ Database credentials
- ❌ API tokens

---

## 🛠️ Troubleshooting

### Errore: "PRODUCTION_SERVER_IP not set"

```bash
# Soluzione: Source secrets file
source ~/secrets/production.env
ansible-playbook ...
```

### Errore: "Permission denied (publickey)"

```bash
# Verifica SSH key
ssh -i ~/.ssh/hetzner_techcitizen root@$PRODUCTION_SERVER_IP

# Fix permissions
chmod 600 ~/.ssh/hetzner_techcitizen
```

### Errore: "Caddy failed to start"

```bash
# Verifica DNS configurato correttamente
dig +short gateway.tech-citizen.me

# Check Caddy logs
ssh -i ~/.ssh/hetzner_techcitizen root@$PRODUCTION_SERVER_IP
docker logs gateway-caddy
```

### Ansible non trova variabili da group_vars

```bash
# Debug variabili caricate
ansible-playbook -i inventory/hosts.ini playbooks/bootstrap.yml --limit=production --list-hosts -vvv

# Verifica group_vars esistano
ls -la ansible/inventory/group_vars/
```

---

## 📚 References

- **Deployment Status**: `docs/operations/PRODUCTION_STATUS.md`
- **Quick Start**: `docs/operations/QUICK_START.md`
- **Cloudflare Setup**: `scripts/cloudflare-setup.sh`
- **Ansible Documentation**: https://docs.ansible.com

---

**Last Updated**: 2025-12-11  
**Status**: ✅ Security Hardened, Ready for Production
