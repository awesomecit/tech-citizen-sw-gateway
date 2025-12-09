# Technical Decisions Backlog

> **Last Updated**: 2025-12-10  
> **Status**: Planning Phase - Decisions Pending

Questo documento raccoglie le decisioni architetturali e tecnologiche da valutare per l'evoluzione del progetto.

---

## 🔄 CI/CD & DevOps

### Decision: CI/CD Tool Selection

**Context**: Attualmente abbiamo pipeline locale (`scripts/local-pipeline.sh`) ma serve orchestrazione per team e staging/production.

**Options**:

| Tool               | Pros                                                          | Cons                                   | Use Case                     |
| ------------------ | ------------------------------------------------------------- | -------------------------------------- | ---------------------------- |
| **Jenkins**        | Self-hosted, infinite plugins, pipeline-as-code (Jenkinsfile) | Heavy, manutenzione server, UI datata  | On-premise, controllo totale |
| **GitHub Actions** | Nativo GitHub, free tier, huge marketplace                    | Lock-in GitHub, rate limits            | Open source, cloud-first     |
| **GitLab CI**      | Integrato, Docker-first, auto DevOps                          | Richiede GitLab (migration da GitHub?) | All-in-one platform          |
| **Drone CI**       | Lightweight, Docker-native, .drone.yml                        | Community più piccola                  | Kubernetes/Docker stack      |
| **Tekton**         | Cloud-native (K8s), vendor-neutral                            | Complessità K8s richiesta              | Enterprise K8s               |
| **Local-only**     | Zero dipendenze esterne, full control                         | Nessuna UI, no team collaboration      | Solo sviluppo locale         |

**Current Implementation**:

- ✅ `.husky/pre-commit` - Lint + test + secret scan
- ✅ `.husky/pre-push` - Full test suite
- ✅ `.husky/pre-release` - Security audit
- ✅ `scripts/local-pipeline.sh` - Build + Docker + release

**Recommendation**:

- **Short-term**: Potenziare pipeline locale (sufficiente per team piccoli)
- **Mid-term**: GitHub Actions (se repo rimane su GitHub, zero setup)
- **Long-term**: Jenkins se serve on-premise compliance (healthcare GDPR/HIPAA)

**Decision Criteria**:

- [ ] Team size (< 5 dev → locale OK, > 10 → Jenkins/GitLab)
- [ ] Hosting preference (cloud vs on-premise)
- [ ] Compliance requirements (HIPAA data on-premise?)
- [ ] Budget (self-hosted vs cloud)

**ADR Required**: Yes → `docs/architecture/decisions/ADR-004-cicd-pipeline-selection.md`

---

## 🛒 E-Commerce Integration

### Decision: Shopify Integration for Healthcare

**Context**: Sistema healthcare potrebbe richiedere e-commerce per:

- Pagamenti visite mediche/telemedicina
- Vendita farmaci (con ricetta)
- Abbonamenti servizi sanitari
- Marketplace dispositivi medici

**Shopify Capabilities**:

| Feature                    | Healthcare Use Case                | Complexity |
| -------------------------- | ---------------------------------- | ---------- |
| **Storefront API**         | Catalogo farmaci, dispositivi      | Low        |
| **Admin API (GraphQL)**    | Gestione ordini, inventory         | Medium     |
| **Webhooks**               | Order created → ricetta validation | Low        |
| **Checkout Customization** | Verifica età, prescrizione medica  | High       |
| **Metafields**             | Store prescription_id, doctor_id   | Low        |
| **Multi-currency**         | Pagamenti internazionali           | Medium     |
| **Subscriptions**          | Abbonamenti telemedicina           | Medium     |

**Integration Points**:

```typescript
// services/e-commerce/
├── shopify-adapter/
│   ├── storefront.ts       // Public catalog API
│   ├── admin.ts            // Order management
│   ├── webhooks.ts         // Event handlers
│   └── prescription-validator.ts  // Custom logic
└── payment-gateway/
    ├── stripe.ts           // PCI-compliant payments
    └── healthcare-compliance.ts  // HIPAA audit logs
```

