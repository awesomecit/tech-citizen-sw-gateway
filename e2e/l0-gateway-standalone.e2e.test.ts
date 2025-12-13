/**
 * E2E Test: L0 Gateway Standalone
 *
 * Validates that gateway L0 (Level 0 - Core) meets all requirements:
 * - Starts in < 5s
 * - Health check responds 200
 * - Metrics endpoint accessible (even with telemetry=false)
 * - Graceful shutdown (SIGTERM/SIGINT)
 * - RAM usage < 150MB
 *
 * Run: npm run test:e2e -- e2e/l0-gateway-standalone.e2e.test.ts
 */

import { test } from 'tap';
import { spawn, type ChildProcess } from 'child_process';
import { fetch } from 'undici';

/**
 * Helper: Wait for gateway to be ready
 * Polls health endpoint until 200 or timeout
 */
async function waitForGateway(
  url: string,
  timeoutMs = 10000,
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.status === 200) {
        return true;
      }
    } catch {
      // Gateway not ready yet, retry
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

/**
 * Helper: Get process memory usage in MB
 * Uses ps command to get RSS (Resident Set Size)
 */
async function getProcessMemoryMB(pid: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const ps = spawn('ps', ['-o', 'rss=', '-p', String(pid)]);
    let output = '';

    ps.stdout.on('data', data => {
      output += data.toString();
    });

    ps.on('close', code => {
      if (code !== 0) {
        reject(new Error(`ps command failed with code ${code}`));
        return;
      }
      const rssKB = parseInt(output.trim(), 10);
      const rssMB = rssKB / 1024;
      resolve(rssMB);
    });
  });
}

test('L0 Gateway Standalone - Full Validation', async t => {
  let gateway: ChildProcess | null = null;
  const GATEWAY_PORT = 3042;
  const BASE_URL = `http://localhost:${GATEWAY_PORT}`;

  t.teardown(async () => {
    if (gateway && !gateway.killed) {
      gateway.kill('SIGTERM');
      // Wait for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });

  await t.test('1. Gateway starts in < 5s', async t => {
    const startTime = Date.now();

    // Start gateway standalone (no Docker Compose, only Watt)
    gateway = spawn('npx', ['watt'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(GATEWAY_PORT),
        LOG_LEVEL: 'info',
        PLT_SERVER_HOSTNAME: '0.0.0.0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Capture logs for debugging
    let logs = '';
    gateway.stdout?.on('data', data => {
      logs += data.toString();
    });
    gateway.stderr?.on('data', data => {
      logs += data.toString();
    });

    // Wait for gateway to be ready
    const ready = await waitForGateway(`${BASE_URL}/health`, 10000);
    const elapsedTime = Date.now() - startTime;

    t.ok(ready, 'Gateway started successfully');
    t.ok(elapsedTime < 5000, `Started in ${elapsedTime}ms (< 5000ms)`);

    if (!ready) {
      console.error('Gateway startup logs:', logs);
      t.fail('Gateway failed to start');
    }
  });

  await t.test('2. Health check returns 200', async t => {
    const response = await fetch(`${BASE_URL}/health`);
    t.equal(response.status, 200, 'Health endpoint returns 200');

    const body = await response.json();
    t.ok(body, 'Health endpoint returns JSON');
    // Expected structure: { status: "ok", timestamp: "..." }
    t.ok(body.status, 'Health response includes status field');
  });

  await t.test('3. Metrics endpoint accessible', async t => {
    // Metrics should be accessible even with telemetry=false
    // Gateway always exposes /metrics for Prometheus scraping
    const response = await fetch(`${BASE_URL}/metrics`);
    t.equal(response.status, 200, 'Metrics endpoint returns 200');

    const body = await response.text();
    t.ok(
      body.includes('http_request'),
      'Metrics include HTTP request counters',
    );
    t.ok(
      body.includes('# HELP'),
      'Metrics follow Prometheus text format (includes HELP)',
    );
    t.ok(
      body.includes('# TYPE'),
      'Metrics follow Prometheus text format (includes TYPE)',
    );
  });

  await t.test('4. RAM usage < 150MB', async t => {
    if (!gateway || !gateway.pid) {
      t.fail('Gateway process not available');
      return;
    }

    // Generate some traffic to warm up
    await Promise.all([
      fetch(`${BASE_URL}/health`),
      fetch(`${BASE_URL}/metrics`),
      fetch(`${BASE_URL}/health`),
    ]);

    // Wait for memory to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    const memoryMB = await getProcessMemoryMB(gateway.pid);
    t.ok(memoryMB < 150, `RAM usage ${memoryMB.toFixed(2)}MB < 150MB`);
    console.log(`   Gateway RAM usage: ${memoryMB.toFixed(2)}MB`);
  });

  await t.test('5. Graceful shutdown (SIGTERM)', async t => {
    if (!gateway || !gateway.pid) {
      t.fail('Gateway process not available');
      return;
    }

    const shutdownPromise = new Promise<number | null>(resolve => {
      gateway!.on('exit', code => {
        resolve(code);
      });
    });

    // Send SIGTERM (graceful shutdown signal)
    gateway.kill('SIGTERM');

    // Wait for shutdown (max 10s)
    const timeoutPromise = new Promise<null>(resolve =>
      setTimeout(() => resolve(null), 10000),
    );

    const exitCode = await Promise.race([shutdownPromise, timeoutPromise]);

    t.ok(exitCode !== null, 'Gateway shut down within 10s');
    t.equal(exitCode, 0, 'Graceful shutdown returns exit code 0');
  });

  await t.test('6. Graceful shutdown (SIGINT)', async t => {
    // Restart gateway for SIGINT test
    gateway = spawn('npx', ['watt'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(GATEWAY_PORT),
        LOG_LEVEL: 'info',
        PLT_SERVER_HOSTNAME: '0.0.0.0',
      },
      stdio: ['ignore', 'ignore', 'ignore'],
    });

    // Wait for startup
    const ready = await waitForGateway(`${BASE_URL}/health`, 10000);
    t.ok(ready, 'Gateway restarted successfully');

    const shutdownPromise = new Promise<number | null>(resolve => {
      gateway!.on('exit', code => {
        resolve(code);
      });
    });

    // Send SIGINT (Ctrl+C signal)
    gateway.kill('SIGINT');

    const timeoutPromise = new Promise<null>(resolve =>
      setTimeout(() => resolve(null), 10000),
    );

    const exitCode = await Promise.race([shutdownPromise, timeoutPromise]);

    t.ok(exitCode !== null, 'Gateway shut down within 10s (SIGINT)');
    t.equal(exitCode, 0, 'Graceful shutdown returns exit code 0 (SIGINT)');
  });
});

test('L0 Gateway - Error Handling', async t => {
  const GATEWAY_PORT = 3042;
  const BASE_URL = `http://localhost:${GATEWAY_PORT}`;

  await t.test('404 for unknown routes', async t => {
    const response = await fetch(`${BASE_URL}/unknown-route`);
    t.equal(response.status, 404, 'Unknown route returns 404');
  });

  await t.test(
    'Health check survives multiple concurrent requests',
    async t => {
      // Stress test with 50 concurrent requests
      const requests = Array(50)
        .fill(null)
        .map(() => fetch(`${BASE_URL}/health`));

      const responses = await Promise.all(requests);
      const allSuccess = responses.every(r => r.status === 200);

      t.ok(allSuccess, 'All 50 concurrent health checks succeeded');
    },
  );
});
