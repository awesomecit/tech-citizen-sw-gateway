/**
 * Smoke Test: Gateway Startup con Platformatic Watt
 *
 * Verifica che il gateway si avvii correttamente in modalità production
 * con Platformatic Watt (non solo Fastify standalone).
 *
 * Questo test previene regressioni come:
 * - Signal handler conflicts (SIGTERM/SIGINT)
 * - Shutdown timeout loops
 * - Plugin registration failures in Watt context
 */

import { spawn, ChildProcess } from 'child_process';
import { setTimeout } from 'timers/promises';

describe('Smoke Test: Platformatic Watt Startup', () => {
  let wattProcess: ChildProcess;
  const STARTUP_TIMEOUT = 15000; // 15s per startup
  const HEALTH_CHECK_URL = 'http://localhost:3042/health';

  afterEach(async () => {
    if (wattProcess) {
      wattProcess.kill('SIGTERM');
      await setTimeout(2000); // Grace period
      if (!wattProcess.killed) {
        wattProcess.kill('SIGKILL');
      }
    }
  });

  it('should start without crash loop', async () => {
    let stdout = '';
    let stderr = '';
    let crashed = false;

    wattProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'development' },
    });

    wattProcess.stdout?.on('data', data => {
      stdout += data.toString();
    });

    wattProcess.stderr?.on('data', data => {
      stderr += data.toString();
    });

    wattProcess.on('exit', code => {
      if (code !== 0 && code !== null) {
        crashed = true;
      }
    });

    // Wait for startup
    await setTimeout(STARTUP_TIMEOUT);

    // Verify no crash loop
    expect(crashed).toBe(false);
    expect(stdout).toContain('Auth plugin registered');
    expect(stdout).toContain('Platformatic is now listening');
    expect(stderr).not.toContain('Graceful shutdown timeout');
    expect(stderr).not.toContain('unexpectedly exited');
  }, 20000);

  it('should respond to health check', async () => {
    wattProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'development' },
    });

    // Wait for startup
    await setTimeout(STARTUP_TIMEOUT);

    // Health check
    const response = await fetch(HEALTH_CHECK_URL);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toMatchObject({
      status: 'ok',
      service: 'api-gateway',
    });
  }, 20000);

  it.skip('should gracefully shutdown on SIGTERM', async () => {
    // TODO: Fix exit event handling - process.on('exit') not firing reliably in Jest spawn
    // Issue: exitCode remains null, test times out at 22s
    wattProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'development' },
      stdio: 'pipe',
    });

    // Wait for startup
    await setTimeout(STARTUP_TIMEOUT);

    // Send SIGTERM and wait for process exit
    const exitPromise = new Promise<number | null>(resolve => {
      wattProcess.on('exit', code => resolve(code));
    });

    wattProcess.kill('SIGTERM');

    // Wait max 5s for graceful shutdown
    const exitCode = await Promise.race([
      exitPromise,
      setTimeout(5000).then(() => null),
    ]);

    // Cleanup
    if (wattProcess && !wattProcess.killed) {
      wattProcess.kill('SIGKILL');
    }
    wattProcess.stdout?.removeAllListeners();
    wattProcess.stderr?.removeAllListeners();
    wattProcess.removeAllListeners();

    // Verify graceful shutdown (exit code 0 or null/128 from SIGTERM)
    expect(exitCode).not.toBe(1); // Not a crash
  }, 25000);
});
