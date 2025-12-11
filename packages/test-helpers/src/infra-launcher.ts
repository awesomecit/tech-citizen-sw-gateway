import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Infrastructure Launcher via Bash Scripts
 *
 * Calls bash scripts for Docker infra setup/teardown
 * Tests use Node for data/connections logic
 */

const PROJECT_ROOT = resolve(__dirname, '../../../');
const START_SCRIPT = resolve(PROJECT_ROOT, 'scripts/test-infra-start.sh');
const STOP_SCRIPT = resolve(PROJECT_ROOT, 'scripts/test-infra-stop.sh');

export type InfraService = 'keycloak' | 'redis' | 'postgres' | 'rabbitmq';

export interface InfraLauncherOptions {
  services: InfraService[];
  timeout?: number; // milliseconds
}

/**
 * Start test infrastructure via bash script
 */
export async function startInfra(options: InfraLauncherOptions): Promise<void> {
  const { services, timeout = 180000 } = options; // 3min default (Keycloak needs ~90-120s)

  console.log(`[test-helpers] Starting infrastructure: ${services.join(', ')}`);

  try {
    execSync(`bash ${START_SCRIPT} ${services.join(' ')}`, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      timeout,
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to start infrastructure: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Stop test infrastructure via bash script
 */
export async function stopInfra(options: InfraLauncherOptions): Promise<void> {
  const { services } = options;

  console.log(`[test-helpers] Stopping infrastructure: ${services.join(', ')}`);

  try {
    execSync(`bash ${STOP_SCRIPT} ${services.join(' ')}`, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });
  } catch (error) {
    console.error(
      `[test-helpers] Warning: Failed to stop infrastructure: ${error instanceof Error ? error.message : String(error)}`,
    );
    // Non-fatal: cleanup failures shouldn't break tests
  }
}

/**
 * Service connection details (after bash startup)
 */
export const SERVICE_PORTS: Record<InfraService, number> = {
  keycloak: 8090,
  redis: 6381,
  postgres: 5433,
  rabbitmq: 5673,
};

export const SERVICE_URLS: Record<InfraService, string> = {
  keycloak: 'http://localhost:8090',
  redis: 'redis://localhost:6381',
  postgres:
    'postgresql://gateway_test:test_password@localhost:5433/gateway_test',
  rabbitmq: 'amqp://localhost:5673',
};
