import { createServer } from 'node:net';

/**
 * Port allocation for parallel test execution
 * Prevents port conflicts when running tests concurrently
 */
export class PortAllocator {
  private allocatedPorts: Set<number> = new Set();

  /**
   * Allocate random available port (workaround for get-port ESM incompatibility with jest)
   */
  async allocate(preferredPort?: number): Promise<number> {
    if (preferredPort) {
      this.allocatedPorts.add(preferredPort);
      return preferredPort;
    }

    // Find available port by trying to bind to random port
    return new Promise((resolve, reject) => {
      const server = createServer();
      server.unref();
      server.on('error', reject);
      server.listen(0, () => {
        const { port } = server.address() as { port: number };
        server.close(() => {
          this.allocatedPorts.add(port);
          resolve(port);
        });
      });
    });
  }

  /**
   * Release port after test cleanup
   */
  release(port: number): void {
    this.allocatedPorts.delete(port);
  }

  /**
   * Release all allocated ports
   */
  releaseAll(): void {
    this.allocatedPorts.clear();
  }

  /**
   * Get all currently allocated ports
   */
  getAllocated(): number[] {
    return Array.from(this.allocatedPorts);
  }
}

// Global instance for test suite
export const portAllocator = new PortAllocator();
