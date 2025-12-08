# Infrastructure as Code Testing Strategy

**Purpose**: Ensure infrastructure changes are validated before deployment to any environment.

**Philosophy**: Test infrastructure the same way we test application code - with automated tests that run in CI/CD.

---

## Test Pyramid for IaC

```
        /\
       /  \  E2E (Smoke Tests - Production Health)
      /----\
     /      \  Integration (Docker Compose Startup)
    /--------\
   /          \  Unit (Config Validation - YAML/JSON Schema)
  /____________\
```

### Level 1: Configuration Validation (Fast - < 1s)

**What**: Validate Docker Compose YAML, Prometheus config, Grafana JSON schema

**When**: Pre-commit hook, every git push

**Tools**:

- JSON Schema validation
- YAML linting
- Custom validation logic

**Example**:

```typescript
it('should have health checks for all services', () => {
  const services = composeConfig.services;
  Object.entries(services).forEach(([name, config]) => {
    expect(config.healthcheck).toBeDefined();
  });
});
```

**Coverage**: `test/infrastructure.test.ts` (Docker Compose validation section)

---

### Level 2: Integration Tests (Medium - 30-60s)

**What**: Actually start containers and verify they're healthy

**When**:

- Before merging PR to `main`
- Before deployment to any environment
- Nightly on `main` branch

**Tools**:

- Docker Compose
- curl for HTTP health checks
- Docker CLI for container inspection

**Example**:

```typescript
it('should have all health checks passing', async () => {
  await new Promise(resolve => setTimeout(resolve, 30000));
  const { stdout } = await execAsync('docker compose ps --format json');
  const containers = stdout.trim().split('\n').map(JSON.parse);

  containers.forEach(container => {
    expect(container.Health).toBe('healthy');
  });
}, 60000);
```

**Coverage**: `test/infrastructure.test.ts` (Infrastructure Startup section)

---

### Level 3: Environment-Specific Tests (Slow - 2-5min)

**What**: Deploy to staging environment and run smoke tests

**When**:

- After PR approval, before production deploy
- As part of release pipeline

**Tools**:

- Terraform/Ansible (future)
- Environment-specific Docker Compose overrides
- Real health checks against deployed services

**Example** (future):

```typescript
describe('Staging Environment', () => {
  it('should have Caddy serving HTTPS with valid cert', async () => {
    const { stdout } = await execAsync(
      'curl -sI https://staging.example.com/health',
    );
    expect(stdout).toMatch(/HTTP\/2 200/);
    expect(stdout).toMatch(/strict-transport-security/i);
  });
});
```

**Status**: Not implemented yet (blocked by staging environment setup)

---

## Multi-Environment Strategy

### Environment Definitions

```
environments/
├── development/       # Local Docker Compose
│   └── docker-compose.override.yml
├── testing/          # CI/CD pipeline
│   └── docker-compose.test.yml
├── staging/          # Pre-production (future)
│   └── terraform/
└── production/       # Live environment (future)
    └── terraform/
```

### Development Environment

**File**: `docker-compose.yml` (base)

**Purpose**: Local development with hot-reload, debug ports exposed

**Characteristics**:

- Self-signed TLS certificates
- Persistent volumes for fast restart
- Debug logging enabled
- Admin ports accessible (Prometheus, Grafana, Caddy admin)

**Run**:

```bash
docker compose up -d
```

---

### Testing Environment (CI/CD)

**File**: `docker-compose.test.yml` (future)

**Purpose**: Automated testing in GitHub Actions

**Characteristics**:

- Ephemeral containers (no volume persistence)
- Faster startup (skip unnecessary services)
- Headless mode (no UI dependencies)
- Strict health check timeouts

**Run**:

```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d
npm run test:integration
```

**Example override** (future `docker-compose.test.yml`):

```yaml
services:
  grafana:
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=test123 # Different from dev
      - GF_ANALYTICS_REPORTING_ENABLED=false
    healthcheck:
      timeout: 3s # Stricter than dev
```

---

### Staging Environment (Future)

**Infrastructure**: Hetzner server with Terraform

**Purpose**: Pre-production validation with real DNS, real TLS

**Characteristics**:

- Real domain name (staging.example.com)
- Let's Encrypt certificates
- Cloudflare WAF enabled (test mode)
- Production-like resource limits

**Deployment**:

```bash
cd environments/staging
terraform apply
ansible-playbook -i inventory/staging deploy.yml
```

**Validation**:

```bash
npm run test:staging  # Runs smoke tests against staging URL
```

---

### Production Environment (Future)

**Infrastructure**: Hetzner server with Terraform + Ansible

**Purpose**: Live production traffic

**Characteristics**:

- Real domain (api.example.com)
- Cloudflare WAF in blocking mode
- Prometheus alerting to PagerDuty
- Automated backups
- Blue-green deployment

**Deployment**:

```bash
cd environments/production
terraform plan  # Review changes
terraform apply  # Apply infrastructure
ansible-playbook -i inventory/production deploy.yml --check  # Dry run
ansible-playbook -i inventory/production deploy.yml  # Deploy
```