**Alternatives**:

- **WooCommerce** (WordPress) - Più flessibile ma più manutenzione
- **Medusa.js** (headless) - Open source, self-hosted, customizable
- **Custom** - Full control, ma reinventing wheel

**Risks**:

- ⚠️ Compliance: Shopify servers US/Canada (GDPR/HIPAA?)
- ⚠️ Farmaci: Regolamentazione vendita online (autorizzazioni)
- ⚠️ Ricette: Integrazione con sistema sanitario nazionale

**Decision Required**: Q1 2026 (dopo MVP auth + gateway)

**ADR Required**: Yes → `ADR-005-ecommerce-platform-selection.md`

---

## 👥 Multi-Tenant Architecture

### Decision: Scalare su Più Domini Healthcare

**Context**: Sistema deve supportare:

- Multiple cliniche/ospedali (tenant)
- Isolamento dati pazienti per tenant
- Configurazioni domain-specific (branding, workflow)

**Tenant Isolation Strategies**:

#### **Option A: Schema-per-Tenant** (PostgreSQL)

```sql
-- Ogni tenant ha il suo schema
CREATE SCHEMA tenant_clinic_a;
CREATE SCHEMA tenant_clinic_b;

-- User context switching
SET search_path TO tenant_clinic_a, public;
```

**Pros**:

- ✅ Forte isolamento dati
- ✅ Backup/restore per tenant
- ✅ Migrazioni indipendenti

**Cons**:

- ❌ Limite PostgreSQL schemas (~10k, ma gestibile)
- ❌ Connection pool per tenant (resource overhead)

#### **Option B: Row-Level Security (RLS)**

```sql
-- Tabella condivisa con tenant_id
CREATE TABLE patients (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT,
  ...
);

-- RLS policy
CREATE POLICY tenant_isolation ON patients
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

**Pros**:

- ✅ Single schema (semplice)
- ✅ Query cross-tenant analytics (con permessi)
- ✅ Gestione unified

**Cons**:

- ❌ Rischio data leak se RLS mal configurato
- ❌ Performance degradation con milioni di row

#### **Option C: Database-per-Tenant**

```yaml
# Ogni tenant ha DB separato
tenant_clinic_a: postgres://db1/clinic_a
tenant_clinic_b: postgres://db2/clinic_b
```

**Pros**:

- ✅ Massimo isolamento
- ✅ Compliance facilitata

**Cons**:

- ❌ Costi infrastrutturali alti
- ❌ Migrazioni complesse (N databases)

**Recommendation**:

- **MVP**: Row-Level Security (< 10 tenant)
- **Scale**: Schema-per-Tenant (10-1000 tenant)
- **Enterprise**: Database-per-Tenant (> 1000 o strict compliance)

**Implementation Roadmap**:

```typescript
// packages/multi-tenant/
├── tenant-context.ts       // Async context (tenant_id)
├── tenant-resolver.ts      // Extract da subdomain/header
├── tenant-middleware.ts    // Fastify middleware
└── migrations/
    └── enable-rls.sql      // ALTER TABLE ... ENABLE ROW LEVEL SECURITY
```

**ADR Required**: Yes → `ADR-006-multi-tenant-strategy.md`

---

## 🗄️ Data Architecture & CRUD

### Decision: ORM vs SQL Raw

**Context**: Necessità di CRUD performanti con type safety e migrations by design.

**Options Comparison**:

| Tool             | Type Safety | Performance | Migrations     | Learning Curve | Bundle Size |
| ---------------- | ----------- | ----------- | -------------- | -------------- | ----------- |
| **Prisma**       | ★★★★★       | ★★★☆☆       | ★★★★★ (auto)   | ★★★☆☆          | ~5MB        |
| **Kysely**       | ★★★★★       | ★★★★★       | ★★★☆☆ (manual) | ★★★★☆          | ~100KB      |
| **Drizzle**      | ★★★★★       | ★★★★★       | ★★★★☆          | ★★★☆☆          | ~200KB      |
| **TypeORM**      | ★★★★☆       | ★★★☆☆       | ★★★★☆          | ★★☆☆☆          | ~2MB        |
| **Raw SQL (pg)** | ★☆☆☆☆       | ★★★★★       | ★☆☆☆☆ (manual) | ★★★★★          | ~50KB       |

**Prisma Example**:

```typescript
// schema.prisma
model Patient {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  name      String
  birthDate DateTime @map("birth_date")

  @@index([tenantId])
  @@map("patients")
}

