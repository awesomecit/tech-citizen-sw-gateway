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

  it('should gracefully shutdown on SIGTERM', async () => {
    let exitCode: number | null = null;
    let cleanupLogged = false;
    let stdout = '';

    wattProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'development' },
    });

    wattProcess.stdout?.on('data', data => {
      stdout += data.toString();
      if (stdout.includes('Cleaning up resources')) {
        cleanupLogged = true;
      }
    });

    wattProcess.on('exit', code => {
      exitCode = code;
    });

    // Wait for startup
    await setTimeout(STARTUP_TIMEOUT);

    // Send SIGTERM
    wattProcess.kill('SIGTERM');

    // Wait for graceful shutdown
    await setTimeout(5000);

    expect(exitCode).not.toBe(1); // Not a crash
    expect(cleanupLogged).toBe(true);
  }, 25000);
});
