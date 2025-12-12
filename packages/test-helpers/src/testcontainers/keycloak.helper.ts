/**
 * Testcontainers Helper: Keycloak
 * Shared helper for starting Keycloak containers in integration tests
 */
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers';

export interface KeycloakContainerConfig {
  image?: string;
  port?: number;
  adminUser?: string;
  adminPassword?: string;
  waitTimeout?: number;
}

const DEFAULT_CONFIG: Required<KeycloakContainerConfig> = {
  image: 'quay.io/keycloak/keycloak:26.0',
  port: 8080,
  adminUser: 'admin',
  adminPassword: 'admin',
  waitTimeout: 180_000, // 3 minutes for Keycloak startup
};

export class KeycloakTestContainer {
  private container: StartedTestContainer | null = null;
  private config: Required<KeycloakContainerConfig>;

  constructor(config: KeycloakContainerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<{ host: string; port: number; url: string }> {
    console.log(`🐳 Starting Keycloak container (${this.config.image})...`);

    this.container = await new GenericContainer(this.config.image)
      .withEnvironment({
        KEYCLOAK_ADMIN: this.config.adminUser,
        KEYCLOAK_ADMIN_PASSWORD: this.config.adminPassword,
      })
      .withCommand(['start-dev'])
      .withExposedPorts(this.config.port)
      .withWaitStrategy(
        Wait.forLogMessage(/Running the server in development mode/),
      )
      .withStartupTimeout(this.config.waitTimeout)
      .start();

    const host = this.container.getHost();
    const port = this.container.getMappedPort(this.config.port);
    const url = `http://${host}:${port}`;

    console.log(`✅ Keycloak running at ${url}`);

    return { host, port, url };
  }

  async stop(): Promise<void> {
    if (this.container) {
      console.log('🧹 Stopping Keycloak container...');
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

  /**
   * Get admin token for Keycloak Admin API
   */
  async getAdminToken(baseUrl: string): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: this.config.adminUser,
      password: this.config.adminPassword,
    });

    const response = await fetch(
      `${baseUrl}/realms/master/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      },
    );

    const data = await response.json();
    return data.access_token;
  }
}
