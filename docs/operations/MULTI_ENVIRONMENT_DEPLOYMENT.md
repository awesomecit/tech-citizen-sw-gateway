# Multi-Environment Ansible Deployment

> **Principles**: DRY, SOLID, Idempotent  
> **Environments**: Production, Test, Staging  
> **Last Updated**: 2025-12-12

---

## Architecture

### Playbook Structure (SOLID Principles)

```
ansible/playbooks/
├── deploy-environment.yml      # Orchestrator (calls others in sequence)
├── 01-prepare-server.yml       # Single Responsibility: Security & Firewall
├── 02-check-dependencies.yml   # Single Responsibility: Docker installation
├── 03-prepare-directories.yml  # Single Responsibility: Directory structure
├── 04-deploy-files.yml         # Single Responsibility: File synchronization
├── 05-start-containers.yml     # Single Responsibility: Container management
└── 06-health-check.yml         # Single Responsibility: Health verification
```

**Benefits**:

- ✅ **DRY**: Each playbook is reusable across environments
- ✅ **SOLID**: Single responsibility per playbook
- ✅ **Idempotent**: Safe to run multiple times (skips if already done)
- ✅ **Testable**: Can run individual steps for debugging
- ✅ **Auditable**: Clear separation of concerns

---

## Environment Configuration

### Directory Structure

| Environment    | Root Directory         | Container Prefix  |
| -------------- | ---------------------- | ----------------- |
| **Production** | `/opt/gateway`         | `gateway`         |
| **Test**       | `/opt/gateway-test`    | `gateway-test`    |
| **Staging**    | `/opt/gateway-staging` | `gateway-staging` |

### Port Mappings

| Service         | Production | Test  | Staging |
| --------------- | ---------- | ----- | ------- |
| **HTTP**        | 80         | 8080  | 8180    |
| **HTTPS**       | 443        | 8443  | 8543    |
| **Caddy Admin** | 2019       | 2019  | 2019    |
| **Prometheus**  | 19090      | 19091 | 19092   |
| **Grafana**     | 3000       | 3001  | 3002    |

**Rationale**: Offset ports avoid conflicts when running multiple environments on same server.

---

## Usage

### Deploy Test Environment

```bash
# Deploy test environment to production server
bash scripts/deploy-test.sh

# Run tests remotely
bash scripts/run-remote-tests.sh
```

**What it does**:

1. ✅ Prepares server (security, firewall) - **skipped if already done**
2. ✅ Installs Docker - **skipped if already installed**
3. ✅ Creates `/opt/gateway-test` directory
4. ✅ Copies config files (docker-compose.yml, .env.test)
5. ✅ Starts containers with `gateway-test` prefix
6. ✅ Runs health checks
7. ✅ Executes remote tests via SSH

---

### Deploy Production Environment

```bash
# Full production deployment
bash scripts/ansible-production.sh bootstrap

# Or use new modular approach
source ~/secrets/production.env
ansible-playbook \
  -i ansible/inventory/hosts.ini \
  ansible/playbooks/deploy-environment.yml \
  --limit=production \
  -e "environment=production"
```

---

### Run Individual Steps

```bash
# Just check dependencies
ansible-playbook \
  -i ansible/inventory/hosts.ini \
  ansible/playbooks/02-check-dependencies.yml \
  --limit=test \
  -e "environment=test"

# Just health check
ansible-playbook \
  -i ansible/inventory/hosts.ini \
  ansible/playbooks/06-health-check.yml \
  --limit=test \
  -e "environment=test"

# Dry run (check mode)
ansible-playbook \
  ansible/playbooks/deploy-environment.yml \
  --check --diff \
  -e "environment=test"
```

---

## Configuration Files

### Environment Variables

**Production**: `~/secrets/production.env` (gitignored)

```bash
export PRODUCTION_SERVER_IP="46.224.61.146"
export DOMAIN="tech-citizen.me"
export SSL_EMAIL="awesome.cit.dev@gmail.com"
```

**Test**: `.env.test` (in repository, safe defaults)

```bash
export ENVIRONMENT=test
export COMPOSE_PROJECT_NAME=gateway-test
export CADDY_HTTP_PORT=8080
export LOG_LEVEL=debug
export SSL_STAGING=true
```

### Ansible Group Variables

**Production**: `ansible/inventory/group_vars/production.yml`

```yaml
environment: production
deployment_root: /opt/gateway
caddy_http_port: 80
ssl_staging: false
```

**Test**: `ansible/inventory/group_vars/test.yml`

```yaml
environment: test
deployment_root: /opt/gateway-test
caddy_http_port: 8080
ssl_staging: true
```

---

## Idempotency Examples

### Docker Installation (Playbook 02)

```yaml
- name: Check if Docker is installed
  command: docker --version
  register: docker_version_check
  failed_when: false

- name: Install Docker packages
  apt:
    name: [docker-ce, docker-ce-cli, ...]
  when: docker_version_check.rc != 0 # ← Only if not installed
```

**Result**:

- First run: Installs Docker (~2 minutes)
- Second run: Skips installation (instant)

---

### Directory Creation (Playbook 03)

```yaml
- name: Create deployment root directory
  file:
    path: '{{ deployment_root }}'
    state: directory
```

