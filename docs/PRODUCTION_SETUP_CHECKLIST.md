# Production Server Setup Checklist

## 1. Hetzner Server Info

```bash
# Accedi a Hetzner Robot/Console e recupera:

SERVER_IP=              # IP pubblico server
SERVER_OS=              # Ubuntu 22.04 / Debian 11 / altro?
SERVER_SSH_PORT=        # Porta SSH attuale (default 22)
SERVER_ROOT_ACCESS=     # root login abilitato? (yes/no)
SERVER_HOSTNAME=        # Hostname attuale
```

**Come ottenerle:**

- Hetzner Robot: https://robot.hetzner.com/server
- Cloud Console: https://console.hetzner.cloud/projects
- SSH test: `ssh root@SERVER_IP "hostname; cat /etc/os-release"`

---

## 2. Cloudflare DNS Info

```bash
# Accedi a Cloudflare Dashboard e recupera:

DOMAIN=techcitizen.it                    # Dominio principale
CLOUDFLARE_ZONE_ID=                      # Dashboard → Overview → Zone ID
CLOUDFLARE_API_TOKEN=                    # API Tokens → Create Token
CLOUDFLARE_ACCOUNT_EMAIL=                # Email account Cloudflare
```

**API Token Permissions richieste:**

- Zone → DNS → Edit
- Zone → Zone → Read
- Zone → Zone Settings → Read

**Come creare API Token:**

1. Cloudflare Dashboard → My Profile → API Tokens
2. Create Token → Edit zone DNS (template)
3. Permissions:
   - Zone / DNS / Edit
   - Zone / Zone / Read
4. Zone Resources: Include / Specific zone / techcitizen.it
5. Continue to summary → Create Token
6. COPIA TOKEN (mostrato solo una volta!)

---

## 3. DNS Records da Configurare

### Proposta Struttura Enterprise

```bash
# A. Gateway API (backend)
api.techcitizen.it         → HETZNER_IP (Proxied)
gateway.techcitizen.it     → HETZNER_IP (Proxied)

# B. Frontend Apps
app.techcitizen.it         → HETZNER_IP (Proxied)
www.techcitizen.it         → CNAME → app.techcitizen.it

# C. Servizi Amministrativi
admin.techcitizen.it       → HETZNER_IP (Proxied)
dashboard.techcitizen.it   → HETZNER_IP (Proxied)

# D. Monitoring (accesso limitato)
grafana.techcitizen.it     → HETZNER_IP (Proxied, Cloudflare Access?)
prometheus.techcitizen.it  → HETZNER_IP (Proxied, IP whitelist)

# E. Staging/Dev (opzionale)
staging.techcitizen.it     → STAGING_IP (Proxied)
dev.techcitizen.it         → DEV_IP (Proxied)

# F. Status Page
status.techcitizen.it      → Statuspage.io / Uptime Robot

# G. Docs
docs.techcitizen.it        → GitHub Pages / Vercel
```

**DNS Record Settings:**

- Type: A
- Name: api (per api.techcitizen.it)
- IPv4: HETZNER_IP
- Proxy status: Proxied (arancione)
- TTL: Auto

---

## 4. Secrets da Generare

```bash
# Genera localmente con OpenSSL:

# JWT Secret (256 bit)
openssl rand -hex 32
# Output: JWT_SECRET=...

# Session Secret (256 bit)
openssl rand -hex 32
# Output: SESSION_SECRET=...

# Redis Password
openssl rand -base64 32
# Output: REDIS_PASSWORD=...

# RabbitMQ Password
openssl rand -base64 24
# Output: RABBITMQ_PASSWORD=...

# Database Password (futuro)
openssl rand -base64 32
# Output: DATABASE_PASSWORD=...
```

**Salva in file locale `secrets.env` (NON committare!):**

```bash
# secrets.env (git-ignored)
JWT_SECRET=<generated-hex>
SESSION_SECRET=<generated-hex>
REDIS_PASSWORD=<generated-base64>
RABBITMQ_USER=gateway_user
RABBITMQ_PASSWORD=<generated-base64>
```

---

## 5. SSH Key Deployment

