# Sicurezza Server Hetzner + Cloudflare: Guida Completa

Questa guida copre le configurazioni di sicurezza essenziali per un setup con server Hetzner e DNS/CDN Cloudflare, più alcuni tool open source per documentare la tua infrastruttura.

---

## Parte 1: Sicurezza Server Hetzner

### 1.1 Accesso SSH

La porta 22 è la più attaccata al mondo. Blindala subito.

**Disabilita login root e password:**

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
MaxAuthTries 3
LoginGraceTime 30
AllowUsers tuoutente
```

**Cambia la porta SSH (opzionale ma utile):**

```bash
Port 2222  # scegli una porta alta non standard
```

Dopo le modifiche: `sudo systemctl restart sshd`

**Importante:** testa la connessione in una nuova sessione PRIMA di chiudere quella attuale!

### 1.2 Firewall con UFW

UFW è il firewall più semplice da gestire su Ubuntu/Debian.

```bash
# Installa e configura
sudo apt install ufw

# Policy di default: blocca tutto in ingresso
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Apri solo quello che serve
sudo ufw allow 2222/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Abilita
sudo ufw enable
sudo ufw status verbose
```

### 1.3 Fail2Ban contro brute force

Fail2Ban banna automaticamente gli IP che tentano troppi login falliti.

```bash
sudo apt install fail2ban

# Crea configurazione locale
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

Modifica `/etc/fail2ban/jail.local`:

```ini
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 3

[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 24h
```

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo fail2ban-client status sshd  # verifica
```

### 1.4 Aggiornamenti automatici di sicurezza

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

Verifica `/etc/apt/apt.conf.d/50unattended-upgrades` e assicurati che le security updates siano abilitate.

### 1.5 Utente non-root per i servizi

Mai eseguire applicazioni come root. Crea utenti dedicati:

```bash
# Utente per la tua applicazione
sudo useradd -r -s /bin/false appuser

# I servizi girano come questo utente
# Nel systemd service file:
# User=appuser
# Group=appuser
```

### 1.6 Hardening del kernel (sysctl)

Aggiungi a `/etc/sysctl.d/99-security.conf`:

```bash
# Ignora ICMP redirect
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Non inviare ICMP redirect
net.ipv4.conf.all.send_redirects = 0

# Protezione SYN flood
net.ipv4.tcp_syncookies = 1

# Ignora ping broadcast
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Log pacchetti marziani
net.ipv4.conf.all.log_martians = 1
```

Applica: `sudo sysctl -p /etc/sysctl.d/99-security.conf`

---

## Parte 2: Sicurezza Cloudflare

### 2.1 Modalità SSL/TLS

Vai su **SSL/TLS → Overview** e imposta **Full (strict)**.

Questo significa che Cloudflare verifica il certificato del tuo server. Richiede un certificato valido su Hetzner (Let's Encrypt va benissimo).

```
Browser ←──HTTPS──→ Cloudflare ←──HTTPS──→ Tuo Server
            ✓ cifrato              ✓ cifrato + verificato
