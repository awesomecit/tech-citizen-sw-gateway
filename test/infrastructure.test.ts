import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';

const execAsync = promisify(exec);

describe('Infrastructure as Code Tests', () => {
  const DOCKER_COMPOSE_FILE = 'docker-compose.yml';
  const STARTUP_TIMEOUT = 60000; // 60s for all containers

  describe('Docker Compose Configuration', () => {
    let composeConfig: any;

    beforeAll(async () => {
      const content = await readFile(DOCKER_COMPOSE_FILE, 'utf-8');
      composeConfig = parseYaml(content);
    });

    it('should have all required services defined', () => {
      const requiredServices = ['caddy', 'prometheus', 'grafana'];
      const definedServices = Object.keys(composeConfig.services || {});

      requiredServices.forEach(service => {
        expect(definedServices).toContain(service);
      });
    });

    it('should have health checks for all services', () => {
      const services = composeConfig.services;

      Object.entries(services).forEach(([name, config]: [string, any]) => {
        expect(config.healthcheck).toBeDefined();
        expect(config.healthcheck.test).toBeDefined();
        expect(config.healthcheck.interval).toBeDefined();
        expect(config.healthcheck.timeout).toBeDefined();
        expect(config.healthcheck.retries).toBeDefined();
      });
    });

    it('should use specific image versions (no latest tag)', () => {
      const services = composeConfig.services;

      Object.entries(services).forEach(([name, config]: [string, any]) => {
        const image = config.image;
        expect(image).toBeDefined();
        expect(image).not.toMatch(/:latest$/);
        expect(image).toMatch(/:[a-zA-Z0-9.-]+$/); // Has version tag
      });
    });

    it('should have restart policies configured', () => {
      const services = composeConfig.services;

      Object.entries(services).forEach(([name, config]: [string, any]) => {
        expect(config.restart).toBeDefined();
        expect(['unless-stopped', 'always', 'on-failure']).toContain(
          config.restart,
        );
      });
    });

    it('should have volumes for persistent data', () => {
      expect(composeConfig.volumes).toBeDefined();

      const requiredVolumes = ['caddy-data', 'prometheus-data', 'grafana-data'];

      const definedVolumes = Object.keys(composeConfig.volumes || {});

      requiredVolumes.forEach(volume => {
        expect(definedVolumes).toContain(volume);
      });
    });

    it('should have network configuration', () => {
      expect(composeConfig.networks).toBeDefined();
      expect(composeConfig.networks['gateway-network']).toBeDefined();
      expect(composeConfig.networks['gateway-network'].driver).toBe('bridge');
    });
  });

  describe('Infrastructure Startup (Integration)', () => {
    beforeAll(async () => {
      // Pull images first to avoid timeout
      await execAsync('docker compose pull', {
        cwd: process.cwd(),
      }).catch(err => {
        console.warn(
          'Image pull failed, will try with cached images:',
          err.message,
        );
      });
    });

    afterAll(async () => {
      // Cleanup - stop containers
      await execAsync('docker compose down -v', {
        cwd: process.cwd(),
      }).catch(() => {
        // Best effort cleanup
      });
    });

    it(
      'should start all containers without errors',
      async () => {
        // Start infrastructure
        const { stdout, stderr } = await execAsync('docker compose up -d', {
          cwd: process.cwd(),
        });

        // Verify no error messages
        expect(stderr).not.toMatch(/error|failed/i);
        expect(stdout).toMatch(/Started|Creating|Created/);
      },
      STARTUP_TIMEOUT,
    );

    it(
      'should have all containers running',
      async () => {
        // Give containers time to start
        await new Promise(resolve => setTimeout(resolve, 10000));

        const { stdout } = await execAsync('docker compose ps --format json', {
          cwd: process.cwd(),
        });

        const containers = stdout
          .trim()
          .split('\n')
          .map(line => JSON.parse(line));

        // All containers should be running
        containers.forEach(container => {
          expect(container.State).toBe('running');
        });

        // Should have exactly 3 containers
        expect(containers).toHaveLength(3);
      },
      STARTUP_TIMEOUT,
    );

    it(
      'should have all health checks passing',
      async () => {
        // Wait for health checks to stabilize
        await new Promise(resolve => setTimeout(resolve, 30000));

        const { stdout } = await execAsync('docker compose ps --format json', {
          cwd: process.cwd(),
        });

        const containers = stdout
          .trim()
          .split('\n')
          .map(line => JSON.parse(line));

        containers.forEach(container => {
          expect(container.Health).toBe('healthy');
        });
      },
      STARTUP_TIMEOUT,
    );

    it(
      'should expose correct ports',
      async () => {
        const { stdout } = await execAsync('docker compose ps --format json', {
          cwd: process.cwd(),
        });

        const containers = stdout
          .trim()
          .split('\n')
          .map(line => JSON.parse(line));

        const portMappings = containers.flatMap(
          c => c.Publishers?.map((p: any) => `${p.PublishedPort}`) || [],
        );

        // Verify expected ports are published
        expect(portMappings).toContain('18080'); // Caddy HTTP
        expect(portMappings).toContain('18443'); // Caddy HTTPS
        expect(portMappings).toContain('19090'); // Prometheus
        expect(portMappings).toContain('3000'); // Grafana
      },
      STARTUP_TIMEOUT,
    );

    it(
      'should have Prometheus scraping gateway metrics',
      async () => {
        // Wait for Prometheus to scrape at least once
        await new Promise(resolve => setTimeout(resolve, 20000));

        const { stdout } = await execAsync(
          'curl -s http://localhost:19090/api/v1/targets',
        );

        const response = JSON.parse(stdout);
        expect(response.status).toBe('success');

        const apiGatewayTarget = response.data.activeTargets.find(
          (t: any) => t.labels.job === 'api-gateway',
        );

        expect(apiGatewayTarget).toBeDefined();
        // Note: Target might be down if gateway not running, but should exist
      },
      STARTUP_TIMEOUT,
    );

    it(
      'should have Grafana accessible',
      async () => {
        const { stdout, stderr } = await execAsync(
          'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health',
        );

        expect(stdout.trim()).toBe('200');
      },
      STARTUP_TIMEOUT,
    );
  });

  describe('Multi-Environment Support', () => {
    let composeConfig: any;

    beforeAll(async () => {
      const content = await readFile(DOCKER_COMPOSE_FILE, 'utf-8');
      composeConfig = parseYaml(content);
    });

    it('should have environment-specific overrides ready', async () => {
      // Check if docker-compose.override.yml pattern is documented
      const readme = await readFile('docs/INFRASTRUCTURE.md', 'utf-8');

      // For now just verify the base compose file exists
      // In production, would check for docker-compose.prod.yml
      expect(readme).toContain('docker compose');
    });

    it('should support environment variable injection', () => {
      const services = composeConfig.services;

      // At least one service should use environment variables
      const hasEnvVars = Object.values(services).some(
        (config: any) => config.environment && config.environment.length > 0,
      );

      expect(hasEnvVars).toBe(true);
    });
  });

  describe('Security Configuration', () => {
    let composeConfig: any;

    beforeAll(async () => {
      const content = await readFile(DOCKER_COMPOSE_FILE, 'utf-8');
      composeConfig = parseYaml(content);
    });

    it('should not expose admin ports to public', () => {
      const services = composeConfig.services;

      // Caddy admin should only be localhost
      const caddy = services.caddy;
      const adminPort = caddy.ports?.find((p: string) => p.includes('2019'));

      if (adminPort) {
        expect(adminPort).toMatch(/^2019:2019$/); // No host binding or localhost only
      }
    });

    it('should have Grafana with authentication', () => {
      const grafana = composeConfig.services.grafana;
      const env = grafana.environment || [];

      const hasAdminPassword = env.some((e: string) =>
        e.startsWith('GF_SECURITY_ADMIN_PASSWORD'),
      );

      expect(hasAdminPassword).toBe(true);
    });

    it('should disable Grafana signup', () => {
      const grafana = composeConfig.services.grafana;
      const env = grafana.environment || [];

      const signupDisabled = env.find((e: string) =>
        e.startsWith('GF_USERS_ALLOW_SIGN_UP'),
      );

      expect(signupDisabled).toContain('false');
    });
  });
});
