/**
 * Cache Provider Port
 * Interface for cache adapters (Redis, In-Memory, Noop, etc.)
 * Future implementation - YAGNI for now
 */
export interface CacheProviderPort {
  /**
   * Get cached value by key
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set cached value with TTL
   */
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;

  /**
   * Delete cached value
   */
  delete(key: string): Promise<void>;

  /**
   * Check if cache is enabled
   */
  isEnabled(): boolean;

  /**
   * Get provider name for logging
   */
  getProviderName(): string;
}