```

**Mai usare "Flexible"** perché lascia il traffico Cloudflare→Server in chiaro.

### 2.2 Certificato Origin su Hetzner

Cloudflare può generare un certificato per la comunicazione Cloudflare→Server:

1. **SSL/TLS → Origin Server → Create Certificate**
2. Genera certificato (validità 15 anni)
3. Copia cert e key sul server
4. Configura il tuo webserver per usarli

Questo è più semplice di Let's Encrypt se il traffico passa sempre da Cloudflare.

### 2.3 Always Use HTTPS

**SSL/TLS → Edge Certificates → Always Use HTTPS → On**

Redirect automatico da HTTP a HTTPS.

### 2.4 HSTS (HTTP Strict Transport Security)

**SSL/TLS → Edge Certificates → HTTP Strict Transport Security → Enable**

Configurazione consigliata:

- Max Age: 12 mesi
- Include subdomains: Sì (se li usi tutti via HTTPS)
- Preload: Sì (dopo aver testato tutto)

**Attenzione:** una volta attivato HSTS con preload, tornare indietro è complesso. Testa prima.

### 2.5 Minimum TLS Version

**SSL/TLS → Edge Certificates → Minimum TLS Version → TLS 1.2**

TLS 1.0 e 1.1 sono deprecati e insicuri.

### 2.6 Firewall Cloudflare (WAF)

**Security → WAF → Managed Rules**

Attiva almeno:

- Cloudflare Managed Ruleset
- OWASP Core Ruleset

Per API, potresti dover creare eccezioni per evitare falsi positivi sui payload JSON.

### 2.7 Rate Limiting

**Security → WAF → Rate limiting rules**

Esempio per proteggere il login:

```
Se URI contiene "/login" o "/api/auth"
E richieste > 10 per minuto dallo stesso IP
Allora Block per 1 ora
```

### 2.8 Bot Protection

**Security → Bots → Bot Fight Mode → On**

Per il piano gratuito attiva almeno questo. I piani a pagamento hanno Super Bot Fight Mode con più controllo.

### 2.9 Nascondi l'IP reale del server

Questo è cruciale: se qualcuno scopre l'IP Hetzner, può bypassare Cloudflare.

**Verifica che l'IP non sia esposto:**

- Controlla i record DNS: solo i record proxied (nuvola arancione) nascondono l'IP
- Non usare l'IP diretto in email, header, o codice client-side
- Considera un firewall su Hetzner che accetta solo IP Cloudflare

**Firewall che accetta solo Cloudflare:**

```bash
# Scarica IP range Cloudflare
curl -s https://www.cloudflare.com/ips-v4 -o /tmp/cf-ips-v4.txt

# Blocca tutto tranne Cloudflare sulla porta 443
sudo ufw delete allow 443/tcp
for ip in $(cat /tmp/cf-ips-v4.txt); do
  sudo ufw allow from $ip to any port 443 proto tcp comment 'Cloudflare'
done
```

### 2.10 Page Rules utili (piano gratuito: 3 regole)

1. **Forza HTTPS ovunque:** `http://*tuodominio.com/*` → Always Use HTTPS
2. **Cache aggressiva per static:** `*tuodominio.com/static/*` → Cache Level: Cache Everything, Edge TTL: 1 month
3. **Bypass cache per API:** `*tuodominio.com/api/*` → Cache Level: Bypass

---

## Parte 3: Checklist Rapida

### Server Hetzner