```bash
# Genera chiave dedicata per deploy

ssh-keygen -t ed25519 -f ~/.ssh/hetzner_deploy_key -C "deploy@techcitizen"

# Copia chiave pubblica sul server
ssh-copy-id -i ~/.ssh/hetzner_deploy_key.pub root@HETZNER_IP

# Test accesso
ssh -i ~/.ssh/hetzner_deploy_key root@HETZNER_IP
```

**Aggiorna `ansible/inventory/hosts.ini`:**

```ini
[production]
gateway-prod ansible_host=HETZNER_IP ansible_user=root ansible_port=22

[production:vars]
ansible_python_interpreter=/usr/bin/python3
ansible_ssh_private_key_file=~/.ssh/hetzner_deploy_key
```

---

## 6. Cloudflare Security Settings

### SSL/TLS

- Encryption mode: **Full (strict)**
- Minimum TLS Version: **1.2**
- TLS 1.3: **Enabled**
- Automatic HTTPS Rewrites: **On**
- HSTS: **Enabled** (max-age=31536000, includeSubDomains, preload)

### Firewall Rules

```
Expression: (http.host eq "api.techcitizen.it" and not cf.client.bot)
Action: Allow

Expression: (http.host eq "prometheus.techcitizen.it" and ip.src ne YOUR_OFFICE_IP)
Action: Block
```

### WAF (Web Application Firewall)

- OWASP Core Ruleset: **Enabled**
- Managed Challenge for threats: **Enabled**

### Rate Limiting

```
Rule: Login Protection
  If: (http.request.uri.path contains "/api/login")
  Then: Rate limit (10 requests per minute per IP)
```

---

## 7. File da Aggiornare

### `ansible/inventory/hosts.ini`

```ini
[production]
gateway-prod ansible_host=YOUR_HETZNER_IP ansible_user=root ansible_port=22

[all:vars]
domain=techcitizen.it
cloudflare_zone_id=YOUR_ZONE_ID
cloudflare_api_token=YOUR_API_TOKEN
```

### `ansible/playbooks/templates/env.production.j2`

Aggiungi secrets generati (usa Ansible Vault per protezione):

```bash
# Cripta secrets con Ansible Vault
ansible-vault create ansible/secrets.yml

# Contenuto secrets.yml:
vault_jwt_secret: <generated-hex>
vault_session_secret: <generated-hex>
vault_redis_password: <generated-base64>
```

---

## 8. Pre-Production Checklist

- [ ] Hetzner server IP ottenuto
- [ ] SSH root access verificato
- [ ] Cloudflare Zone ID copiato
- [ ] Cloudflare API Token creato con permessi corretti
- [ ] DNS records configurati (api, gateway, app)
- [ ] Secrets generati e salvati in `secrets.env`
- [ ] SSH key deploy generata e copiata su server
- [ ] `ansible/inventory/hosts.ini` aggiornato
- [ ] Cloudflare SSL mode = Full (strict)
- [ ] Cloudflare WAF abilitato
- [ ] Backup strategy documentata

---

## 9. Comandi da Eseguire (in ordine)

```bash
# 1. Test connessione
npm run ansible production ping

# 2. Discovery OBBLIGATORIO
npm run ansible:prod:discovery
# Salva output in docs/production-discovery-YYYY-MM-DD.txt

# 3. Backup manuale
ssh root@HETZNER_IP "tar czf /root/pre-ansible-backup-$(date +%F).tar.gz /etc /home /opt /srv"

# 4. Security baseline
npm run ansible:prod:security

# 5. Verifica audit
npm run ansible:prod:audit

# 6. Deploy gateway
npm run ansible:prod:deploy

# 7. Verifica health
curl https://api.techcitizen.it/health
```

---

## 10. Rollback Plan

Se qualcosa va male:

```bash
# Stop servizi
docker compose -f docker-compose.production.yml down

# Ripristina backup
ssh root@HETZNER_IP "tar xzf /root/pre-ansible-backup-*.tar.gz -C /"

# Restart SSH (se configurazione cambiata)
ssh root@HETZNER_IP "systemctl restart sshd"
```

---

**Next Action:** Compila questo checklist e procedi con production setup!