// Usage
const patient = await prisma.patient.create({
  data: { tenantId, name, birthDate }
});
```

**Kysely Example** (SQL-first, type-safe):

```typescript
interface Database {
  patients: {
    id: string;
    tenant_id: string;
    name: string;
    birth_date: Date;
  };
}

const db = new Kysely<Database>({ dialect: new PostgresDialect() });

const patient = await db
  .insertInto('patients')
  .values({ tenant_id: tenantId, name, birth_date: birthDate })
  .returningAll()
  .executeTakeFirstOrThrow();
```

**Recommendation**:

- **Prototyping**: Prisma (velocità sviluppo)
- **Production**: Kysely (performance + control)
- **Hybrid**: Kysely per queries complesse, Prisma per CRUD semplici

**ADR Required**: Yes → `ADR-007-orm-selection.md`

---

### Decision: Folder Structure per Entità

**Context**: Organizzare codice per domain-driven design con Fastify/Platformatic.

**Proposed Structure**:

```
services/domain-service/
├── src/
│   ├── anagrafiche/              # Master Data (reference tables)
│   │   ├── specializations/      # Specializzazioni mediche
│   │   │   ├── routes.ts         # GET /anagrafiche/specializations
│   │   │   ├── repository.ts     # DB queries
│   │   │   └── schema.ts         # TypeBox validation
│   │   ├── diagnoses/            # Codici ICD-10
│   │   └── medications/          # Farmaci registrati
│   │
│   ├── aggregati/                # DDD Aggregates
│   │   ├── patient/              # Patient aggregate root
│   │   │   ├── patient.entity.ts
│   │   │   ├── patient.repository.ts
│   │   │   ├── patient.routes.ts
│   │   │   ├── medical-history.ts  # Value object
│   │   │   └── allergies.ts        # Child entity
│   │   └── appointment/
│   │
│   ├── viste/                    # Read Models (CQRS)
│   │   ├── patient-dashboard.ts  # Denormalized per UI
│   │   ├── doctor-schedule.ts
│   │   └── analytics.ts
│   │
│   ├── entita-dominio/           # Domain Entities
│   │   ├── prescription/         # Usa anagrafica medications
│   │   │   ├── prescription.entity.ts
│   │   │   ├── prescription.repository.ts
│   │   │   └── routes.ts
│   │   └── lab-result/
│   │
│   └── relazioni/                # Relationship management
│       ├── patient-doctor.ts     # Many-to-Many
│       ├── prescription-medication.ts  # One-to-Many
│       └── appointment-participants.ts
│
├── migrations/
│   ├── 001_create_anagrafiche.sql
│   ├── 002_create_patients.sql
│   └── 003_create_relations.sql
│
└── watt.json
```

**Relationships Handling**:

| Type             | Implementation        | Example                                    |
| ---------------- | --------------------- | ------------------------------------------ |
| **1:1**          | Foreign key + UNIQUE  | Patient ↔ MedicalRecord                    |
| **1:N**          | Foreign key           | Doctor → Appointments                      |
| **N:M**          | Junction table        | Patients ↔ Medications (via prescriptions) |
| **Hierarchical** | Self-reference + path | Organization tree                          |
| **Polymorphic**  | Type discriminator    | Attachments (Patient/Doctor/Appointment)   |

**Migrations Strategy**:

```bash
# By design - schema-first
npm run migration:create -- create_patients_table
npm run migration:up
npm run migration:down  # Rollback support

