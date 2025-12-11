# Ideas Backlog - Dicembre 2025

> Raccolte idee da sessione di brainstorming dell'11 dicembre 2025

---

## 🎯 Priorità Immediata (P0) - Entro 1 settimana

### 1. Features Tree UI - Interactive Documentation ⭐⭐⭐⭐

**Problema**: Consultants/stakeholders non hanno visibilità su feature implementate e BDD scenarios

**Soluzione proposta**:

```bash
# Esporre interfaccia web interattiva
npm run features:serve
# → http://localhost:3000/features

# Features tree con:
# - Epic/User Story hierarchy
# - BDD scenarios linkati
# - Test status (passing/failing/pending)
# - Coverage per feature
# - Interactive test runner
```

**UI Components**:

```
┌─ Features Dashboard ──────────────────────────┐
│                                               │
│ Epic 1: Infrastructure Foundation [90%]      │
│ ├─ US-001: Docker Setup [✓ DONE]             │
│ │  ├─ BDD: docker-startup.feature:12         │
│ │  └─ Tests: 5/5 passing                     │
│ │                                             │
│ ├─ US-002: Redis Integration [✓ DONE]        │
│ │  ├─ BDD: redis-connection.feature:8        │
│ │  └─ Tests: 8/8 passing                     │
│ │                                             │
│ └─ US-003: Keycloak Setup [🔄 IN PROGRESS]   │
│    ├─ BDD: auth-keycloak.feature:15          │
│    └─ Tests: 12/15 passing                   │
│                                               │
│ [Run Selected Tests] [Export Report]         │
└───────────────────────────────────────────────┘
```

**Tech Stack**:

- **Backend**: Fastify plugin `/api/features` che legge `features.json`
- **Frontend**: Semplice SPA (Vanilla JS o Vue.js lightweight)
- **Deployment**: Static files in `public/features/`
- **Auth**: Basic auth per consultants (opzionale)

**Acceptance Criteria**:

- [ ] Endpoint `/api/features` espone features.json con enrichment
- [ ] UI mostra epic/story/task hierarchy (tree collapsible)
- [ ] Click su feature mostra BDD scenarios linkati (gherkin syntax highlighted)
- [ ] Badge status per ogni feature (done/in-progress/todo)
- [ ] Search/filter per epic, story, tag
- [ ] Export PDF/HTML report per consultants
- [ ] Test runner integrato (run single scenario via API)
- [ ] Real-time test status via WebSocket (opzionale)

**Epic**: Epic 7 - Developer Experience  
**Story**: US-TBD - Interactive Features Documentation  
**Effort**: 5 giorni

**Priorità deployment**: 🎯 PRIMO CHECK dopo deploy Hetzner

- Validator che features.json sia accessibile
- Smoke test su `/features` endpoint
- Screenshot dashboard per demo consultants

---

### 2. Environment Configuration System ⭐⭐⭐

**Problema**: Configurazioni hardcoded, nessuna validazione centralized

**Soluzione proposta**:

```bash
npm run env:set local development
npm run env:set local testing
npm run env:set local staging "dentista.locale"
```

**Acceptance Criteria**:

- [ ] Scan di tutti script/docker-compose per valori hardcoded
- [ ] Sistema di validazione: `ENV || JSON config || NO DEFAULT → ERROR`
- [ ] Fallback chain per ogni variabile: `process.env.X || config.X || throw`
- [ ] Log strutturato di configurazione caricata all'avvio
- [ ] File `.env.example` aggiornato con tutte le variabili

**File interessati**:

- `scripts/*.sh` - bash scripts
- `infrastructure/*/docker-compose*.yml` - Docker stacks
- `packages/*/src/index.ts` - package entry points
- `services/*/src/index.ts` - service entry points

**Epic**: Epic 1 - Infrastructure Foundation  
**Story**: US-TBD - Environment Configuration Management  
**Effort**: 3 giorni

---

### 2. Conventional Commit Scope Management ⭐⭐

**Problema**: Scope non validati nei commit (feat|fix|docs(scope): message)

**Soluzione proposta**:

```bash
# File .commitlint-scopes.json
{
  "scopes": ["gateway", "auth", "cache", "telemetry", "events", "infra", "test", "docs"]
}

# Aggiornare commitlint.config.cjs per validare contro questo file
```

**Acceptance Criteria**:

