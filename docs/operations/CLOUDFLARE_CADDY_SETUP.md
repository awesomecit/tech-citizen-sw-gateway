# Cloudflare + Caddy + Let's Encrypt Setup Guide

> **Last Updated**: 2025-12-11  
> **Domain**: tech-citizen.me  
> **Target**: Multi-app architecture con SSL automatico

---

## 🏗️ Architettura Multi-App

### Strategia Subdomain (Scalabile per future apps)

```
tech-citizen.me
├─ gateway.tech-citizen.me       → API Gateway (questo progetto)
├─ auth.tech-citizen.me          → Keycloak (condiviso)
├─ grafana.tech-citizen.me       → Monitoring dashboard
├─ app1.tech-citizen.me          → Futura app dentista
├─ app2.tech-citizen.me          → Futura app clinica
└─ staging.tech-citizen.me       → Staging multi-app
   ├─ gateway.staging.tech-citizen.me
   ├─ auth.staging.tech-citizen.me
   └─ grafana.staging.tech-citizen.me
```

**Vantaggi**:

- ✅ Isolamento tra apps (security)
- ✅ Deploy indipendenti per app
- ✅ SSL separato per ogni subdomain
- ✅ Scaling orizzontale facile

---

## 🔧 Note Tecniche

### Jest Coverage Configuration Fix (Dec 2025)

Il coverage era configurato con path errati (`src/**/*.ts`) che non corrispondevano alla struttura workspace.

**Fix applicato** (`jest.config.cjs`):

```javascript
collectCoverageFrom: [
  'packages/*/src/**/*.ts',  // ✅ Workspace-aware paths
  'services/*/src/**/*.ts',
  '!**/*.spec.ts',
  '!**/*.test.ts',
  '!packages/test-helpers/src/**',  // Escludi utilities
  '!packages/auth/src/session-manager.ts',  // Integration-only
],
```

**Risultati attuali** (baseline Dic 2025):

- **Global**: 62% statements, 27% branches, 56% functions
- **Auth package**: 79% statements, 37% branches, 88% functions

**Soglie configurate**: Focus su packages implementati, no global threshold (previene false positive su services non testati).

---

## 📋 Setup Completo

### Fase 1: Configurazione Cloudflare DNS ✅

**Accedi a Cloudflare Dashboard**:

1. Login su [dash.cloudflare.com](https://dash.cloudflare.com)
2. Seleziona dominio `tech-citizen.me`
3. Vai a **DNS** → **Manage DNS Records**

**Aggiungi record per staging**:

| Type | Name            | Content      | Proxy Status | TTL  |
| ---- | --------------- | ------------ | ------------ | ---- |
| A    | staging         | `HETZNER_IP` | ☁️ DNS only  | Auto |
| A    | gateway.staging | `HETZNER_IP` | ☁️ DNS only  | Auto |
| A    | grafana.staging | `HETZNER_IP` | ☁️ DNS only  | Auto |
| A    | auth.staging    | `HETZNER_IP` | ☁️ DNS only  | Auto |

**⚠️ CRITICO: Proxy Status = "DNS only" (grigio)**

- Click sull'icona ☁️ arancione (Proxied) per disattivarla
- Deve diventare grigia ☁️ con scritta "DNS only"
- **Se rimane arancione, Let's Encrypt non funzionerà**

#### Perché disattivare il Proxy Cloudflare?

```
❌ Proxy ON (arancione - NON FUNZIONA):
Client → Cloudflare (SSL termination) → Caddy (HTTP?)
         ↑
         Cloudflare gestisce certificato
         Let's Encrypt non può verificare ownership del dominio

✅ Proxy OFF (grigio - CORRETTO):
Client → Caddy (SSL termination con Let's Encrypt)
         ↑
         Caddy richiede certificato direttamente
         Let's Encrypt verifica ownership via HTTP challenge (porta 80)
```

---

### Fase 2: Verifica DNS Propagazione ⏱️

**Comandi da eseguire localmente** (prima del deploy):

```bash
# Test che DNS punti al server Hetzner
dig staging.tech-citizen.me +short
# Output atteso: <HETZNER_IP> (es: 95.217.123.45)

dig gateway.staging.tech-citizen.me +short
# Output atteso: <HETZNER_IP>

# Verifica che NON ci sia proxy Cloudflare
dig staging.tech-citizen.me +short | grep -E "104\.|172\.6"
# Output atteso: NESSUN RISULTATO (altrimenti proxy è ancora ON)

# Test propagazione globale (Google DNS)
nslookup staging.tech-citizen.me 8.8.8.8
```

**Tempo propagazione**: 5-10 minuti (max 48h per DNS globali)

---

### Fase 3: Configurazione Caddy su Server 🎯

**File**: `/etc/caddy/Caddyfile`

```caddyfile
# Global options
{
    email awesome.cit.dev@gmail.com  # Email per notifiche Let's Encrypt
    acme_ca https://acme-v02.api.letsencrypt.org/directory
}

# Gateway API
gateway.staging.tech-citizen.me {
    reverse_proxy localhost:3042  # Platformatic Watt port

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000;"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
    }

    # Access logs
    log {
        output file /var/log/caddy/gateway.log
        format json
    }
}

# Grafana Monitoring Dashboard
grafana.staging.tech-citizen.me {
    reverse_proxy localhost:3001  # Grafana container port

    log {
        output file /var/log/caddy/grafana.log
        format json
    }
}

# Keycloak Authentication
auth.staging.tech-citizen.me {
    reverse_proxy localhost:8090  # Keycloak port

    log {
        output file /var/log/caddy/auth.log
        format json
    }
}

# Staging root (redirect to gateway)
staging.tech-citizen.me {
    redir https://gateway.staging.tech-citizen.me{uri} permanent
}
```

**Caddy gestisce automaticamente**:

- ✅ Richiesta certificato Let's Encrypt per ogni dominio
- ✅ HTTP → HTTPS redirect automatico
- ✅ Rinnovo automatico certificati (ogni 60 giorni)
- ✅ HTTP/2 e HTTP/3 (QUIC) abilitati
- ✅ OCSP stapling per performance

---

### Fase 4: Firewall Rules (Server Hetzner) 🔥

**Configurazione UFW** (Ubuntu Firewall):

```bash
# SSH - SEMPRE APERTA (altrimenti ti blocchi fuori!)
sudo ufw allow 22/tcp comment "SSH access"

# HTTP - Necessaria per Let's Encrypt challenge
sudo ufw allow 80/tcp comment "HTTP for ACME challenge"

# HTTPS - Traffico applicativo
sudo ufw allow 443/tcp comment "HTTPS traffic"

# HTTP/3 (QUIC) - Opzionale ma consigliato
sudo ufw allow 443/udp comment "HTTP/3 QUIC"

# Abilita firewall
sudo ufw enable

# Verifica regole attive
sudo ufw status numbered
```

**Output atteso**:

```
Status: active

     To                         Action      From
     --                         ------      ----
[ 1] 22/tcp                     ALLOW IN    Anywhere
[ 2] 80/tcp                     ALLOW IN    Anywhere
[ 3] 443/tcp                    ALLOW IN    Anywhere
[ 4] 443/udp                    ALLOW IN    Anywhere
```

**⚠️ IMPORTANTE**: **NON aprire porte applicative** (3042, 8090, 3001)

- Queste porte devono ascoltare solo su `localhost`
- Caddy fa reverse proxy da esterno → localhost
- Questo previene accesso diretto alle applicazioni

---

### Fase 5: Test Let's Encrypt Challenge 🧪

**Dopo deploy e avvio Caddy**:

#### 1. Verifica HTTP challenge (porta 80)

```bash
curl -v http://gateway.staging.tech-citizen.me/.well-known/acme-challenge/test

# Output atteso:
# < HTTP/1.1 404 Not Found  ← 404 è OK! L'importante è che risponda
# Se timeout o connection refused → problema firewall/DNS
```

#### 2. Verifica certificato SSL ottenuto

```bash
curl -vI https://gateway.staging.tech-citizen.me 2>&1 | grep "issuer"

# Output atteso:
# issuer: C=US; O=Let's Encrypt; CN=R3
```

#### 3. Test validità certificato

```bash
echo | openssl s_client -connect gateway.staging.tech-citizen.me:443 -servername gateway.staging.tech-citizen.me 2>/dev/null | openssl x509 -noout -dates

# Output atteso:
# notBefore=Dec 11 14:30:00 2025 GMT
# notAfter=Mar 11 14:30:00 2026 GMT  ← 90 giorni validità
```

#### 4. SSL Labs Test (opzionale ma consigliato)

Apri: `https://www.ssllabs.com/ssltest/analyze.html?d=gateway.staging.tech-citizen.me`

**Target**: Grade A o A+

---

### Fase 6: Troubleshooting Common Issues 🔧

#### ❌ Problema: Certificato non viene generato

**Check 1: DNS punta correttamente?**

```bash
dig gateway.staging.tech-citizen.me +short
# Deve mostrare HETZNER_IP, NON IP Cloudflare (104.x o 172.x)
```

**Check 2: Porta 80 raggiungibile da internet?**

```bash
telnet gateway.staging.tech-citizen.me 80
# Output atteso: Connected

# Se fallisce:
sudo ufw status | grep 80  # Firewall aperto?
sudo netstat -tlnp | grep :80  # Caddy in ascolto?
```

**Check 3: Cloudflare Proxy disattivato?**

```bash
curl -I http://gateway.staging.tech-citizen.me | grep -i cloudflare
# NON deve apparire header "cf-ray" o "server: cloudflare"
```

**Check 4: Caddy logs errori ACME**

```bash
sudo journalctl -u caddy -n 100 --no-pager | grep -i acme

# Errori comuni:
# "challenge failed" → DNS non risolve o porta 80 bloccata
# "rate limit" → troppi tentativi, vedi sotto
# "unauthorized" → Cloudflare proxy ancora attivo
```

---

#### ❌ Problema: Rate limit Let's Encrypt

**Limiti produzione**:

- 50 certificati per dominio/settimana
- 5 fallimenti per account/hostname/ora

**Soluzione durante test**: Usa staging environment

```caddyfile
{
    email awesome.cit.dev@gmail.com
    # Staging endpoint per test (certificati non validi ma illimitati)
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}
```

**Dopo test OK**: Rimuovi riga `acme_ca` per usare production

---

#### ❌ Problema: Certificato scaduto o auto-firmato

**Caddy non ha rinnovato automaticamente?**

```bash
# Forza rinnovo manuale
sudo caddy reload --config /etc/caddy/Caddyfile

# Verifica timer systemd (rinnovo automatico)
sudo systemctl list-timers caddy

# Se timer manca, crealo
sudo systemctl enable --now caddy
```

---

### Fase 7: Cloudflare Settings Opzionali ⚙️

**Questi settings sono opzionali e da fare DOPO che tutto funziona**

#### Se vuoi riattivare Cloudflare Proxy (DDoS protection + CDN)

**Prerequisiti**:

- Certificato Let's Encrypt funzionante
- Gateway risponde correttamente su HTTPS

**Cloudflare SSL/TLS Mode**: Full (Strict)

```
Cloudflare → Server: encrypted + certificato valido richiesto
```

1. Vai su **SSL/TLS** → **Overview**
2. Seleziona: **Full (Strict)**
3. Salva

**Cloudflare Page Rules** (per API senza cache):

```
Rule 1: gateway.staging.tech-citizen.me/*
- SSL: Full (Strict)
- Cache Level: Bypass
- Browser Cache TTL: Respect Existing Headers

Rule 2: grafana.staging.tech-citizen.me/*
- SSL: Full (Strict)
- Cache Level: Bypass
```

**Cloudflare Firewall Rules**:

```
Rule: Blocca paesi indesiderati
- Expression: ip.geoip.country in {"CN" "RU"}
- Action: Block

Rule: Rate limiting API
- Expression: http.request.uri.path contains "/api/"
- Rate: 100 requests per minute per IP
```

**⚠️ Ma per ora**: Lascia tutto disattivato, parti semplice con "DNS only"!

---

## 📝 Checklist Pre-Deploy Completa

### Cloudflare

- [ ] Record A per `staging.tech-citizen.me` (Proxy OFF)
- [ ] Record A per `gateway.staging.tech-citizen.me` (Proxy OFF)
- [ ] Record A per `grafana.staging.tech-citizen.me` (Proxy OFF)
- [ ] Record A per `auth.staging.tech-citizen.me` (Proxy OFF)
- [ ] Verifica con `dig` che DNS propagato e punta a Hetzner IP

### Server Hetzner

- [ ] SSH configurato (`~/.ssh/config`)
- [ ] Firewall UFW: porte 22, 80, 443 aperte
- [ ] Docker installato (`docker --version`)
- [ ] Docker Compose installato (`docker compose version`)
- [ ] Caddy installato (`caddy version`)

### Configurazione Caddy

- [ ] `/etc/caddy/Caddyfile` creato
- [ ] Email configurata: `awesome.cit.dev@gmail.com`
- [ ] Reverse proxy per gateway (porta 3042)
- [ ] Reverse proxy per Grafana (porta 3001)
- [ ] Reverse proxy per Keycloak (porta 8090)
- [ ] Logs directory: `/var/log/caddy/` creata

### Test Finali

- [ ] `curl http://gateway.staging.tech-citizen.me` → redirect HTTPS
- [ ] `curl https://gateway.staging.tech-citizen.me/health` → 200 OK
- [ ] Certificato valido (Let's Encrypt R3)
- [ ] Grafana dashboard accessibile su `https://grafana.staging.tech-citizen.me`
- [ ] Keycloak login su `https://auth.staging.tech-citizen.me`

---

## 🚀 Ansible Deploy Command

**Dopo setup completo**:

```bash
# Deploy gateway su staging con Ansible
ansible-playbook \
  -i ansible/inventory/hosts.ini \
  ansible/playbooks/deploy-gateway.yml \
  --extra-vars "environment=staging domain=tech-citizen.me"

# Verifica deployment
curl -sf https://gateway.staging.tech-citizen.me/health | jq
```

---

## 📚 Riferimenti

- [Cloudflare DNS Setup](https://developers.cloudflare.com/dns/)
- [Caddy Automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)
- [Let's Encrypt Staging Environment](https://letsencrypt.org/docs/staging-environment/)

---

## 🔄 Maintenance

### Verifica stato certificati

```bash
# Lista certificati Caddy
sudo caddy list-certificates

# Forza rinnovo (se scadenza < 30 giorni)
sudo caddy reload --config /etc/caddy/Caddyfile
```

### Monitoring certificati

```bash
# Aggiungi a crontab per alert email
0 0 * * * /usr/local/bin/check-ssl-expiry.sh
```

**Script**: `scripts/check-ssl-expiry.sh`

```bash
#!/bin/bash
DOMAINS=(
  "gateway.staging.tech-citizen.me"
  "grafana.staging.tech-citizen.me"
  "auth.staging.tech-citizen.me"
)

for domain in "${DOMAINS[@]}"; do
  expiry=$(echo | openssl s_client -connect $domain:443 -servername $domain 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
  expiry_epoch=$(date -d "$expiry" +%s)
  now_epoch=$(date +%s)
  days_left=$(( ($expiry_epoch - $now_epoch) / 86400 ))

  if [ $days_left -lt 7 ]; then
    echo "⚠️  WARNING: $domain expires in $days_left days!"
  fi
done
```

---

_Documento aggiornato: 2025-12-11_  
_Owner: Antonio Cittadino_
