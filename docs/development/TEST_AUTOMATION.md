# Test Automation Strategy

**Date**: 2025-12-11  
**Status**: Implemented

## Overview

Every integration test is **self-contained** with automatic environment setup/teardown, supporting parallel execution through dynamic port allocation.

## Architecture

```
┌─────────────────────────────────────────┐
│  Integration Test Suite                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│  beforeAll:                              │
│   ✓ Validate environment (NODE_ENV=test)│
│   ✓ Allocate random ports (parallel)    │
│   ✓ Start Docker containers             │
│   ✓ Wait for healthchecks               │
│   ✓ Populate service URLs                │
│                                          │
│  Test Cases:                             │
│   → Use ctx.services.* for URLs         │
│   → Isolated port per test suite        │
│                                          │
│  afterAll:                               │
│   ✓ Stop containers                     │
│   ✓ Release ports                       │
│   ✓ Clean up resources                  │
└─────────────────────────────────────────┘
```

## Usage

### Basic Test

```typescript
import { describe, it, expect } from '@jest/globals';
import { createTestSuite } from '@tech-citizen/test-helpers';

describe('My Integration Test', () => {
  const ctx = createTestSuite({
    requires: [
      {
        service: 'keycloak',
        image: 'quay.io/keycloak/keycloak:23.0',
        // port omitted = random allocation for parallel execution
      },
    ],
    parallel: true,
  });

  it('should work', async () => {
    const url = ctx.services.keycloak.url; // http://localhost:RANDOM_PORT
    // ... test logic
  });
});
```

### Multi-Service Test

```typescript
const ctx = createTestSuite({
  requires: [
    { service: 'keycloak', image: 'quay.io/keycloak/keycloak:23.0' },
    { service: 'redis', image: 'redis:7-alpine' },
    { service: 'postgres', image: 'postgres:16-alpine' },
  ],
  parallel: true,
  cleanup: 'always', // 'always' | 'on-success' | 'never'
});
```

## Parallel Execution

### How It Works

1. **Port Allocator**: Uses `get-port` to find available ports
2. **Isolated Containers**: Each test suite gets unique ports
3. **No Conflicts**: Tests run concurrently without interference

```typescript
// Test Suite A gets ports: 52341, 52342
// Test Suite B gets ports: 52343, 52344
// Both run simultaneously ✓
```

### Jest Configuration

```javascript
// jest.integration.config.cjs
module.exports = {
  maxWorkers: 4, // Run 4 tests in parallel
  testTimeout: 60000,
};
```

## Environment Validation

### Safety Checks

Automatically validates before running tests:

```typescript
✓ NODE_ENV must be "test"
✓ DATABASE_NAME must contain "test"
⚠️ Warns on production-like env vars
```

### Manual Check

```bash
# Runs automatically in createTestSuite()
EnvironmentChecker.validate();
```

## Debug Mode

Keep containers running for inspection:

```bash
KEEP_CONTAINERS=true npm run test:integration
```

Then inspect:

```bash
docker ps | grep test-
docker logs test-keycloak-1234567890
docker exec -it test-keycloak-1234567890 bash
```

## Cleanup Strategies

| Strategy     | Behavior                           | Use Case          |
| ------------ | ---------------------------------- | ----------------- |
| `always`     | Clean up regardless of test result | CI/CD (default)   |
| `on-success` | Clean up only if tests pass        | Local debugging   |
| `never`      | Never clean up                     | Manual inspection |

```typescript
createTestSuite({
  cleanup: 'on-success', // Keep containers if tests fail
});
```

## Healthchecks

### Built-in Healthchecks

Services with default healthchecks:

- **Keycloak**: `GET /health/ready`
- **Redis**: `redis-cli ping`
- **PostgreSQL**: `pg_isready`
- **RabbitMQ**: `rabbitmq-diagnostics ping`

### Custom Healthcheck

