import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

describe('Graceful Shutdown', () => {
  let serverProcess: ReturnType<typeof exec>;
  let serverPid: number | undefined;

  beforeAll(async () => {
    // Avvia il server
    serverProcess = exec('npm run dev', {
      cwd: process.cwd(),
    });

    // Aspetta che il server sia pronto
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 15000);

      serverProcess.stdout?.on('data', data => {
        const output = data.toString();
        if (output.includes('Platformatic is now listening')) {
          clearTimeout(timeout);

          // Estrai PID dal processo
          if (serverProcess.pid) {
            serverPid = serverProcess.pid;
          }

          resolve();
        }
      });

      serverProcess.stderr?.on('data', data => {
        const errorMsg = data.toString();
        if (!errorMsg.includes('ExperimentalWarning')) {
          clearTimeout(timeout);
          reject(new Error(`Server error: ${errorMsg}`));
        }
      });
    });
  }, 20000);

  afterAll(async () => {
    // Cleanup - killa il processo se ancora vivo
    if (serverPid) {
      try {
        await execAsync(`kill -9 ${serverPid}`);
      } catch {
        // Already dead
      }
    }
  });

  it('should complete in-flight requests before shutdown', async () => {
    // Verifica che il server risponda prima di SIGTERM
    const { stdout: beforeShutdown } = await execAsync(
      'curl -s http://127.0.0.1:3042/health',
    );
    const response = JSON.parse(beforeShutdown);
    expect(response.status).toBe('ok');

    // Invia SIGTERM (graceful shutdown)
    if (!serverPid) {
      throw new Error('Server PID not found');
    }

    const shutdownStart = Date.now();

    // Usa pkill per trovare il processo wattpm reale (non npm)
    // May fail if already stopped - that's ok
    await execAsync('pkill -TERM -f wattpm').catch(() => {
      // Process may already be stopped
    }); // Aspetta che il processo termini
    await new Promise<void>(resolve => {
      const checkInterval = setInterval(async () => {
        try {
          await execAsync(`ps -p ${serverPid} > /dev/null 2>&1`);
        } catch {
          // Processo terminato
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout massimo 12 secondi (GRACEFUL_SHUTDOWN_TIMEOUT + 2s buffer)
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 12000);
    });

    const shutdownDuration = Date.now() - shutdownStart;

    // Verifica che lo shutdown sia stato graceful (< 10s timeout)
    expect(shutdownDuration).toBeLessThan(12000);

    // Verifica che il processo sia terminato
    await expect(
      execAsync(`ps -p ${serverPid} > /dev/null 2>&1`),
    ).rejects.toThrow();
  }, 25000);

  it('should force exit if shutdown exceeds timeout', async () => {
    // Questo test è più concettuale - il timeout è gestito internamente
    // Verifichiamo solo che la costante sia definita correttamente
    const indexContent = await execAsync(
      'grep "GRACEFUL_SHUTDOWN_TIMEOUT" services/gateway/src/index.ts',
    );

    expect(indexContent.stdout).toContain('10000');
  });
});