- [ ] File `.commitlint-scopes.json` con scope validati
- [ ] Script `npm run commit:scopes` per aggiornare lista
- [ ] Hook pre-commit che valida scope contro whitelist
- [ ] Documentazione in CONTRIBUTING.md

**Epic**: Epic 7 - Developer Experience  
**Story**: US-TBD - Commit Scope Validation  
**Effort**: 1 giorno

---

## 🚀 Priorità Alta (P1) - Entro 2 settimane

### 3. BDD Scenario Linking in features.json ⭐⭐⭐

**Problema**: User stories non linkate ai file .feature BDD

**Soluzione proposta**:

```json
{
  "userStories": {
    "US-043": {
      "bddScenarios": [
        "e2e/features/auth-jwt-validation.feature:15",
        "e2e/features/auth-keycloak-integration.feature:8"
      ]
    }
  }
}
```

**Acceptance Criteria**:

- [ ] Schema JSON aggiornato con campo `bddScenarios`
- [ ] Script che esegue grep per trovare `@US-XXX` nei .feature
- [ ] Validazione che ogni US abbia almeno 1 scenario BDD
- [ ] Aggiornamento automatico con `npm run features:update`

**Epic**: Epic 3 - Test Automation  
**Story**: US-TBD - BDD Traceability  
**Effort**: 2 giorni

---

### 4. Git Branch Context Validator ⭐⭐

**Problema**: Branch senza contesto (epic, story, acceptance criteria)

**Soluzione proposta**:

```bash
git checkout -b feature/US-043-prometheus-metrics
# Trigger script che chiede:
# - Epic reference
# - Story description
# - BDD scenarios
# - Acceptance criteria

# Se branch già esiste, analizza commit history con Claude API
```

**Acceptance Criteria**:

- [ ] Hook post-checkout che valida presenza metadati
- [ ] Script `scripts/branch-validator.sh` con chiamata Claude API
- [ ] Template `.github/BRANCH_TEMPLATE.md`
- [ ] Integrazione con copilot-instructions.md per context

**Epic**: Epic 7 - Developer Experience  
**Story**: US-TBD - Branch Metadata Validation  
**Effort**: 3 giorni  
**Blockers**: Necessita API key Claude e budget

---

## 📊 Priorità Media (P2) - Entro 1 mese

### 5. Repository Learning System (AI-Powered) ⭐⭐⭐

**Problema**: Conoscenza dispersa, onboarding lento

**Soluzione proposta**:

```bash
# Sistema che monitora:
# - Commit patterns
# - Code reviews
# - Issue resolution time
# - FAQ generate da domande ricorrenti

# Output:
# - Tutorial AI-powered personalizzati
# - Chatbot interno per FAQ
# - Suggerimenti context-aware
```

**Acceptance Criteria**:

- [ ] Script `scripts/repo-analyzer.js` per metrics extraction
- [ ] Database SQLite per storico apprendimento
- [ ] FAQ generator basato su git history + issues
- [ ] Chatbot interface (CLI o web)

**Epic**: Epic 7 - Developer Experience  
**Story**: US-TBD - AI-Powered Learning System  
**Effort**: 2 settimane  
**Rischi**: Scope creep, necessita LLM API costs

---

## 🧪 Priorità Bassa (P3) - Future

### 6. Coverage Report Fix

**Problema**: Jest coverage 0% perché cerca directory sbagliate

**Soluzione**:

```javascript
// jest.config.cjs
collectCoverageFrom: [
  'packages/*/src/**/*.ts',
  'services/*/src/**/*.ts',
  '!**/*.spec.ts',
  '!**/*.test.ts',
];
```

**Effort**: 1 ora

---

### 7. Full Stack Local Deployment Test

**Problema**: Non sappiamo se tutto funziona insieme (gateway + monitoring + services)

**Soluzione**:

```bash
docker compose -f docker-compose.yml \
               -f docker-compose.monitoring.yml \
               -f docker-compose.services.yml \
               up -d

# Smoke test di tutto lo stack
npm run test:stack:full
```

**Effort**: 4 ore

---

## 🌍 Deployment su Server Reale (P0 - PRIORITÀ MASSIMA)

### 8. Hetzner Staging Deployment ⭐⭐⭐⭐

**Obiettivo**: Deploy su server reale per testare infrastruttura completa

**Fasi**:

#### Fase 1: Preparazione SSH (30 min)

- [ ] Configurare `~/.ssh/config` per Hetzner server
- [ ] Test connessione SSH
- [ ] Setup SSH key passwordless
- [ ] Verificare sudo access

