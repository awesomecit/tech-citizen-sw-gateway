# Test Helpers

Automatic environment setup/teardown for integration tests with Docker container management and parallel execution support.

## Features

- ✅ **Automatic setup/teardown** - Start/stop services in `beforeAll`/`afterAll`
- ✅ **Parallel execution safe** - Random port allocation prevents conflicts
- ✅ **Environment validation** - Prevents accidental production test runs
- ✅ **Docker management** - Healthchecks, image pulling, container cleanup
- ✅ **Debug mode** - Keep containers running with `KEEP_CONTAINERS=true`

## Installation

```bash
npm install @tech-citizen/test-helpers
```

## Usage

### Basic Integration Test

```typescript
import { describe, it, expect } from '@jest/globals';
import { createTestSuite, waitForService } from '@tech-citizen/test-helpers';

describe('Keycloak Integration', () => {
  // Automatic setup/teardown
  const ctx = createTestSuite({
    requires: [
      {
        service: 'keycloak',
        image: 'quay.io/keycloak/keycloak:23.0',
        port: 8091, // Optional: uses random port if omitted
        env: {
          KEYCLOAK_ADMIN: 'admin',
          KEYCLOAK_ADMIN_PASSWORD: 'admin',
        },
        startupTimeout: 60000,
      },
    ],
    parallel: true, // Safe for concurrent execution
    cleanup: 'always', // 'always' | 'on-success' | 'never'
  });

  it('should connect to Keycloak', async () => {
    // Service URL populated automatically
    const response = await fetch(`${ctx.services.keycloak.url}/health`);
    expect(response.ok).toBe(true);
  });

  it('should authenticate user', async () => {
    const tokenUrl = `${ctx.services.keycloak.url}/realms/${ctx.services.keycloak.realm}/protocol/openid-connect/token`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: ctx.services.keycloak.clientId,
        username: 'test@example.com',
        password: 'password123',
      }),
    });

    expect(response.ok).toBe(true);
  });
});
```

### Multiple Services

```typescript
const ctx = createTestSuite({
  requires: [
    {
      service: 'keycloak',
      image: 'quay.io/keycloak/keycloak:23.0',
      env: { KEYCLOAK_ADMIN: 'admin' },
    },
    {
      service: 'redis',
      image: 'redis:7-alpine',
      healthcheck: {
        command: 'redis-cli ping',
        interval: 1000,
        retries: 30,
        timeout: 5000,
      },
    },
    {
      service: 'postgres',
      image: 'postgres:16-alpine',
      env: {
        POSTGRES_DB: 'test_db',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
      },
    },
  ],
  parallel: true,
});

it('should access all services', () => {
  expect(ctx.services.keycloak).toBeDefined();
  expect(ctx.services.redis).toBeDefined();
  expect(ctx.services.postgres).toBeDefined();
});
```

### Debug Mode

Keep containers running after tests for manual inspection:

```bash
KEEP_CONTAINERS=true npm run test:integration
```

### Manual Cleanup

```typescript
afterAll(async () => {
  await ctx.cleanup();
});
```

## API Reference

### `createTestSuite(options)`

Creates test suite with automatic lifecycle management.

**Options:**

- `requires`: Array of service configurations
- `parallel`: Enable random port allocation (default: `false`)
- `cleanup`: Cleanup strategy - `'always'`, `'on-success'`, `'never'` (default: `'always'`)
- `keepAlive`: Keep containers running (default: from `KEEP_CONTAINERS` env)

**Returns:** `TestContext` with `services`, `containers`, `cleanup()`

### `waitForService(url, options?)`

Wait for service to respond to HTTP requests.

```typescript
await waitForService('http://localhost:8091', {
  timeout: 30000,
  interval: 1000,
  path: '/health',
});
```

### Environment Validation

Automatically validates:

- ✅ `NODE_ENV=test` required
- ✅ Database names must contain "test"
- ⚠️ Warns on production-like env vars

Override validation:

```typescript
import { EnvironmentChecker } from '@tech-citizen/test-helpers';

EnvironmentChecker.validate(); // Throws if unsafe
EnvironmentChecker.loadTestEnv(); // Loads .env.test
```

## Configuration Examples

### Keycloak with Realm Import

```typescript
{
  service: 'keycloak',
  image: 'quay.io/keycloak/keycloak:23.0',
  env: {
    KEYCLOAK_ADMIN: 'admin',
    KEYCLOAK_ADMIN_PASSWORD: 'admin',
    KC_HEALTH_ENABLED: 'true',
  },
  healthcheck: {
    command: 'curl -f http://localhost:8080/health/ready',
    interval: 2000,
    retries: 30,
    timeout: 10000,
  },
  startupTimeout: 90000,
}
```

### Redis with Persistence

```typescript
{
  service: 'redis',
  image: 'redis:7-alpine',
  env: {
    REDIS_PASSWORD: 'test123',
  },
  healthcheck: {
    command: 'redis-cli --raw incr ping',
    interval: 1000,
    retries: 10,
    timeout: 3000,
  },
}
```

## Parallel Execution

Jest configuration for parallel tests:

```javascript
// jest.integration.config.cjs
module.exports = {
  maxWorkers: 4, // Run 4 tests concurrently
  testTimeout: 60000,
};
```

Each test suite gets isolated ports automatically.

## Best Practices

1. **Always use `parallel: true`** for concurrent test execution
2. **Set appropriate timeouts** - Services may take 30-90s to start
3. **Use healthchecks** - Don't rely on "sleep" delays
4. **Clean up resources** - Close connections in `afterAll`
5. **Test environment isolation** - Use `.env.test` file

## Troubleshooting

### Container fails to start

Check Docker logs:

```bash
docker logs test-keycloak-1234567890
```

### Port conflicts

Enable parallel mode to use random ports:

```typescript
parallel: true;
```

### Tests timeout

Increase `startupTimeout`:

```typescript
startupTimeout: 120000; // 2 minutes
```

## License

MIT
