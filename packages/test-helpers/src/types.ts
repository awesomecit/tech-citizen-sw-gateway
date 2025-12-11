/**
 * Test environment configuration with dynamic port allocation
 */
export interface TestEnvironmentConfig {
  /** Service name (keycloak, redis, rabbitmq) */
  service: 'keycloak' | 'redis' | 'rabbitmq' | 'postgres';

  /** Randomly allocated port (prevents parallel test conflicts) */
  port?: number;

  /** Docker image to use */
  image: string;

  /** Environment variables for container */
  env?: Record<string, string>;

  /** Healthcheck configuration */
  healthcheck?: {
    command: string;
    interval: number;
    retries: number;
    timeout: number;
  };

  /** Startup timeout in milliseconds */
  startupTimeout?: number;

  /** Whether to reuse existing container */
  reuseExisting?: boolean;
}

/**
 * Test context with running services
 */
export interface TestContext {
  /** Service URLs with allocated ports */
  services: {
    keycloak?: {
      url: string;
      port: number;
      realm: string;
      clientId: string;
    };
    redis?: {
      url: string;
      port: number;
    };
    rabbitmq?: {
      url: string;
      port: number;
      adminPort: number;
    };
    postgres?: {
      url: string;
      port: number;
      database: string;
    };
  };

  /** Cleanup function (call in afterAll) */
  cleanup: () => Promise<void>;

  /** Container IDs for manual management */
  containers: Map<string, string>;
}

/**
 * Test suite options
 */
export interface TestSuiteOptions {
  /** Required services */
  requires: TestEnvironmentConfig[];

  /** Parallel execution safe (uses random ports) */
  parallel?: boolean;

  /** Cleanup strategy */
  cleanup?: 'always' | 'on-success' | 'never';

  /** Keep containers running for debugging */
  keepAlive?: boolean;
}