# Prisma alternative (model-first)
npx prisma migrate dev --name create_patients
```

**ADR Required**: No (documentare in CONTRIBUTING.md)

---

## 📊 Logging & Observability

### Decision: Structured Logging Standard

**Context**: Logs devono essere consumati da Elasticsearch/Kibana + Loki/Grafana.

**Fastify/Platformatic Logging** (Pino):

```typescript
// Già configurato in Fastify
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty' } // Human-readable
        : undefined, // JSON for production
  },
});

// Log con correlation ID
app.addHook('onRequest', (request, reply, done) => {
  request.log = request.log.child({
    requestId: request.headers['x-request-id'] || randomUUID(),
    userId: request.session?.user?.userId,
    tenantId: request.session?.user?.tenantId,
  });
  done();
});

// Usage
app.log.info({ patientId: '123' }, 'Patient retrieved');
```

**Output Format (JSON)**:

```json
{
  "level": 30,
  "time": 1702137600000,
  "pid": 12345,
  "hostname": "gateway-pod-1",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "usr_abc123",
  "tenantId": "tenant_clinic_a",
  "patientId": "123",
  "msg": "Patient retrieved"
}
```

**Elasticsearch Mapping**:

```json
{
  "mappings": {
    "properties": {
      "requestId": { "type": "keyword" },
      "userId": { "type": "keyword" },
      "tenantId": { "type": "keyword" },
      "level": { "type": "integer" },
      "msg": { "type": "text" }
    }
  }
}
```

**Loki Labels** (for Grafana):

```yaml
# promtail.yml
- job_name: gateway
  static_configs:
    - targets:
        - localhost
      labels:
        job: gateway
        environment: production
        __path__: /var/log/gateway/*.log
  pipeline_stages:
    - json:
        expressions:
          level: level
          requestId: requestId
    - labels:
        level:
        requestId:
```

**Log Levels Strategy**:

- **ERROR**: Errori che richiedono intervento (500, DB down)
- **WARN**: Situazioni anomale ma gestibili (429 rate limit, cache miss)
- **INFO**: Eventi business importanti (user login, order created)
- **DEBUG**: Dettagli sviluppo (SQL queries, cache hits)
- **TRACE**: Dettagli estremamente verbosi (raw HTTP headers)

**Sensitive Data Sanitization**:

```typescript
// Auto-redact secrets
const safeLog = request.log.child({
  bindings: {
    redact: ['req.headers.authorization', 'req.body.password'],
  },
});
```

**ADR Required**: No (implementare in package @tech-citizen/logger)

---

## 🎨 Frontend Architecture

### Decision: UI Component Strategy

**Context**: Patient portal, admin dashboard, doctor interface.

**Options**:

| Framework        | Use Case                   | Pros                                      | Cons                    |
| ---------------- | -------------------------- | ----------------------------------------- | ----------------------- |
| **Next.js 14+**  | Full-stack (SSR + API)     | SEO, performance, React Server Components | Vercel lock-in risk     |
| **Vite + React** | SPA (client-only)          | Fast dev, lightweight                     | No SSR out-of-box       |
| **Remix**        | Full-stack (web standards) | Progressive enhancement, nested routes    | Smaller ecosystem       |
| **Astro**        | Marketing site             | Ultra-fast, partial hydration             | Non adatto a dashboards |

**Design System Options**:

- **shadcn/ui** (Tailwind + Radix) - Customizable, copy-paste
- **MUI (Material-UI)** - Enterprise-ready, accessibility
- **Chakra UI** - Developer experience, theming
- **Custom** - Full control, brand identity

**Recommendation**: Next.js 14 + shadcn/ui (best DX + performance)

**Architecture**:

```
apps/
├── patient-portal/       # Next.js app (public)
├── admin-dashboard/      # Next.js app (internal)
└── doctor-interface/     # Next.js app (clinical)

packages/
├── ui-components/        # Shared shadcn/ui components
├── design-tokens/        # Colors, spacing, typography
└── auth-client/          # Frontend auth hooks
```

**ADR Required**: Yes → `ADR-008-frontend-architecture.md`

---

## 📚 Course Implementation Mapping

### Argomenti Implementati

Documentare in `docs/course/IMPLEMENTATION_STATUS.md`:

```markdown
# Corso → Codice Reale

## ✅ Implementato

| Argomento Corso               | Implementazione         | Commit          | Test |
| ----------------------------- | ----------------------- | --------------- | ---- |
| TDD (Test-Driven Development) | Jest + 50 test suite    | e101c14         | ✅   |
| SOLID Principles              | Services separation, DI | 169680d         | ✅   |
| API Gateway Pattern           | Fastify gateway service | 5ecc652         | ✅   |
| Authentication (JWT)          | @fastify/jwt plugin     | -               | ✅   |
| Authentication (OIDC)         | Keycloak integration    | 169680d         | ✅   |
| Prometheus Metrics            | /metrics endpoint       | 5ecc652         | ✅   |
| Correlation ID                | X-Request-ID tracking   | 5ecc652         | ✅   |
| Secret Management             | Key generation scripts  | e101c14         | ✅   |
| Pre-commit Hooks              | Husky + lint + test     | e101c14         | ✅   |
| Semantic Versioning           | Conventional commits    | auto-release.js | ✅   |

## 🚧 In Corso

| Argomento Corso           | Status                     | Planned Commit |
| ------------------------- | -------------------------- | -------------- |
| Circuit Breaker           | Planned (US-045)           | Epic 3         |
| Rate Limiting             | Planned (US-046)           | Epic 3         |
| Event-Driven Architecture | RabbitMQ setup             | Epic 4         |
| Caching Strategy          | Redis + async-cache-dedupe | Epic 5         |

## 📋 TODO

- [ ] Structured Logging (Pino → ELK)
- [ ] Multi-tenant (RLS PostgreSQL)
- [ ] E2E with Playwright (removed - YAGNI)
- [ ] Microservices orchestration (Watt)
```

---

## 🚀 Prossimi Step

### Immediate (Questa Sessione)

- [x] Security audit automation
- [x] Glossario terminologico
- [x] Code disclosure prevention
- [x] Local pipeline script
- [ ] **Verificare `npm run dev` funzionante**
- [ ] **Commit finale sessione**
- [ ] **Generare prompt storytelling**

### Short-term (Prossima Settimana)

1. **US-040**: Enhanced session management (token refresh)
2. **US-041**: TypeBox schemas validation
3. **US-042**: Auth plugin composition (JWT + Keycloak unified)

### Mid-term (Q1 2026)

1. Multi-tenant architecture (ADR-006)
2. ORM selection + migrations setup (ADR-007)
3. Logging standardizzato (Pino → Loki/ELK)
4. Frontend kickoff (Next.js + shadcn/ui)

### Long-term (Q2 2026)

1. Shopify integration (se necessario)
2. CI/CD Jenkins/GitHub Actions
3. Production deployment (Ansible playbooks)
4. Healthcare compliance audit (HIPAA/GDPR)

---

## 📝 ADRs da Creare

- [ ] ADR-004: CI/CD Pipeline Selection (Jenkins vs GitHub Actions)
- [ ] ADR-005: E-Commerce Platform (Shopify vs alternatives)
- [ ] ADR-006: Multi-Tenant Strategy (RLS vs Schema-per-Tenant)
- [ ] ADR-007: ORM Selection (Prisma vs Kysely vs Raw SQL)
- [ ] ADR-008: Frontend Architecture (Next.js + shadcn/ui)

---

**Maintainer**: Antonio Cittadino  
**Review Frequency**: Monthly  
**Next Review**: 2026-01-10
