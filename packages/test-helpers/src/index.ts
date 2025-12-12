/**
 * Test Helpers Package
 *
 * Provides automatic environment setup/teardown for integration tests
 * with support for parallel execution and Docker container management.
 */

export { createTestSuite, waitForService } from './test-suite.js';
export { PortAllocator, portAllocator } from './port-allocator.js';
export { DockerManager } from './docker-manager.js';
export { EnvironmentChecker } from './environment-checker.js';
export {
  startInfra,
  stopInfra,
  SERVICE_PORTS,
  SERVICE_URLS,
  type InfraService,
  type InfraLauncherOptions,
} from './infra-launcher.js';

// Testcontainers helpers
export * from './testcontainers/index.js';

export type { TestEnvironmentConfig, TestContext } from './types.js';
