# Tech Citizen Software Gateway

API Gateway suite per software general purpose.
Stack Platformatic Watt, Docker multi-environment, observability stack completo.

[![Tests](https://img.shields.io/badge/tests-success)]()
[![Coverage](https://img.shields.io/badge/coverage-TBD-blue)]()
[![Security](https://img.shields.io/badge/vulnerabilities-0-success)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

## 🚀 Quick Start

```bash
# Clone & install
git clone <repo-url>
npm install

# Development mode (hot reload)
npm run dev

# Production build
npm run build && npm start

# Tests
npm run test                # All tests (requires infrastructor up)
npm run test:unit           # Unit
npm run test:integration    # Integration (requires infrastructor up)
npm run test:e2e            # End-to-end (requires infrastructor up, BDD scenarios)
```

**Endpoints:**

- 🏥 Gateway: <http://localhost:GATEWAY_POORT/health>
- 📊 Prometheus: <http://localhost:PROMETEUS_PORT>
- 📈 Grafana: <http://localhost:GRAFANA_PORT>

## 📋 Features

- ✅ **Platformatic Watt 3.x** - Service mesh orchestration
- ✅ **Multi-environment** - Isolated (TODO: definire patterns)
- ✅ **Docker Compose** - Full infrastructure
- ✅ **Deployment simulation** - Cloudflare + Hetzner emulation + Maintenece guidelines
- ✅ **Template-based config** - envsubst for runtime configuration
- ✅ **Quality gates** - ESLint, Prettier, Husky, Commitlint, Sonarjs
- ✅ **Security** - Secret scanning, npm audit, vulnerability checks
- ✅ **Testing** - (TODO: in corso di refactoring)
- ✅ **Observability** - Prometheus metrics, Loki logs, Tempo traces
- TODO: manca monitoring
- ✅ **Git workflow** - Trunk-based development

## 🏗️ Architecture

```
tech-citizen-sw-gateway/
├── services/
│   └── gateway/                    # Fastify API Gateway
│       ├── watt.json.template      # Runtime config template
│       ├── .env                    # Default values
│       ├── src/
│       │   └── index.ts
│       └── test/
│           └── routes.test.ts
├── packages/                       # Shared libraries
│   ├── cache/                      # async-cache-dedupe wrapper
│   ├── events/                     # RabbitMQ + CloudEvents
│   └── telemetry/                  # OpenTelemetry setup
├── infrastructure/
│   ├── caddy/                      # Reverse proxy config
│   ├── cloudflare-sim/             # Edge simulation
│   ├── prometheus/                 # Metrics + alerts
│   ├── grafana/                    # Dashboards
│   ├── loki/                       # Log aggregation
│   └── rabbitmq/                   # Message broker
├── scripts/
│   ├TODO: rifedinire in corso di refactoring
├── docs/
│   ├── INFRASTRUCTURE.md           # Docker, deploy, IaC
│   ├── DEVELOPMENT.md              # Testing, config, tooling
│   ├── PLATFORMATIC_CONFIG_GUIDE.md # envsubst templates
│   ├── GIT_WORKFLOW.md             # Trunk-based strategy
│   ├── project/
│   │   ├── BACKLOG.md              # Sprint tasks
│   │   └── ROADMAP.md              # Epic planning
│   └── sessions/
│       └── 2025-12-08-gateway-binding.md  # Dev stories
└── e2e/features/                   # BDD scenarios (Gherkin)
```

## 🔧 Stack Tecnologico

| Layer          | Technology                     | Purpose                        |
| -------------- | ------------------------------ | ------------------------------ |
| Orchestrator   | Platformatic Watt 3.x          | Service mesh coordination      |
| API Gateway    | Fastify 5.x                    | HTTP routing, plugins          |
| Message Broker | RabbitMQ 3.13+                 | Event-driven communication     |
| Cache          | Redis 7.x + async-cache-dedupe | Response caching               |
| Monitoring     | Prometheus + Grafana           | Metrics & dashboards           |
| Observability  | Loki + Tempo + OpenTelemetry   | Logs & distributed traces      |
| Reverse Proxy  | Caddy 2.x                      | SSL termination, load balancer |
| Testing        | Jest + Cucumber                | Unit, integration, E2E         |
| Quality        | ESLint + SonarJS + Prettier    | Code quality gates             |

## 📚 Documentation

### Essential

- **[INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)** - Docker setup, deployment, environment config
- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Testing strategies, Platformatic configuration
- **[GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)** - Trunk-based development guide
- **[BACKLOG.md](docs/project/BACKLOG.md)** - Current sprint tasks
- **[ROADMAP.md](docs/project/ROADMAP.md)** - Epic planning & milestones

### Guides

- **[PLATFORMATIC_CONFIG_GUIDE.md](docs/PLATFORMATIC_CONFIG_GUIDE.md)** - Runtime config with envsubst
- **[DEPLOYMENT_SIMULATION.md](docs/DEPLOYMENT_SIMULATION.md)** - Cloudflare + Hetzner emulation
- **[ENVIRONMENT_CONFIG.md](docs/ENVIRONMENT_CONFIG.md)** - Multi-environment setup
- **[Session Stories](docs/sessions/)** - Development journeys & lessons learned

## 🎯 Commands Reference

### Development

```bash
npm run dev              # Watt dev mode (hot reload)
npm start                # Production mode
npm run build            # TypeScript compilation + Watt build
```

### Testing

```bash
TODO: riportare gli stessi di su
```

### Quality & Security

TODO: verificare che siano quelli usati

```bash
npm run lint             # ESLint check
npm run format           # Prettier check
npm run quality:fix      # Auto-fix lint + format
npm run analyze          # Complexity analysis
npm run security:check   # Secrets scanning
npm audit                # Dependency vulnerabilities
```

TODO: la parte dettagliata del testing non nel README ma in un file ad hoc qui solo strategia adottata e comandi rapidi per tutto il flusso di testing

### Infrastructure

```bash
# Test Environment
npm run test:integration    # Uses docker-compose.test.yml (ephemeral)
KEEP_CONTAINERS=true npm run test:integration  # Debug mode

# Production Deployment
npm run prod:build          # Build images
npm run prod:start          # Start production stack
npm run prod:logs           # View logs
npm run prod:stop           # Shutdown
```

### Release TODO: verificare

```bash
npm run release:suggest  # Preview version bump
npm run release          # Semantic release (CI/CD)
```

## 🔐 Security

- ✅ **vulnerabilities** (npm audit)
- ✅ **Secret scanning** in pre-commit hooks
- ✅ **Environment isolation** (.env files in .gitignore)
- ✅ **Conventional commits** enforced
- ✅ **Complexity limits** (cognitive < 10, cyclomatic < 10)

## 🧪 Testing Strategy

- **Unit Tests**: Jest with ts-jest (services/gateway/test/)
- **Integration Tests**: Docker-based, multi-service (requires .env.test)
- **E2E Tests**: Cucumber/Gherkin scenarios (e2e/features/)
- **Coverage Target**: 80%+ (TBD)

## 🌍 Environments (Simplified Strategy)

**XP/Trunk-Based Development** - 2 environments only:

| Environment | Purpose                  | Config File               | Docker Compose          | Lifecycle  |
| ----------- | ------------------------ | ------------------------- | ----------------------- | ---------- |
| Test        | Unit/Integration testing | .env.test                 | docker-compose.test.yml | Ephemeral  |
| Production  | Live deployment          | .env.production (not git) | docker-compose.prod.yml | Persistent |

**Development mode**: `npm run dev` uses localhost services (no Docker isolation)  
**Rationale**: See [ADR-0004](docs/architecture/decisions/0004-simplified-environment-strategy.md)

## 🤝 Contributing

1. **Workflow**: Trunk-based development (feature branches < 3 days)
2. **Commits**: Conventional commits enforced (`feat|fix|docs|chore(scope): message`)
3. **Quality**: Pre-commit hooks (format, lint, secrets)
4. **Testing**: All tests must pass before merge
5. **Docs**: Update relevant .md files with changes

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📖 Learning Resources

### Session Stories (Video Lessons)

- **[Gateway Binding Fix](docs/sessions/2025-12-08-gateway-binding.md)** - Debugging 127.0.0.1 → 0.0.0.0 (45 min)
  - Network debugging with netstat/ss
  - Platformatic config hierarchy
  - envsubst template generation
  - Docker inter-container communication

### Key Commands Learned

```bash
# Network debugging
docker exec CONTAINER netstat -tuln | grep :PORT
docker exec CONTAINER ss -tuln

# Config templating
envsubst '${VAR1} ${VAR2}' < template > output
export $(cat .env | xargs)

# Docker testing
docker exec CONTAINER curl http://0.0.0.0:PORT
docker logs -f CONTAINER

# Clean rebuild
rm -rf dist .watt && npm run build
```

## 📊 Project Status

- **Sprint**: 1/8 (Epic 3 in progress)
- **Tests**: 20/20 passing ✅
- **Commits**: 12+ (main branch)
- **Security**: 0 vulnerabilities ✅
- **Methodology**: XP with TDD/BDD

## 📝 License

MIT - See [LICENSE](LICENSE) for details

---

**Maintainer**: Antonio Cittadino  
**Created**: 2025-12-08  
**Last Updated**: 2025-12-08