- [ ] SSH: disabilitato root login
- [ ] SSH: disabilitata password authentication
- [ ] SSH: porta cambiata (opzionale)
- [ ] Firewall UFW attivo e configurato
- [ ] Fail2Ban installato e attivo
- [ ] Aggiornamenti automatici di sicurezza
- [ ] Servizi eseguiti come utenti non-root
- [ ] Certificato SSL installato (Let's Encrypt o Cloudflare Origin)

### Cloudflare

- [ ] SSL mode: Full (strict)
- [ ] Always Use HTTPS: On
- [ ] Minimum TLS: 1.2
- [ ] HSTS: abilitato
- [ ] WAF Managed Rules: attive
- [ ] Bot Fight Mode: On
- [ ] Rate limiting su endpoint sensibili
- [ ] Tutti i record DNS sono "proxied" (nuvola arancione)
- [ ] IP server non esposto pubblicamente

---

## Parte 4: Tool per Documentare Infrastruttura

Esistono diverse soluzioni open source per tenere traccia di server, domini, configurazioni e asset IT.

### 4.1 NetBox (Consigliato)

**Cos'è:** Il gold standard per documentazione infrastruttura. Usato da grandi aziende.

**Cosa traccia:**

- Server (fisici e virtuali)
- IP addressing e DNS
- Rack, datacenter, sedi
- Circuiti e connessioni
- Contatti e fornitori

**Pro:** Completo, API REST, integrazioni Ansible/Terraform, attivamente sviluppato.
**Contro:** Richiede PostgreSQL e Redis, curva di apprendimento.

```bash
# Deploy con Docker
git clone https://github.com/netbox-community/netbox-docker.git
cd netbox-docker
docker compose up -d
```

**Link:** <https://github.com/netbox-community/netbox>

### 4.2 Ralph

**Cos'è:** Asset management per datacenter, sviluppato da Allegro.

**Cosa traccia:**

- Hardware assets
- Licenze software
- Domini e certificati
- Data center e rack

**Pro:** UI moderna, buon supporto domini/certificati, CMDB integrato.
**Contro:** Meno diffuso di NetBox.

**Link:** <https://github.com/allegro/ralph>

### 4.3 Snipe-IT

**Cos'è:** IT asset management, ottimo per hardware e licenze.

**Cosa traccia:**

- Hardware (laptop, server, dispositivi)
- Licenze software
- Accessori e consumabili
- Assegnazioni a utenti

**Pro:** Semplicissimo, UI intuitiva, mobile friendly.
**Contro:** Meno adatto a infrastruttura complessa (no IPAM nativo).

```bash
# Deploy con Docker
docker run -d \
  -p 8080:80 \
  -e APP_KEY=base64:yourkey \
  snipe/snipe-it
```

**Link:** <https://github.com/snipe/snipe-it>

### 4.4 IT-Tools (per utility veloci)

**Cos'è:** Raccolta di tool web per sviluppatori e sysadmin.

**Cosa fa:**

- Generatori (UUID, password, hash)
- Convertitori (JSON, YAML, Base64)
- Network tools (IP info, DNS lookup)
- Crypto tools (JWT decoder, certificati)

Non è per documentare, ma è utilissimo da self-hostare per il team.

```bash
docker run -d -p 8080:80 corentinth/it-tools
```

**Link:** <https://github.com/CorentinTh/it-tools>

### 4.5 Approccio "Docs as Code" (Alternativa Leggera)

Se preferisci qualcosa di più semplice, puoi usare Git + Markdown:

```
infrastructure/
├── servers/
│   ├── prod-web-01.md
│   └── prod-db-01.md
├── domains/
│   ├── tuodominio.com.md
│   └── altrodominio.it.md
├── cloudflare/
│   └── settings.md
└── credentials/
    └── README.md  # (link a password manager, mai password in chiaro!)
```

**Template per un server:**

```markdown
# prod-web-01

## Info Base

- **Provider:** Hetzner
- **IP:** 10.0.0.1 (privato) / nascosto da Cloudflare
- **Hostname:** prod-web-01.internal
- **OS:** Ubuntu 24.04 LTS
- **Specs:** CX31 (4 vCPU, 8GB RAM, 160GB SSD)

## Servizi

- Docker Engine 26.x
- Caddy 2.x (reverse proxy)
- App Gateway (porta 3042)

## Accesso

- SSH porta 2222
- Utenti autorizzati: antonio, deploy-ci
- Chiavi in: 1Password vault "Infrastructure"

## Backup

- Hetzner Backup: giornaliero, retention 7 giorni
- Config backup: Git repo infrastructure-config

## Note

- Creato: 2024-01-15
- Ultimo hardening: 2024-06-01
```

**Pro:** Zero dipendenze, versionato, funziona con qualsiasi editor.
**Contro:** Niente UI, niente automazioni, gestione manuale.

---

## Raccomandazione Finale

Per una piccola azienda che sta iniziando:

1. **Parti con Git + Markdown** per documentare tutto subito, senza setup
2. **Quando cresci**, migra a **NetBox** se hai infrastruttura complessa, o **Snipe-IT** se ti interessa di più l'asset tracking

La cosa importante è **iniziare a documentare adesso**, anche in modo semplice. Un file Markdown aggiornato è infinitamente meglio di un sistema sofisticato mai popolato.

---

_Ultimo aggiornamento: Dicembre 2024_
