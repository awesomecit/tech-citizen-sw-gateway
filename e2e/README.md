# E2E Testing Guide

## Overview

Full-stack end-to-end tests using Cucumber (Gherkin scenarios) + Testcontainers (Keycloak, Redis).

## Prerequisites

- Node.js 22+
- Docker (for Testcontainers)
- All dependencies installed (`npm install`)

## Running E2E Tests

### Quick Start

```bash
# Run all E2E tests with Cucumber
npm run test:e2e:cucumber
```

### Test Structure

```text
e2e/
├── features/               # Gherkin scenarios (.feature files)
│   ├── auth-login.feature  # Login flow
│   └── auth-session-refresh.feature  # Session refresh logic
├── steps/                  # TypeScript step definitions
│   ├── auth-login.steps.ts
│   └── auth-session-refresh.steps.ts
└── helpers/                # Utility functions
    └── keycloak-setup.ts   # Keycloak realm/user creation
```

## Feature Files

Written in Gherkin (Italian language):

```gherkin
Scenario: Login con credenziali valide
  Dato che il gateway è in esecuzione
  E che Keycloak è configurato con realm "test"
  E che esiste un utente "testuser" con password "testpass"
  Quando l'utente effettua login con username "testuser" e password "testpass"
  Allora il login ha successo
  E riceve un access token valido
  E riceve un refresh token valido
  E la sessione viene salvata in Redis
```

## Step Definitions

TypeScript files implementing Given/When/Then steps:

- **Before hook**: Starts Redis + Keycloak containers
- **After hook**: Stops containers and cleans up
- **Given/When/Then**: Maps Gherkin steps to code

## Testcontainers

E2E tests use real containers:

- **Redis**: 7-alpine (session storage)
- **Keycloak**: 26.0 (OAuth/OIDC provider)

Containers start before each test scenario and stop after completion.

## Configuration

### Cucumber Config (`cucumber.config.js`)

```javascript
export default {
  paths: ['e2e/features/**/*.feature'],
  import: ['e2e/steps/**/*.ts'],
  timeout: 90000, // 90s for container startup
  parallel: 1, // Sequential execution for stability
};
```

### Timeouts

- **Default step timeout**: 90 seconds (allows Keycloak startup)
- **Container startup**: ~30-40 seconds
- **Test execution**: ~60-120 seconds per scenario

## Debugging

### View Container Logs

Testcontainers logs are visible in test output. For more detailed logs:

```bash
# Run with verbose output
DEBUG=testcontainers* npm run test:e2e:cucumber
```

### Manual Container Inspection

If tests fail, check Docker containers:

```bash
docker ps -a  # List all containers
docker logs <container-id>  # View logs
```

### Common Issues

**Container startup timeout**:

- Increase timeout in step definitions: `setDefaultTimeout(120000)`
- Check Docker resources (CPU, memory)

**Keycloak Admin API errors**:

- Verify admin credentials (default: admin/admin)
- Check Keycloak is fully started (logs show "started in X ms")

**Redis connection errors**:

- Verify port mapping: `redisContainer.getMappedPort(6379)`
- Check Redis container is running

## Writing New Tests

### 1. Create Feature File

```gherkin
# e2e/features/my-feature.feature
Feature: My New Feature

  Scenario: Happy path
    Given some precondition
    When some action
    Then expected outcome
```

### 2. Implement Step Definitions

```typescript
// e2e/steps/my-feature.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Given('some precondition', async function (this: TestWorld) {
  // Setup code
});

When('some action', async function (this: TestWorld) {
  // Action code
});

Then('expected outcome', async function (this: TestWorld) {
  // Assertion code
  expect(this.lastResponse?.status).to.equal(200);
});
```

### 3. Run Tests

```bash
npm run test:e2e:cucumber
```

## CI/CD Integration

E2E tests run in Woodpecker CI pipeline:

```yaml
# .woodpecker/e2e.yml (example)
pipeline:
  e2e-tests:
    image: node:22-alpine
    commands:
      - npm ci
      - npm run test:e2e:cucumber
    when:
      branch: [main, develop]
```

Testcontainers requires Docker socket access in CI.

## Best Practices

1. **Keep scenarios focused**: One scenario = one user journey
2. **Use Background for setup**: Shared Given steps
3. **Avoid implementation details**: Gherkin should be business-readable
4. **Clean up resources**: After hook stops containers
5. **Use meaningful step names**: Match business language

## References

- [Cucumber Documentation](https://cucumber.io/docs/cucumber/)
- [Testcontainers Node](https://node.testcontainers.org/)
- [Chai Assertions](https://www.chaijs.com/)
- EXAGONAL.md (hexagonal architecture testing strategy)