**Rollback**:

```bash
ansible-playbook -i inventory/production rollback.yml
```

---

## Test Execution Matrix

| Test Type         | Dev           | CI         | Staging       | Production    |
| ----------------- | ------------- | ---------- | ------------- | ------------- |
| Config Validation | ✅ Pre-commit | ✅ On push | ✅ Pre-deploy | ✅ Pre-deploy |
| Docker Startup    | ✅ Manual     | ✅ On PR   | ✅ Auto       | ❌ N/A        |
| Health Checks     | ✅ Manual     | ✅ On PR   | ✅ Auto       | ✅ Monitoring |
| Performance       | ❌ Skip       | ❌ Skip    | ✅ Weekly     | ✅ Continuous |
| Security Scan     | ❌ Skip       | ✅ On push | ✅ Pre-deploy | ✅ Daily      |

---

## CI/CD Integration

### GitHub Actions Workflow (Future)

```yaml
name: Infrastructure Tests

on:
  pull_request:
    paths:
      - 'infrastructure/**'
      - 'docker-compose*.yml'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Docker Compose
        run: |
          docker compose config --quiet
          npm run test -- test/infrastructure.test.ts

  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start Infrastructure
        run: docker compose up -d
      - name: Run Integration Tests
        run: npm run test:integration
      - name: Collect Logs
        if: failure()
        run: docker compose logs
      - name: Cleanup
        if: always()
        run: docker compose down -v
```

---

## Failure Scenarios & Rollback

### Scenario 1: Container Fails Health Check

**Detection**: `docker compose ps` shows unhealthy status

**Test**:

```typescript
it('should have all health checks passing', async () => {
  // Test fails if any container unhealthy after 30s
});
```

**Rollback**:

```bash
git revert <commit-hash>
docker compose down
docker compose up -d
```

---

### Scenario 2: Breaking Configuration Change

**Detection**: Config validation test fails in CI

**Test**:

```typescript
it('should have all required services defined', () => {
  expect(definedServices).toContain('caddy');
  expect(definedServices).toContain('prometheus');
});
```

**Rollback**: PR blocked, fix required before merge

---

### Scenario 3: Port Conflict

**Detection**: `docker compose up` fails with port already allocated

**Test**:

```typescript
it('should expose correct ports', async () => {
  // Verifies ports match expected configuration
});
```

**Resolution**: Update `docker-compose.yml` ports or stop conflicting service

---

## Monitoring Post-Deployment

### Health Check Validation

After deploying infrastructure changes, verify:

```bash
# All containers healthy
docker compose ps

# Prometheus scraping targets
curl http://localhost:19090/api/v1/targets | jq '.data.activeTargets[] | select(.health=="up")'

# Grafana datasource connected
curl -u admin:admin http://localhost:3000/api/datasources | jq '.[].name'

# Caddy serving traffic
curl -k https://localhost:18443/health
```

### Automated Smoke Tests

```bash
# Run after infrastructure deployment
npm run test:smoke
```

**Example smoke test** (future):

```typescript
describe('Post-Deployment Smoke Tests', () => {
  it('should respond to health checks within 5s', async () => {
    const start = Date.now();
    const response = await fetch('https://localhost:18443/health');
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(5000);
  });
});
```

---

## Best Practices

### DO ✅

1. **Version lock all images**: `caddy:2-alpine` not `caddy:latest`
2. **Test infrastructure changes locally first**: `docker compose up -d`
3. **Run integration tests before commit**: `npm run test:integration`
4. **Document breaking changes in ADR**: Create ADR-NNNN for infra decisions
5. **Use environment overrides**: Don't duplicate entire compose files
6. **Validate health checks timeout**: Containers should be healthy in < 30s

### DON'T ❌

1. **Don't bypass tests with `--no-verify`**: Tests exist for a reason
2. **Don't commit untested changes**: Always run `docker compose up` locally
3. **Don't use `latest` tags**: Breaks reproducibility
4. **Don't expose admin ports in production**: Bind to 127.0.0.1 or firewall
5. **Don't skip rollback planning**: Every deploy needs rollback documented
6. **Don't ignore health check failures**: Investigate before proceeding

---

## Current Status (Sprint 1)

### ✅ Completed

- Configuration validation tests (Level 1)
- Docker Compose startup tests (Level 2)
- Health check validation
- Port mapping verification

### 🔄 In Progress

- Security configuration tests
- Multi-environment overrides

### 📋 TODO (Sprint 2+)

- Staging environment setup
- Terraform/Ansible integration tests
- Performance benchmarking
- Disaster recovery testing
- CI/CD pipeline integration

---

## References

- **Test Implementation**: `test/infrastructure.test.ts`
- **Docker Compose**: `docker-compose.yml`
- **Infrastructure Docs**: `docs/INFRASTRUCTURE.md`
- **ADR Minimal Infra**: `docs/architecture/decisions/0001-minimal-infrastructure-yagni.md`

---

**Last Updated**: 2025-12-08  
**Owner**: DevOps Team  
**Review Frequency**: Per sprint retrospective
