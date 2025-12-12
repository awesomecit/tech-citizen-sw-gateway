/**
 * Testcontainers Helper: Redis
 * Shared helper for starting Redis containers in integration tests
 */
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers';

export interface RedisContainerConfig {
  image?: string;
  port?: number;
  waitTimeout?: number;
}

const DEFAULT_CONFIG: Required<RedisContainerConfig> = {
  image: 'redis:7-alpine',
  port: 6379,
  waitTimeout: 30_000,
};

export class RedisTestContainer {
  private container: StartedTestContainer | null = null;
  private config: Required<RedisContainerConfig>;

  constructor(config: RedisContainerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<{ host: string; port: number; url: string }> {
    console.log(`🐳 Starting Redis container (${this.config.image})...`);

    this.container = await new GenericContainer(this.config.image)
      .withExposedPorts(this.config.port)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .withStartupTimeout(this.config.waitTimeout)
      .start();

    const host = this.container.getHost();
    const port = this.container.getMappedPort(this.config.port);
    const url = `redis://${host}:${port}`;

    console.log(`✅ Redis running at ${url}`);

    return { host, port, url };
  }

  async stop(): Promise<void> {
    if (this.container) {
      console.log('🧹 Stopping Redis container...');
      await this.container.stop();
      this.container = null;
    }
  }

  getContainer(): StartedTestContainer {
    if (!this.container) {
      throw new Error('Container not started. Call start() first.');
    }
    return this.container;
  }
}
