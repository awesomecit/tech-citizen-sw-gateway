import getPort from 'get-port';

/**
 * Port allocation for parallel test execution
 * Prevents port conflicts when running tests concurrently
 */
export class PortAllocator {
  private allocatedPorts: Set<number> = new Set();

  /**
   * Allocate random available port
   */
  async allocate(preferredPort?: number): Promise<number> {
    const port = await getPort({ port: preferredPort });
    this.allocatedPorts.add(port);
    return port;
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
