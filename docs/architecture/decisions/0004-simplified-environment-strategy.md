# Environment Strategy Simplification

## Current Problem ❌

Troppi ambienti = troppa complessità per XP + Trunk-based development:

```
.env.development   ← Dev locale
.env.test          ← Test automatici
.env.staging       ← Pre-produzione
.env.production    ← Produzione (non esiste ancora!)
```

**Problemi:**

- Duplicazione configurazioni
- Drift tra ambienti
- Overhead di manutenzione
- Rallenta il deploy continuo

## Proposed Strategy ✅

### 2 Ambienti Principali

```
1. TEST (ephemeral)     → CI/CD + test locali + cleanup automatico
2. PRODUCTION (persistent) → Single production deployment (sempre stabile)
```

### Environment Strategy

#### 1. TEST Environment

**Caratteristiche:**

- ✅ **Ephemeral**: si avvia, testa, si distrugge
- ✅ **Isolato**: porte dedicate (8091, 6381, etc.)
- ✅ **Automatico**: cleanup dopo ogni run
- ✅ **Locale + CI**: stesso comportamento ovunque

**Uso:**

```bash
npm test              # Avvia infra → test → cleanup
npm run test:watch    # Mantiene infra attiva per sviluppo
```

**Configurazione:**

```env
# .env.test
NODE_ENV=test
KEYCLOAK_PORT=8091
REDIS_PORT=6381
```

#### 2. PRODUCTION Environment

**Caratteristiche:**

- ✅ **Persistent**: sempre attivo
- ✅ **Single source of truth**: main branch = production
- ✅ **Zero-downtime deployment**: blue-green via Docker
- ✅ **Scalabile**: docker-compose → Kubernetes (futuro)

**Configurazione:**

```env
# .env.production (su server)
NODE_ENV=production
KEYCLOAK_URL=https://auth.healthcare.example.com
REDIS_URL=redis://redis:6379
```

### Removal of "Development" Environment

**Perché?**

- Sviluppatori usano **test environment** localmente
- Nessun bisogno di infra persistente in locale
- Riduce drift tra test e production

**Before:**

```bash
npm run dev  # Avvia infra in background (porte 8090, 6380)
             # Deve essere gestito manualmente
             # Può andare fuori sync
```

**After:**

```bash
npm run test:watch  # Infra ephemeral per sviluppo
                    # Cleanup automatico
                    # Sempre in sync con CI
```

### Removal of "Staging" Environment

**Perché?**

- Con trunk-based development, **main = production**
- Feature flags per rollout graduale
- Review apps effimere per PR (futuro)

**Instead of staging:**

- Feature flags per testare in prod
- Canary deployments (5% → 50% → 100%)
- Rollback automatico se errori

---

## Migration Plan

### Phase 1: Cleanup (Immediate)

```bash
# Remove
- .env.development (merged into test)
- .env.staging (non necessario)
- docker-compose.staging.yml
```

### Phase 2: Simplified Structure

```
.env.test             # Local + CI tests
.env.production       # Production (template, not committed)
docker-compose.yml    # Base infrastructure
docker-compose.test.yml # Test overrides
```

### Phase 3: Production Deployment

```bash
# Single production stack
docker-compose.prod.yml
  ↓
Kubernetes manifests (futuro)
  ↓
Helm charts (futuro)
```

---

## Docker Compose Strategy

### Test (Ephemeral)

```yaml
# docker-compose.test.yml
services:
  keycloak:
    env_file: .env.test
    ports:
      - '8091:8080' # Porte isolate
    # Nessun volume persistente
```

### Production (Persistent)

```yaml
# docker-compose.prod.yml
services:
  keycloak:
    env_file: .env.production
    ports:
      - '8080:8080'
    volumes:
      - keycloak-data:/opt/keycloak/data # Persistente
    deploy:
      replicas: 2 # HA
      restart_policy:
        condition: on-failure
```

---

## Scalability Path

### Now: Docker Compose

```
Single server
├── Gateway (3 replicas)
├── Keycloak (2 replicas)
└── Redis (1 primary + 1 replica)
```

### Future: Kubernetes

```
Multi-node cluster
├── Gateway (HPA 3-10 replicas)
├── Keycloak (StatefulSet 2 replicas)
└── Redis (Sentinel cluster)
```

**Migration:**

1. Testare tutto con docker-compose
2. Convertire con Kompose: `kompose convert`
3. Aggiungere Kubernetes-specific config (HPA, ingress, etc.)

---

## Trunk-Based Development Workflow

```
1. Feature branch
   ├── npm test (local ephemeral infra)
   └── Push → CI runs same tests

2. Merge to main
   ├── CI: full test suite
   ├── Build Docker images
   └── Deploy to production (auto)

3. Monitor production
   ├── Feature flag → enable gradually
   └── Rollback if needed (one command)
```

**No staging needed!**

- Tests cover everything
- Production is the real test
- Fast feedback loop

---

## Benefits

### ✅ Simplicity

- 2 environments instead of 4
- Less configuration drift
- Easier mental model

### ✅ Speed

- No staging deployment step
- CI/CD pipeline più veloce
- Feedback loop ridotto

### ✅ Reliability

- Test = production (stessa infra)
- Feature flags per safety
- Rollback automatico

### ✅ Scalability

- Docker Compose → Kubernetes
- Stesso pattern, diverso orchestrator
- Infra as code

---

## Implementation Steps

### 1. Remove Files

```bash
rm .env.development
rm .env.staging
rm docker-compose.staging.yml
rm scripts/staging-*.sh
```

### 2. Update Scripts

```bash
# Keep only
npm test              # Ephemeral test infra
npm run test:watch    # Development workflow
npm run deploy        # Deploy to production
```

### 3. Update Documentation

```bash
docs/operations/ENVIRONMENT_MANAGEMENT.md
  → SIMPLIFIED_DEPLOYMENT.md
```

### 4. CI/CD Pipeline

```yaml
# .github/workflows/main.yml
on:
  push:
    branches: [main]

jobs:
  test:
    - npm test  # Ephemeral infra

  deploy:
    if: success()
    - ansible-playbook deploy.yml
```

---

## Questions to Address

1. **How to test locally without persistent infra?**
   → Use `npm run test:watch` with ephemeral containers

2. **How to deploy gradually to production?**
   → Feature flags + canary deployments

3. **How to handle database migrations?**
   → Run migrations in init container before app starts

4. **How to scale horizontally?**
   → Docker Compose replicas → Kubernetes HPA

5. **How to handle secrets in production?**
   → Ansible vault → Kubernetes secrets → External secrets operator

---

## Next Steps

Vuoi che proceda con:

1. ✅ Cleanup files (.env.development, .env.staging, etc.)
2. ✅ Update scripts (remove staging, simplify dev)
3. ✅ Create production deployment guide
4. ✅ Setup feature flags strategy
5. ✅ Plan Kubernetes migration path

Quale priorità preferisci?
