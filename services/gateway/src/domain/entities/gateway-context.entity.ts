import { randomUUID } from 'crypto';

/**
 * Gateway Context Entity
 * Domain entity representing request context metadata
 * Pure business logic, no framework dependencies
 */

export interface GatewayContextData {
  requestId: string;
  startTime: number;
  method: string;
  url: string;
}

export class GatewayContextEntity {
  private readonly data: GatewayContextData;

  constructor(data: GatewayContextData) {
    this.validate(data);
    this.data = { ...data };
  }

  private validate(data: GatewayContextData): void {
    if (!data.requestId || data.requestId.trim().length === 0) {
      throw new Error('Request ID is required');
    }
    if (data.startTime <= 0) {
      throw new Error('Start time must be positive');
    }
    if (!data.method || data.method.trim().length === 0) {
      throw new Error('HTTP method is required');
    }
    if (!data.url || data.url.trim().length === 0) {
      throw new Error('URL is required');
    }
  }

  get requestId(): string {
    return this.data.requestId;
  }

  get startTime(): number {
    return this.data.startTime;
  }

  get method(): string {
    return this.data.method;
  }

  get url(): string {
    return this.data.url;
  }

  /**
   * Calculate elapsed time in milliseconds
   */
  getElapsedTime(currentTime: number = Date.now()): number {
    return currentTime - this.data.startTime;
  }

  /**
   * Create context with correlation ID from header or generate new
   */
  static fromHeaders(
    headers: Record<string, string | undefined>,
    method: string,
    url: string,
  ): GatewayContextEntity {
    const requestId = headers['x-request-id'] || this.generateRequestId();
    return new GatewayContextEntity({
      requestId,
      startTime: Date.now(),
      method,
      url,
    });
  }

  private static generateRequestId(): string {
    // Use crypto randomUUID for production-grade UUIDs
    return randomUUID();
  }
}
