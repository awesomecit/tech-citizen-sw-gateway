/**
 * Test Helpers Package
 *
 * Provides automatic environment setup/teardown for integration tests
 * with support for parallel execution and Docker container management.
 */

export { createTestSuite, waitForService } from './test-suite';
export { PortAllocator, portAllocator } from './port-allocator';
export { DockerManager } from './docker-manager';
export { EnvironmentChecker } from './environment-checker';
export {
  startInfra,
  stopInfra,
  SERVICE_PORTS,
  SERVICE_URLS,
  type InfraService,
  type InfraLauncherOptions,
} from './infra-launcher';

export type {
  TestEnvironmentConfig,
  TestContext,
  TestSuiteOptions,
} from './types';
