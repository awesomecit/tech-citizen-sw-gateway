import { describe, it, expect } from '@jest/globals';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

describe('Server Startup Smoke Test', () => {
  it('should start wattpm without errors', async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      // Avvia il server in background
      const serverProcess = exec(
        'npm run dev',
        {
          cwd: process.cwd(),
          signal: controller.signal,
        },
        (error, stdout, stderr) => {
          // Processo terminato o abortito
          if (error && !controller.signal.aborted) {
            throw error;
          }
        },
      );

      // Aspetta che il server sia pronto
      await new Promise((resolve, reject) => {
        let output = '';
        let startupTimeout: NodeJS.Timeout | undefined;

        serverProcess.stdout?.on('data', data => {
          output += data.toString();

          // Server avviato con successo
          if (output.includes('Platformatic is now listening')) {
            clearTimeout(timeout);
            if (startupTimeout) clearTimeout(startupTimeout);
            resolve(true);
          }

          // Errore critico durante startup
          if (output.includes('failed to start') || output.includes('ERROR')) {
            clearTimeout(timeout);
            if (startupTimeout) clearTimeout(startupTimeout);
            reject(new Error(`Server startup failed: ${output}`));
          }
        });

        serverProcess.stderr?.on('data', data => {
          const errorMsg = data.toString();
          if (!errorMsg.includes('ExperimentalWarning')) {
            if (startupTimeout) clearTimeout(startupTimeout);
            reject(new Error(`Server error: ${errorMsg}`));
          }
        });

        // Timeout
        startupTimeout = setTimeout(() => {
          reject(new Error('Server startup timeout after 15s'));
        }, 15000);
      });

      // Test che il server risponda
      const { stdout } = await execAsync(
        'curl -s http://127.0.0.1:3042/health',
      );
      const response = JSON.parse(stdout);

      expect(response).toMatchObject({
        status: 'ok',
        service: 'api-gateway',
        version: '1.0.0',
      });
      expect(response.timestamp).toBeTruthy();
    } finally {
      clearTimeout(timeout);
      controller.abort();
      // Killa il processo wattpm
      await execAsync('pkill -f wattpm || true').catch(() => {});
    }
  }, 20000);
});
