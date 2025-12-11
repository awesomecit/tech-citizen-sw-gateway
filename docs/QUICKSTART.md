# Quick Start Guide

**Goal**: Get the gateway running locally in < 5 minutes.

---

## Prerequisites

- Node.js 20+ (LTS)
- Docker & Docker Compose
- Git

---

## 1. Clone & Install (1 min)

```bash
git clone https://github.com/awesomecit/tech-citizen-sw-gateway.git
cd tech-citizen-sw-gateway
npm install
```

---

## 2. Start Development Server (1 min)

### Option A: Gateway Only (Hot Reload)

```bash
npm run dev
```

**Gateway URL**: http://localhost:3042

**Test it**:

```bash
curl http://localhost:3042/health
# Expected: {"status":"ok"}
```

### Option B: Full Stack (with monitoring)

```bash
docker compose up -d
npm run dev
```

**Services**:

- Gateway: http://localhost:3042
- Keycloak: http://localhost:8090 (admin/admin)
- Prometheus: http://localhost:19090
- Grafana: http://localhost:3000 (admin/admin)

---

## 3. Run Tests (1 min)

```bash
# Unit tests only (fast)
npm test

# With coverage
npm run test:cov

# Integration tests (auto-starts containers)
npm run test:integration:infra

# E2E tests (full stack)
npm run test:e2e:infra
```

---

## 4. Verify Setup

### Test Authentication Flow

```bash
# 1. Get Keycloak access token
npm run keys:jwt  # Generate test JWT

# 2. Test protected endpoint
curl -H "Authorization: Bearer <token>" \
  http://localhost:3042/protected
```

### Check Metrics

```bash
curl http://localhost:3042/metrics | grep http_request
```

---

## 5. Common Issues

### Port Already in Use

```bash
# Check what's using port 3042
lsof -i :3042
kill -9 <PID>
```

### Docker Containers Won't Start

```bash
# Stop all containers
docker compose down -v

# Clean restart
docker compose up -d --force-recreate
```

### Tests Failing

```bash
# Check test environment
npm run test:unit  # Should pass without Docker

# Clean test containers
npm run test:cleanup
```

---

## Next Steps

- **Architecture**: [docs/architecture/README.md](architecture/README.md)
- **Development Guide**: [docs/development/TESTING.md](development/TESTING.md)
- **Contributing**: [CONTRIBUTING.md](../CONTRIBUTING.md)
- **API Documentation**: [docs/api/README.md](api/README.md)

---

## Quick Commands Reference

```bash
# Development
npm run dev              # Hot reload
npm run build            # Production build
npm start                # Production mode

# Quality
npm run quality          # Lint + Format check
npm run quality:fix      # Auto-fix
npm run analyze          # Complexity analysis

# Infrastructure
docker compose up -d                    # Full stack
docker compose -f docker-compose.test.yml up -d  # Test env
docker compose down -v                  # Stop and clean

# Release
npm run release:suggest  # Preview next version
npm run release          # Semantic release
```

---

**Need Help?** Open an issue on GitHub or check [docs/guides/DX_SETUP.md](guides/DX_SETUP.md) for detailed troubleshooting.