**Result**:

- First run: Creates `/opt/gateway-test`
- Second run: No change (idempotent)

---

### File Deployment (Playbook 04)

```yaml
- name: Copy docker-compose.yml
  template:
    src: '{{ playbook_dir }}/../../docker-compose.yml'
    dest: '{{ deployment_root }}/docker-compose.yml'
  register: docker_compose_copied
```

**Result**:

- `docker_compose_copied.changed == true` → File updated
- `docker_compose_copied.changed == false` → File unchanged

---

## Testing Workflow

### 1. Deploy Test Environment

```bash
bash scripts/deploy-test.sh
```

**Output**:

```
🧪 Deploying TEST environment to production server
✓ Secrets loaded
✓ Inventory generated
🚀 Starting deployment...

PLAY [Deploy Gateway - Full Stack]
TASK [Validate environment variable] ok
PLAY [Step 1 - Prepare Server]
TASK [Configure UFW - Allow SSH] skipped (already configured)
...
✅ Test environment deployed successfully
```

---

### 2. Run Remote Tests

```bash
bash scripts/run-remote-tests.sh
```

**What it does**:

1. Copies `test/`, `e2e/`, `package.json` to `/opt/gateway-test`
2. Installs Node.js on server (if not present)
3. Runs `npm install --omit=dev`
4. Executes `npm run test:unit`
5. Executes `npm run test:integration:infra`
6. Checks container health
7. Checks endpoint health (Caddy, Prometheus, Grafana)

**Output**:

```
🧪 Running tests on remote test environment
✓ Target: 46.224.61.146
✓ Test environment found
📤 Copying test files to server...
📦 Installing test dependencies...
🧪 Running unit tests...
  PASS test/server-startup.test.ts
🩺 Checking container health...
  gateway-test-caddy: Up (healthy)
✓ Caddy: OK
✓ Prometheus: OK
✓ Grafana: OK
✅ Remote tests complete
```

---

## CI/CD Integration

### GitLab CI Example

```yaml
# .gitlab-ci.yml
stages:
  - test
  - deploy-test
  - deploy-prod

test-local:
  stage: test
  script:
    - npm install
    - npm run test

deploy-test-env:
  stage: deploy-test
  only:
    - develop
  script:
    - bash scripts/deploy-test.sh
    - bash scripts/run-remote-tests.sh
  environment:
    name: test
    url: http://$PRODUCTION_SERVER_IP:8080

deploy-production:
  stage: deploy-prod
  only:
    - main
  when: manual
  script:
    - bash scripts/ansible-production.sh bootstrap
  environment:
    name: production
    url: https://www.tech-citizen.me
```

---

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [develop, main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test

  deploy-test:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/hetzner_techcitizen
          chmod 600 ~/.ssh/hetzner_techcitizen
      - name: Deploy Test
        run: bash scripts/deploy-test.sh
      - name: Run Tests
        run: bash scripts/run-remote-tests.sh

  deploy-prod:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Production
        run: bash scripts/ansible-production.sh bootstrap
```

---

## Troubleshooting

### Issue: "Environment not found"

```bash
bash scripts/run-remote-tests.sh
❌ Test environment not found. Run: bash scripts/deploy-test.sh
```

**Solution**: Deploy test environment first.

---

### Issue: "Port already in use"

```
Error starting userland proxy: listen tcp4 0.0.0.0:80: bind: address already in use
```

**Solution**: Production using port 80. Test uses 8080 (no conflict).

---

### Issue: "Container name conflict"

```
Conflict. The container name "/gateway-caddy" is already in use
```

**Solution**: Test uses `gateway-test-caddy` prefix (no conflict).

---

### Issue: "Health check failed"

```
fatal: [gateway-test]: FAILED! => Deployment health check failed
```

**Debug**:

```bash
# Check container logs
ssh root@46.224.61.146 "docker logs gateway-test-caddy"

# Check container status
ssh root@46.224.61.146 "docker ps -a | grep gateway-test"

# Re-run health check only
ansible-playbook \
  ansible/playbooks/06-health-check.yml \
  -e "environment=test"
```

---

## Migration from Old Bootstrap

### Old Approach (bootstrap.yml)

```bash
# Monolithic playbook - 436 lines
bash scripts/ansible-production.sh bootstrap

# Problems:
# - Not reusable for test environment
# - Hard to debug individual steps
# - Duplicated logic for different environments
```

### New Approach (Modular)

```bash
# Modular playbooks - 6 x ~100 lines each
bash scripts/deploy-test.sh       # Test
bash scripts/ansible-production.sh deploy  # Production (future)

# Benefits:
# - DRY: Same playbooks for all environments
# - SOLID: Single responsibility per playbook
# - Idempotent: Safe to re-run
# - Testable: Run individual steps
```

---

## Next Steps

1. ✅ Test environment deployment working
2. ⏳ Migrate `ansible-production.sh` to use new modular playbooks
3. ⏳ Add staging environment support
4. ⏳ CI/CD pipeline integration (GitLab/GitHub Actions)
5. ⏳ Automated rollback on failed health check
6. ⏳ Blue-green deployment support

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-12  
**Maintainer**: DevOps Team
