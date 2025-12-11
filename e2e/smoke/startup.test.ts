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
      // Remove all listeners to prevent memory leaks
      wattProcess.stdout?.removeAllListeners();
      wattProcess.stderr?.removeAllListeners();
      wattProcess.removeAllListeners();

      // Kill process
      wattProcess.kill('SIGTERM');
      await setTimeout(2000); // Grace period
      if (!wattProcess.killed) {
        wattProcess.kill('SIGKILL');
      }

      // Ensure process is fully cleaned up
      await setTimeout(500);
    }
  });

  it('should start without crash loop', async () => {
    let stdout = '';
    let stderr = '';
    let crashed = false;

    wattProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test' },
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
      env: { ...process.env, NODE_ENV: 'test' },
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

  it('should gracefully shutdown on SIGTERM', async () => {
    let exitCode: number | null = null;

    wattProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: 'pipe',
    });

    // Capture exit code
    wattProcess.on('exit', code => {
      exitCode = code;
    });

    // Wait for startup
    await setTimeout(STARTUP_TIMEOUT);

    // Send SIGTERM
    wattProcess.kill('SIGTERM');

    // Wait for process to exit (max 5s)
    let waited = 0;
    while (exitCode === null && waited < 5000) {
      await setTimeout(100);
      waited += 100;
    }

    // Verify graceful shutdown (exit code 0, null, or 143 from SIGTERM are acceptable)
    // Exit code 1 would indicate a crash
    expect(exitCode).not.toBe(1);
  }, 25000);
});
