import { beforeAll, afterAll } from '@jest/globals';
import { TestContext, TestSuiteOptions } from './types.js';
import { DockerManager } from './docker-manager.js';
import { portAllocator } from './port-allocator.js';
import { EnvironmentChecker } from './environment-checker.js';

/**
 * Create test suite with automatic environment setup/teardown
 *
 * @example
 * ```typescript
 * describe('Keycloak Integration', () => {
 *   const ctx = createTestSuite({
 *     requires: [
 *       {
 *         service: 'keycloak',
 *         image: 'quay.io/keycloak/keycloak:23.0',
 *         env: { KEYCLOAK_ADMIN: 'admin' }
 *       }
 *     ],
 *     parallel: true
 *   });
 *
 *   it('should authenticate', async () => {
 *     const response = await fetch(`${ctx.services.keycloak.url}/health`);
 *     expect(response.ok).toBe(true);
 *   });
 * });
 * ```
 */
// eslint-disable-next-line max-lines-per-function, complexity, sonarjs/cognitive-complexity
export function createTestSuite(options: TestSuiteOptions): TestContext {
  const dockerManager = new DockerManager();
  const context: TestContext = {
    services: {},
    containers: new Map(),
    cleanup: async () => {
      await dockerManager.stopAll();
      portAllocator.releaseAll();
    },
  };

  // eslint-disable-next-line complexity, sonarjs/cognitive-complexity
  beforeAll(async () => {
    // Validate environment safety
    EnvironmentChecker.validate();
    EnvironmentChecker.loadTestEnv();

    // Check for KEEP_CONTAINERS debug flag (future use for manual cleanup)
    const _keepAlive =
      options.keepAlive || process.env.KEEP_CONTAINERS === 'true';

    // Allocate ports for parallel execution
    if (options.parallel) {
      for (const config of options.requires) {
        if (!config.port) {
          config.port = await portAllocator.allocate();
        }
      }
    }

    // Start all required services
    for (const config of options.requires) {
      const { containerId, port } = await dockerManager.startService(config);
      context.containers.set(config.service, containerId);

      // Populate service URLs
      switch (config.service) {
        case 'keycloak':
          context.services.keycloak = {
            url: `http://localhost:${port}`,
            port,
            realm: config.env?.KEYCLOAK_REALM || 'healthcare-domain',
            clientId: config.env?.KEYCLOAK_CLIENT_ID || 'test-client',
          };
          break;

        case 'redis':
          context.services.redis = {
            url: `redis://localhost:${port}`,
            port,
          };
          break;

        case 'rabbitmq':
          context.services.rabbitmq = {
            url: `amqp://localhost:${port}`,
            port,
            adminPort: port + 10000, // Management UI typically +10000
          };
          break;

        case 'postgres':
          context.services.postgres = {
            url: `postgresql://localhost:${port}/${config.env?.POSTGRES_DB || 'test'}`,
            port,
            database: config.env?.POSTGRES_DB || 'test',
          };
          break;
      }
    }

    console.log('\n✓ Test environment ready\n');
  }, 120000); // 2 minute timeout for setup

  afterAll(async () => {
    const keepAlive =
      options.keepAlive || process.env.KEEP_CONTAINERS === 'true';
    const cleanupStrategy = options.cleanup || 'always';

    if (keepAlive) {
      console.log('\n⏸️  Keeping containers running (KEEP_CONTAINERS=true)\n');
      return;
    }

    if (cleanupStrategy === 'never') {
      console.log('\n⏸️  Skipping cleanup (cleanup=never)\n');
      return;
    }

    // TODO: Check test results for 'on-success' strategy

    await context.cleanup();
    console.log('\n✓ Test environment cleaned up\n');
  }, 30000); // 30 second timeout for cleanup

  return context;
}

/**
 * Wait for service to be ready (additional check after Docker healthcheck)
 */
export async function waitForService(
  url: string,
  options: {
    timeout?: number;
    interval?: number;
    path?: string;
  } = {},
): Promise<void> {
  const timeout = options.timeout || 30000;
  const interval = options.interval || 1000;
  const path = options.path || '/health';
  const fullUrl = `${url}${path}`;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(fullUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Service not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Service at ${url} failed to respond within ${timeout}ms`);
}