#### Fase 2: Server Discovery & Hardening (2 ore)

- [ ] Ansible playbook: `server-discovery.yml`
  - OS info, resources, installed packages
- [ ] Ansible playbook: `security-baseline.yml`
  - Firewall (ufw), fail2ban, unattended-upgrades
- [ ] Ansible playbook: `docker-install.yml`
  - Docker + Docker Compose install

#### Fase 3: Staging Deployment (3 ore)

- [ ] Ansible playbook: `deploy-gateway.yml`
  - Clone repo
  - Setup environment variables (staging)
  - Docker Compose up (gateway + Keycloak + Redis + monitoring)
- [ ] Configurare DNS/subdomain: `staging.tech-citizen.example`
- [ ] Setup Caddy reverse proxy con TLS automatico

#### Fase 4: Testing & Validation (2 ore)

- [ ] Run `npm run test:all` da CI/CD (GitHub Actions?)
- [ ] Smoke test su `https://staging.tech-citizen.example/health`
- [ ] Accesso dashboard Grafana
- [ ] Verifica logs in Loki
- [ ] Test metriche Prometheus

#### Fase 5: Monitoring Setup (1 ora)

- [ ] Configurare alerting (email/Slack?)
- [ ] Dashboard Grafana per staging
- [ ] Backup automatico con `scripts/backup-staging.sh`

**File necessari**:

```
ansible/
├── inventory/
│   ├── hosts.ini (già presente)
│   └── group_vars/
│       ├── staging.yml
│       └── production.yml
├── playbooks/
│   ├── server-discovery.yml (già presente)
│   ├── security-baseline.yml (già presente)
│   ├── docker-install.yml (già presente)
│   ├── deploy-gateway.yml (da creare)
│   └── rollback.yml (da creare)
└── roles/
    ├── common/
    ├── docker/
    ├── gateway/
    └── monitoring/
```

**Effort totale**: 1 giorno pieno  
**Prerequisiti**:

- ✅ Server Hetzner attivo (IP pubblico)
- ❓ DNS configurato (dominio disponibile?)
- ❓ Credenziali SSH root/sudo
- ✅ Ansible installato localmente

---

## 🎬 Piano di Azione Consigliato

### Questa settimana (Dec 11-15):

1. **Deployment su Hetzner** (P0) - 1 giorno
2. **Environment Config System** (P0) - 2 giorni
3. **Commit Scope Validation** (P1) - 1 giorno

### Prossima settimana (Dec 16-22):

4. **BDD Scenario Linking** (P1)
5. **Branch Context Validator** (P1)
6. **Coverage Fix** (P3)

### Gennaio 2026:

7. **Repository Learning System** (P2)
8. **Full Stack Test** (P3)

---

## ❓ Domande da Risolvere

1. **Server Hetzner**:
   - IP pubblico disponibile?
   - Accesso root o sudo user?
   - Budget per server (quanto costa/mese)?

2. **Dominio DNS**:
   - Hai già un dominio? (e.g., tech-citizen.it?)
   - Possiamo usare subdomain per staging? (staging.tech-citizen.it)

3. **Claude API**:
   - Budget per chiamate API (Branch Validator)?
   - API key disponibile?

4. **Monitoraggio**:
   - Preferenza per alerting: Email? Slack? Telegram?
   - Retention logs/metriche (quanto storico serve?)

5. **Customer/Tenant**:
   - Il concetto "dentista.locale staging" è multi-tenancy?
   - Ogni customer ha configurazione separata?

---

## 💡 Note Finali

**Idee interessanti da salvare**:

- ✅ Environment config system - CRITICO per production
- ✅ Commit scope validation - Migliora qualità commit
- ✅ BDD traceability - Essential per acceptance testing
- ⚠️ Branch validator con Claude - Interessante ma costoso
- ⚠️ Repo learning system - Ambizioso, da valutare ROI
- ✅ Hetzner deployment - ESSENZIALE per validare infrastruttura

**Idee da rivalutare**:

- Repository AI chatbot: scope troppo ampio, valutare dopo deploy
- Full monitoring learning: necessita dati reali da production

**Quick wins** (da fare subito):

1. Coverage fix (1 ora)
2. Commit scope validation (4 ore)
3. SSH config + first deploy test (2 ore)

---

_Documento aggiornato: 2025-12-11_
