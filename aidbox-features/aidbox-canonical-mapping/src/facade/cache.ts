/**
 * Redis-based TTL Cache
 * Shared cache for multiple facade instances
 */

import Redis from "ioredis";

export interface CacheConfig {
  redisUrl: string;
  ttlSeconds: number;
  keyPrefix?: string;
}

export class RedisCache<T> {
  private redis: Redis;
  private ttlSeconds: number;
  private keyPrefix: string;

  constructor(config: CacheConfig) {
    this.redis = new Redis(config.redisUrl);
    this.ttlSeconds = config.ttlSeconds;
    this.keyPrefix = config.keyPrefix ?? "fhir-facade:";

    this.redis.on("error", (err) => {
      console.error("[Cache] Redis error:", err.message);
    });

    this.redis.on("connect", () => {
      console.log("[Cache] Connected to Redis");
    });
  }

  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get(key: string): Promise<T | undefined> {
    const data = await this.redis.get(this.buildKey(key));
    if (!data) return undefined;

    try {
      return JSON.parse(data) as T;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: T): Promise<void> {
    const data = JSON.stringify(value);
    await this.redis.setex(this.buildKey(key), this.ttlSeconds, data);
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.redis.del(this.buildKey(key));
    return result > 0;
  }

  async clear(): Promise<void> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }
}

export function createCache<T>(): RedisCache<T> {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const ttlSeconds = parseInt(process.env.CACHE_TTL_SECONDS ?? "60");

  return new RedisCache<T>({
    redisUrl,
    ttlSeconds,
    keyPrefix: "fhir-facade:ward:",
  });
}
