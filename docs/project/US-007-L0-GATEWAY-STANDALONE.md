# US-007: L0 Gateway Standalone Completo (Foundation)

**Epic**: EPIC-002 Observability Stack  
**Priority**: P0 (BLOCKER per tutte le altre US)  
**Status**: 🔄 IN PROGRESS  
**Estimate**: 4h  
**Owner**: Antonio Cittadino

---

## Context

**Problema**: Il gateway attuale non ha tutti i requisiti base per L0 (Livello 0 - Core). Serve una baseline deployabile, testabile e pronta per produzione PRIMA di aggiungere observability.

**L0 Requirements** (dal EPIC001.md):

- Gateway standalone (~128MB RAM)
- Feature flags disabilitati (no auth, no cache, no telemetry)
- Caso d'uso: Sviluppo locale, unit test, CI/CD

**Missing Requirements** (identificati dall'utente):

1. ❌ Test E2E non coprono L0 completo
2. ❌ Nessun comando `npm run dev:local` documentato
3. ❌ Nessuna immagine Docker buildabile (`docker build`)
4. ❌ Nessuna procedura deploy staging
5. ❌ Swagger non accessibile (nessun endpoint `/docs`)
6. ❌ Nessun admin panel (né singolo tool, né Grafana)
7. ❌ Nessuna valutazione UI admin custom

---

## User Story

**As a** Developer  
**I want** gateway L0 completo con test, build, deploy, docs, admin access  
**So that** posso sviluppare localmente, testare, deployare e monitorare senza dipendenze esterne

---

## Acceptance Criteria

### 1. Test E2E Completo per L0

- [ ] Test file: `e2e/l0-gateway-standalone.e2e.test.ts`
- [ ] Verifica:
  - Gateway starts in < 5s
  - Health check `/health` returns 200
  - Metrics endpoint `/metrics` returns 200 (anche se telemetry=false, endpoint presente)
  - Swagger endpoint `/docs` returns 200 (protected con basic auth in produzione)
  - Graceful shutdown (SIGTERM/SIGINT)
  - RAM usage < 150MB
- [ ] Test passa: `npm run test:e2e -- e2e/l0-gateway-standalone.e2e.test.ts`

### 2. Comandi Sviluppo Locale

- [ ] `npm run dev` - Watt dev mode (già funzionante)
- [ ] `npm run dev:local` - Gateway L0 solo (senza Prometheus, Grafana, Caddy)
- [ ] `npm run build` - TypeScript compilation (già funzionante)
- [ ] `npm run start` - Production mode (già funzionante)
- [ ] Documentato in `README.md` sezione "Local Development"

### 3. Docker Image Build

- [ ] Dockerfile multi-stage per gateway:
  - Stage 1: Builder (TypeScript compilation)
  - Stage 2: Runtime (Node 22 Alpine)
  - Size target: < 200MB
- [ ] Build command: `docker build -t tech-citizen-gateway:latest -f services/gateway/Dockerfile .`
- [ ] Run command: `docker run -p 3042:3042 --env-file .env tech-citizen-gateway:latest`
- [ ] Test: Container starts, health check passa, graceful shutdown

### 4. Deploy Staging Procedure

- [ ] Script: `scripts/deploy-staging.sh`
  - Build image con tag `staging-$(git rev-parse --short HEAD)`
  - Push a registry (GitHub Container Registry o Docker Hub)
  - SSH to staging server
  - Pull image
  - Stop old container (graceful)
  - Start new container
  - Health check verification
- [ ] Documentato in `docs/operations/DEPLOYMENT_STAGING.md`
- [ ] Dry-run test: `bash scripts/deploy-staging.sh --dry-run`

### 5. Swagger Endpoint Accessibile

- [ ] Installato `@fastify/swagger` e `@fastify/swagger-ui`
- [ ] Configurato in `services/gateway/src/index.ts`:
  - Route `/docs` per Swagger UI
  - Route `/docs/json` per OpenAPI spec
  - Protected con `@fastify/basic-auth` (credenziali in .env)
- [ ] Schema OpenAPI auto-generato da route Fastify
- [ ] Test E2E: Accesso a `/docs` con basic auth funziona

### 6. Admin Panel Access (Single Tools)

- [ ] Prometheus UI: `http://localhost:19090` (L1)
- [ ] Grafana UI: `http://localhost:3000` (L1)
- [ ] Gateway Swagger: `http://localhost:3042/docs` (L0) ← **Questo in L0**
- [ ] Documentato in `docs/operations/ADMIN_ACCESS.md`:
  - Credenziali default
  - Come cambiare password
  - Come proteggere in produzione (Caddy reverse proxy + OAuth)

### 7. Valutazione UI Admin Custom (Decision Document)

- [ ] Documento: `docs/architecture/decisions/ADR-006-admin-ui-grafana-vs-custom.md`
- [ ] Contenuto:
  - **Context**: Grafana limita embedding, customization, branding
  - **Alternatives**:
    - Option A: Grafana only (zero code, limited branding)
    - Option B: Custom SvelteKit + iframe Grafana (hybrid)
    - Option C: Full custom UI (mesi sviluppo, pieno controllo)
  - **Decision**: DEFER to Epic 3 (dopo aver usato Grafana per 2 settimane)
  - **Consequences**: Se Grafana insufficiente, creiamo custom UI in Epic 4
- [ ] Tabella confronto:
      | Feature | Grafana | Custom UI |
      |---------|---------|-----------|
      | Time to market | 0 giorni | 2-3 mesi |
      | Branding | Limitato | Completo |
      | Custom widgets | No | Sì |
      | Cost | €0 (OSS) | €X (dev time) |

---

## Tasks Breakdown

### Task 1: Test E2E L0 (1h)

```typescript
// e2e/l0-gateway-standalone.e2e.test.ts
import { test } from 'tap';
import { spawn } from 'child_process';
import { fetch } from 'undici';

test('L0 Gateway Standalone - Full Validation', async t => {
  // 1. Start gateway (no docker-compose, solo watt)
  const gateway = spawn('npm', ['run', 'dev:local'], {
    env: { ...process.env, PORT: '3042', LOG_LEVEL: 'info' },
  });

  // Wait for startup
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 2. Health check
  const health = await fetch('http://localhost:3042/health');
  t.equal(health.status, 200, 'Health check returns 200');

  // 3. Metrics endpoint
  const metrics = await fetch('http://localhost:3042/metrics');
  t.equal(metrics.status, 200, 'Metrics endpoint returns 200');

  // 4. Swagger endpoint (basic auth)
  const swagger = await fetch('http://localhost:3042/docs', {
    headers: {
      Authorization: `Basic ${Buffer.from('admin:admin').toString('base64')}`,
    },
  });
  t.equal(swagger.status, 200, 'Swagger UI accessible with basic auth');

  // 5. Graceful shutdown
  gateway.kill('SIGTERM');
  const exitCode = await new Promise(resolve => {
    gateway.on('exit', resolve);
  });
  t.equal(exitCode, 0, 'Graceful shutdown successful');
});
```

**Deliverable**: Test passa, coverage report

---

### Task 2: Comandi NPM per L0 (30min)

```json
// package.json scripts update
{
  "scripts": {
    "dev": "watt",
    "dev:local": "NODE_ENV=development PORT=3042 watt",
    "build": "tsc",
    "start": "NODE_ENV=production watt",
    "docker:build": "docker build -t tech-citizen-gateway:latest -f services/gateway/Dockerfile .",
    "docker:run": "docker run -p 3042:3042 --env-file .env tech-citizen-gateway:latest"
  }
}
```

**Deliverable**: Comandi funzionanti, README.md aggiornato

---

### Task 3: Dockerfile Multi-Stage (1h)

```dockerfile
# services/gateway/Dockerfile
# Stage 1: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY tsconfig.json ./
COPY services/gateway services/gateway
COPY packages packages

# Install dependencies + build
RUN npm ci --workspace=services/gateway
RUN npm run build --workspace=services/gateway

# Stage 2: Runtime
FROM node:22-alpine
WORKDIR /app

# Copy only production artifacts
COPY --from=builder /app/services/gateway/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/gateway/watt.json ./watt.json

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3042

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3042/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start
CMD ["node", "dist/index.js"]
```

**Deliverable**: Immagine < 200MB, test container funzionante

---

### Task 4: Script Deploy Staging (1h)

```bash
#!/bin/bash
# scripts/deploy-staging.sh

set -e

DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
fi

echo "🚀 Deploy Staging - Gateway L0"

# 1. Build image
GIT_SHA=$(git rev-parse --short HEAD)
IMAGE_TAG="staging-${GIT_SHA}"
echo "📦 Building image: tech-citizen-gateway:${IMAGE_TAG}"

if [ "$DRY_RUN" = false ]; then
  docker build -t "tech-citizen-gateway:${IMAGE_TAG}" -f services/gateway/Dockerfile .
  docker tag "tech-citizen-gateway:${IMAGE_TAG}" "tech-citizen-gateway:staging-latest"
fi

# 2. Push to registry (GitHub Container Registry)
echo "⬆️  Pushing to ghcr.io..."
if [ "$DRY_RUN" = false ]; then
  docker tag "tech-citizen-gateway:${IMAGE_TAG}" "ghcr.io/awesomecit/tech-citizen-gateway:${IMAGE_TAG}"
  docker push "ghcr.io/awesomecit/tech-citizen-gateway:${IMAGE_TAG}"
fi

# 3. Deploy to staging server
STAGING_HOST="${STAGING_HOST:-staging.techcitizen.it}"
STAGING_USER="${STAGING_USER:-deploy}"

echo "🌐 Deploying to ${STAGING_HOST}..."
if [ "$DRY_RUN" = false ]; then
  ssh "${STAGING_USER}@${STAGING_HOST}" << EOF
    set -e
    echo "Pulling new image..."
    docker pull "ghcr.io/awesomecit/tech-citizen-gateway:${IMAGE_TAG}"

    echo "Stopping old container..."
    docker stop gateway || true
    docker rm gateway || true

    echo "Starting new container..."
    docker run -d \\
      --name gateway \\
      --restart unless-stopped \\
      -p 3042:3042 \\
      --env-file /opt/gateway/.env \\
      "ghcr.io/awesomecit/tech-citizen-gateway:${IMAGE_TAG}"

    echo "Waiting for health check..."
    sleep 5
    curl -f http://localhost:3042/health || exit 1

    echo "✅ Deploy successful!"
EOF
else
  echo "🔍 DRY RUN - Would deploy to ${STAGING_HOST}"
fi

echo "✅ Staging deployment complete!"
```

**Deliverable**: Script funzionante, DEPLOYMENT_STAGING.md documentato

---

### Task 5: Swagger Setup (30min)

```typescript
// services/gateway/src/index.ts
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import basicAuth from '@fastify/basic-auth';

const app = Fastify({ logger: true });

// Basic auth for /docs
await app.register(basicAuth, {
  validate: async (username, password, req, reply) => {
    if (
      username !== process.env.SWAGGER_USER ||
      password !== process.env.SWAGGER_PASS
    ) {
      return new Error('Unauthorized');
    }
  },
  authenticate: true,
});

// Swagger OpenAPI spec
await app.register(swagger, {
  openapi: {
    info: {
      title: 'Tech Citizen Gateway API',
      description: 'Healthcare API Gateway Suite',
      version: '1.0.0',
    },
    servers: [
      { url: 'http://localhost:3042', description: 'Development' },
      { url: 'https://api.techcitizen.it', description: 'Production' },
    ],
  },
});

// Swagger UI
await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
});

// Protected route example
app.get('/docs', { onRequest: app.basicAuth }, async (req, reply) => {
  return reply.sendFile('index.html'); // Swagger UI
});
```

**Deliverable**: `/docs` accessibile con basic auth, OpenAPI spec auto-generated

---

### Task 6: Admin Access Documentation (30min)

```markdown
<!-- docs/operations/ADMIN_ACCESS.md -->

# Admin Panel Access Guide

## L0 - Gateway Standalone

### Swagger UI (API Documentation)

**URL**: `http://localhost:3042/docs`  
**Credentials**:

- Username: `admin` (change in `.env` → `SWAGGER_USER`)
- Password: `admin` (change in `.env` → `SWAGGER_PASS`)

**Production**: Protected by Caddy reverse proxy + OAuth (Epic 4)

---

## L1 - Metrics Layer

### Prometheus

**URL**: `http://localhost:19090`  
**Default**: No authentication (internal network only)  
**Production**: Caddy reverse proxy + Cloudflare Access

### Grafana

**URL**: `http://localhost:3000`  
**Credentials**:

- Username: `admin` (change in `.env` → `GF_SECURITY_ADMIN_USER`)
- Password: `admin` (change in `.env` → `GF_SECURITY_ADMIN_PASSWORD`)

**Production**: OAuth2 GitHub/Google (Epic 3), Keycloak SSO (Epic 5)

---

## Security Best Practices

1. **Local Development**: Default credentials OK
2. **Staging**: Change all passwords, use `.env.staging`
3. **Production**:
   - Swagger: OAuth2 + role-based access
   - Prometheus: Network isolation + mTLS
   - Grafana: Keycloak SSO + RBAC
```

**Deliverable**: ADMIN_ACCESS.md creato, README.md link aggiunto

---

### Task 7: ADR-006 Admin UI Decision (30min)

```markdown
<!-- docs/architecture/decisions/ADR-006-admin-ui-grafana-vs-custom.md -->

# ADR-006: Admin UI - Grafana vs Custom

**Status**: Deferred  
**Date**: 2025-12-13  
**Decision Makers**: Antonio Cittadino  
**Review Date**: 2026-01-15 (dopo 4 settimane uso Grafana)

## Context

EPIC001.md propone Grafana come Admin Hub, ma esistono limiti:

- Branding limitato (logo, colori corporate)
- No custom widgets (es. user onboarding checklist)
- Embedding iframe ha restrizioni CORS
- Mobile app read-only (no admin actions)

## Decision

**DEFER decisione a Epic 3** (dopo aver usato Grafana per 2 settimane).

Rationale:

- Grafana copre 80% use case (YAGNI)
- Custom UI = 2-3 mesi sviluppo (EPIC-011)
- Possiamo sempre fare hybrid (Grafana + custom pages)

## Alternatives

| Option              | Time     | Cost | Control | Verdict             |
| ------------------- | -------- | ---- | ------- | ------------------- |
| **A: Grafana Only** | 0 giorni | €0   | 60%     | ✅ L1-L3            |
| **B: Hybrid**       | 1 mese   | €€   | 85%     | ⏸️ Valuta in Epic 3 |
| **C: Full Custom**  | 3 mesi   | €€€€ | 100%    | ❌ YAGNI            |

## Consequences

**Positive**:

- Grafana funziona out-of-the-box
- Possiamo validare use case reali prima di custom UI
- Se serve custom UI, abbiamo spec chiare (da uso Grafana)

**Negative**:

- Branding limitato temporaneamente
- Alcuni use case potrebbero richiedere custom UI
- Risk: Switch cost se Grafana insufficiente

## Next Steps

1. Usare Grafana per Epic 2-3 (4 settimane)
2. Raccogliere feedback da utenti (SRE, DevOps, Developer)
3. Decidere in Epic 3:
   - ✅ Grafana sufficiente → Fine
   - ⚠️ Grafana + 2-3 custom pages → Hybrid (Epic 4)
   - ❌ Grafana insufficiente → Full custom (EPIC-011, 3 mesi)
```

**Deliverable**: ADR-006 creato, decisione documentata

---

## Definition of Done

- [ ] Tutti i 7 task completati
- [ ] Test E2E L0 passa (100% coverage L0)
- [ ] Comandi NPM funzionanti (`dev:local`, `docker:build`, `docker:run`)
- [ ] Dockerfile multi-stage < 200MB
- [ ] Script deploy staging testato (dry-run)
- [ ] Swagger accessibile con basic auth
- [ ] ADMIN_ACCESS.md documentato
- [ ] ADR-006 creato e reviewed
- [ ] README.md aggiornato con sezione "L0 - Gateway Standalone"
- [ ] Commit atomico con message:  
       `feat(gateway): complete L0 standalone setup (test, build, deploy, docs, admin)`
- [ ] CI/CD green (test passa)

---

## Success Metrics

- ✅ Developer può lanciare gateway L0 in < 5s: `npm run dev:local`
- ✅ Docker image builds in < 2min, size < 200MB
- ✅ Deploy staging completa in < 3min (build + push + deploy + health check)
- ✅ Swagger accessibile e OpenAPI spec generato automaticamente
- ✅ Admin access documentato per tutti i tool (L0, L1, L2, L3)
- ✅ Decisione Admin UI documentata e deferred (evita over-engineering)

---

## Dependencies

- ✅ Gateway già funzionante (services/gateway/src/index.ts)
- ✅ Prometheus config già presente (infrastructure/prometheus/prometheus.yml)
- ✅ Graceful shutdown già implementato (test/server-startup.test.ts)
- ⚠️ Manca: Swagger, Dockerfile, deploy script, admin docs, ADR-006

---

## Risks

| Risk                                              | Probability | Impact | Mitigation                                      |
| ------------------------------------------------- | ----------- | ------ | ----------------------------------------------- |
| Docker build fallisce (mono-repo complessità)     | Medium      | High   | Test build in CI/CD, multi-stage ottimizzato    |
| Swagger schema incompleto (route non documentate) | Low         | Medium | Auto-generation da Fastify schemas              |
| Deploy staging fallisce (SSH, registry)           | Medium      | Medium | Dry-run script, test locale con Docker          |
| Grafana insufficiente (custom UI necessaria)      | Low         | High   | ADR-006 DEFER decisione, 4 settimane validation |

---

## Next User Story

**US-008**: Setup Prometheus Scraping (dopo US-007 completo)

---

**Estimate Breakdown**:

- Task 1 (Test E2E): 1h
- Task 2 (NPM scripts): 30min
- Task 3 (Dockerfile): 1h
- Task 4 (Deploy script): 1h
- Task 5 (Swagger): 30min
- Task 6 (Admin docs): 30min
- Task 7 (ADR-006): 30min
- **Total**: 4h
