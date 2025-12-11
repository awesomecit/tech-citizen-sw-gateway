# Come Recuperare Cloudflare Zone ID e API Token

## Opzione 1: Non Usi Cloudflare (Semplice)

Se **non usi Cloudflare** per DNS/proxy, puoi **rimuovere** queste variabili dall'inventory.

```bash
# Commenta o rimuovi nel file hosts.ini
# cloudflare_zone_id=...
# cloudflare_api_token=...
```

I playbook Ansible controlleranno e **skipperanno** automaticamente la configurazione Cloudflare.

---

## Opzione 2: Usi Cloudflare (Configurazione Necessaria)

### Step 1: Ottieni Zone ID

1. Vai su [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Seleziona il tuo dominio
3. Scroll in basso nella pagina Overview → **API** section (colonna destra)
4. Copia **Zone ID** (esempio: `abc123def456...`)

**Screenshot riferimento**:

```
Overview
├── Zone ID: abc123def456ghi789jkl012mno345pqr  ← QUESTO
└── Account ID: xyz789...
```

### Step 2: Crea API Token

1. Vai su [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Usa template **Edit zone DNS** OPPURE crea custom con:
   - **Permissions**:
     - Zone → DNS → Edit
     - Zone → Zone Settings → Read
   - **Zone Resources**:
     - Include → Specific zone → `<il-tuo-dominio>`
4. Click **Continue to summary** → **Create Token**
5. **COPIA IL TOKEN** (mostrato solo una volta!)

**Esempio token**: `abcdefGHIJKL123456789_MNOPqrstuv`

### Step 3: Testa API Token

```bash
# Testa che funzioni
ZONE_ID="<il_tuo_zone_id>"
API_TOKEN="<il_tuo_api_token>"

curl -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" | jq .success
```

**Expected**: `true`

### Step 4: Aggiorna Inventory

```ini
[all:vars]
domain=il-tuo-dominio.com
cloudflare_zone_id=abc123def456ghi789jkl012mno345pqr
cloudflare_api_token=abcdefGHIJKL123456789_MNOPqrstuv
```

---

## Opzione 3: DNS Manuale (Senza Cloudflare API)

Se usi Cloudflare ma **non vuoi dare API access** ai playbook:

1. **Commenta** le variabili Cloudflare nell'inventory
2. **Configura DNS manualmente** nel dashboard:

```
Type    Name    Content              TTL     Proxy
A       @       46.224.61.146       Auto    Yes (orange cloud)
A       www     46.224.61.146       Auto    Yes (orange cloud)
AAAA    @       <IPv6_se_hai>       Auto    Yes
```

3. Ansible skipperà la configurazione DNS automatica

---

## Cosa Fa Ansible con Cloudflare?

Se configuri Zone ID + API Token, Ansible:

- ✅ Crea/aggiorna record DNS A per il dominio
- ✅ Configura proxy Cloudflare (orange cloud)
- ✅ Abilita HTTPS automatico
- ✅ Configura page rules (opzionale)

Se **non** configuri, Ansible:

- ⏭️ Skippa configurazione Cloudflare
- ℹ️ Dovrai configurare DNS manualmente
- ⚠️ Assicurati che il dominio punti al server: `46.224.61.146`

---

## Verifica DNS Attuale

```bash
# Controlla dove punta il tuo dominio ora
dig +short <il-tuo-dominio>

# Dovrebbe rispondere con l'IP del server
# Se non risponde o è diverso → configura DNS
```

---

## Raccomandazione

**Per ora**: Commenta Cloudflare nell'inventory, configura DNS manualmente.

**Dopo il deploy**: Aggiungi Cloudflare API per automazione futura.

```ini
[all:vars]
domain=il-tuo-vero-dominio.com
# Cloudflare (opzionale - configura DNS manualmente se commentato)
# cloudflare_zone_id=ZONA_ID_QUI
# cloudflare_api_token=API_TOKEN_QUI
```
