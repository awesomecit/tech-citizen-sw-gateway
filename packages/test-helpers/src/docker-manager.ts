import Docker from 'dockerode';
import { TestEnvironmentConfig } from './types.js';

const MAX_HEALTHCHECK_ATTEMPTS = 30;
const HEALTHCHECK_INTERVAL_MS = 1000;

/**
 * Docker container lifecycle management for tests
 */
export class DockerManager {
  private docker: Docker;
  private containers: Map<string, Docker.Container> = new Map();

  constructor() {
    this.docker = new Docker();
  }

  /**
   * Start service container with healthcheck
   */
  async startService(config: TestEnvironmentConfig): Promise<{
    containerId: string;
    port: number;
  }> {
    const containerName = `test-${config.service}-${Date.now()}`;

    // Check if reusing existing container
    if (config.reuseExisting) {
      const existing = await this.findRunningContainer(config.service);
      if (existing) {
        console.log(`✓ Reusing existing ${config.service} container`);
        return {
          containerId: existing.id,
          port: config.port!,
        };
      }
    }

    console.log(`🚀 Starting ${config.service} on port ${config.port}...`);

    // Pull image if not exists
    await this.ensureImage(config.image);

    // Create container
    const container = await this.docker.createContainer({
      name: containerName,
      Image: config.image,
      Env: this.formatEnvVars(config.env),
      ExposedPorts: {
        [`${config.port}/tcp`]: {},
      },
      HostConfig: {
        PortBindings: {
          [`${config.port}/tcp`]: [{ HostPort: String(config.port) }],
        },
        AutoRemove: true,
      },
    });

    this.containers.set(config.service, container);

    // Start container
    await container.start();

    // Wait for healthy
    await this.waitForHealthy(container, config);

    console.log(`✓ ${config.service} ready on port ${config.port}`);

    return {
      containerId: container.id,
      port: config.port!,
    };
  }

  /**
   * Stop and remove container
   */
  async stopService(service: string): Promise<void> {
    const container = this.containers.get(service);
    if (!container) {
      return;
    }

    try {
      await container.stop({ t: 5 });
      await container.remove();
      console.log(`✓ Stopped ${service} container`);
    } catch (error) {
      // Container may already be removed (AutoRemove)
      if (
        !(error instanceof Error) ||
        !error.message.includes('No such container')
      ) {
        console.warn(`⚠️  Failed to stop ${service}:`, error);
      }
    } finally {
      this.containers.delete(service);
    }
  }

  /**
   * Stop all managed containers
   */
  async stopAll(): Promise<void> {
    const services = Array.from(this.containers.keys());
    await Promise.all(services.map(service => this.stopService(service)));
  }

  /**
   * Check if container is healthy
   */
  private async waitForHealthy(
    container: Docker.Container,
    config: TestEnvironmentConfig,
  ): Promise<void> {
    const timeout = config.startupTimeout || 60000;
    const startTime = Date.now();

    for (let attempt = 0; attempt < MAX_HEALTHCHECK_ATTEMPTS; attempt++) {
      if (Date.now() - startTime > timeout) {
        throw new Error(
          `${config.service} failed to start within ${timeout}ms`,
        );
      }

      const isHealthy = await this.checkContainerHealth(
        container,
        config,
        startTime,
      );
      if (isHealthy) {
        return;
      }

      await this.sleep(HEALTHCHECK_INTERVAL_MS);
    }

    throw new Error(
      `${config.service} healthcheck failed after ${MAX_HEALTHCHECK_ATTEMPTS} attempts`,
    );
  }

  /**
   * Check container health status
   */
  private async checkContainerHealth(
    container: Docker.Container,
    config: TestEnvironmentConfig,
    startTime: number,
  ): Promise<boolean> {
    try {
      const inspect = await container.inspect();

      if (!inspect.State.Running) {
        throw new Error(`${config.service} container stopped unexpectedly`);
      }

      if (config.healthcheck) {
        return await this.runCustomHealthcheck(container, config);
      }

      // Default: check if running for 2 seconds
      return Date.now() - startTime > 2000;
    } catch {
      return false;
    }
  }

  /**
   * Run custom healthcheck command
   */
  private async runCustomHealthcheck(
    container: Docker.Container,
    config: TestEnvironmentConfig,
  ): Promise<boolean> {
    const exec = await container.exec({
      Cmd: config.healthcheck!.command.split(' '),
      AttachStdout: true,
      AttachStderr: true,
    });

    await exec.start({ Detach: false });
    const exitCode = (await exec.inspect()).ExitCode;
    return exitCode === 0;
  }

  /**
   * Find running container by service type
   */
  private async findRunningContainer(
    service: string,
  ): Promise<{ id: string } | null> {
    const containers = await this.docker.listContainers({
      filters: {
        name: [`test-${service}`],
        status: ['running'],
      },
    });

    return containers[0] ? { id: containers[0].Id } : null;
  }

  /**
   * Ensure Docker image exists locally
   */
  private async ensureImage(image: string): Promise<void> {
    try {
      await this.docker.getImage(image).inspect();
    } catch {
      console.log(`📥 Pulling image ${image}...`);
      await new Promise((resolve, reject) => {
        this.docker.pull(
          image,
          (err: Error | null, stream: NodeJS.ReadableStream) => {
            if (err) {
              return reject(err);
            }

            this.docker.modem.followProgress(stream, (err, output) => {
              if (err) {
                return reject(err);
              }
              resolve(output);
            });
          },
        );
      });
    }
  }

  /**
   * Format environment variables for Docker API
   */
  private formatEnvVars(env?: Record<string, string>): string[] {
    if (!env) {
      return [];
    }
    return Object.entries(env).map(([key, value]) => `${key}=${value}`);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