```typescript
{
  service: 'custom',
  image: 'my-app:latest',
  healthcheck: {
    command: 'curl -f http://localhost:8080/health',
    interval: 2000,
    retries: 30,
    timeout: 10000,
  },
  startupTimeout: 60000,
}
```

## Best Practices

### 1. Always Use Parallel Mode

```typescript
parallel: true; // Enables random port allocation
```

### 2. Set Appropriate Timeouts

```typescript
{
  startupTimeout: 90000, // Keycloak needs ~60-90s
}
```

### 3. Use Environment Variables

```typescript
port: Number(process.env.KEYCLOAK_PORT) || 8091,
```

### 4. Reuse Existing Containers (Optional)

```typescript
reuseExisting: true, // Speeds up repeated local runs
```

### 5. Test Resource Cleanup

```typescript
afterAll(async () => {
  // Close database connections
  await db.close();

  // Close HTTP clients
  client.destroy();
});
```

## Migration Guide

### Before (Manual Setup)

```typescript
describe('Old Test', () => {
  beforeAll(async () => {
    // Manual Docker commands
    execSync('docker-compose up -d keycloak');
    await sleep(60000); // Hope it's ready?
  });

  afterAll(() => {
    execSync('docker-compose down');
  });

  it('test', async () => {
    const url = 'http://localhost:8091'; // Hardcoded!
    // ...
  });
});
```

### After (Automatic)

```typescript
describe('New Test', () => {
  const ctx = createTestSuite({
    requires: [
      { service: 'keycloak', image: 'quay.io/keycloak/keycloak:23.0' },
    ],
    parallel: true,
  });

  it('test', async () => {
    const url = ctx.services.keycloak.url; // Dynamic!
    // ...
  });
});
```

## Performance

### Startup Times

| Service    | Cold Start | Warm Start (reuse) |
| ---------- | ---------- | ------------------ |
| Keycloak   | ~60-90s    | ~5s                |
| Redis      | ~2-5s      | ~1s                |
| PostgreSQL | ~5-10s     | ~2s                |
| RabbitMQ   | ~10-20s    | ~3s                |

### Optimization Tips

1. **Reuse containers** locally: `reuseExisting: true`
2. **Pre-pull images**: `docker pull quay.io/keycloak/keycloak:23.0`
3. **Run parallel**: `maxWorkers: 4` in Jest config
4. **Use fast healthchecks**: `interval: 1000` for Redis

## Troubleshooting

### Tests Timeout

**Symptom**: Test hangs in `beforeAll`

**Solutions**:

- Increase `startupTimeout: 120000`
- Check Docker logs: `docker logs test-SERVICE-TIMESTAMP`
- Verify image exists: `docker images | grep SERVICE`

### Port Conflicts

**Symptom**: `EADDRINUSE: address already in use`

**Solutions**:

- Enable `parallel: true` for random ports
- Kill conflicting process: `lsof -ti:PORT | xargs kill -9`
- Use different base port range

### Container Already Exists

**Symptom**: `409 Conflict: container name already in use`

**Solutions**:

- Remove old containers: `docker rm -f $(docker ps -aq --filter "name=test-")`
- Use unique test suite names
- Enable `reuseExisting: true`

### Environment Validation Fails

**Symptom**: `❌ Tests must run in NODE_ENV=test`

**Solution**:

```bash
NODE_ENV=test npm run test:integration
```

## Examples

See:

- `packages/auth/test/keycloak-with-helpers.integration.test.ts`
- `packages/cache/test/redis-with-helpers.integration.test.ts`
- `packages/events/test/rabbitmq-with-helpers.integration.test.ts`

## Package

**npm**: `@tech-citizen/test-helpers`  
**Source**: `packages/test-helpers/`  
**Docs**: `packages/test-helpers/README.md`

## Related

- [TESTING.md](./TESTING.md) - Overall testing strategy
- [Environment Management](../operations/ENVIRONMENT_MANAGEMENT.md)
- [Docker Infrastructure](../infrastructure/INFRASTRUCTURE.md)
