import Redis from 'ioredis';

/**
 * High-Performance Hybrid Cache Service
 * 
 * Architecture:
 * - L1: In-Memory (Local to worker) - Nanosecond access
 * - L2: Redis (Global to cluster) - Microsecond access, massive scale
 * 
 * Features:
 * - Distributed synchronization
 * - Graceful fallback (Works without Redis)
 * - Automatic eviction
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  namespace?: string;
}

export class CacheService {
  private l1Cache = new Map<string, CacheEntry<any>>();
  private redis: Redis | null = null;
  private readonly maxSize: number;
  private readonly defaultTTLSeconds: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private hits = { l1: 0, l2: 0 };
  private misses = 0;

  constructor(options?: { 
    maxSize?: number; 
    defaultTTLSeconds?: number; 
    cleanupIntervalSeconds?: number;
    redisUrl?: string;
  }) {
    this.maxSize = options?.maxSize ?? 2000;
    this.defaultTTLSeconds = options?.defaultTTLSeconds ?? 300;
    const cleanupMs = (options?.cleanupIntervalSeconds ?? 60) * 1000;

    // Initialize Redis if URL provided
    if (options?.redisUrl || process.env.REDIS_URL) {
      try {
        this.redis = new Redis(options?.redisUrl || process.env.REDIS_URL!, {
          maxRetriesPerRequest: null,
          retryStrategy: (times) => Math.min(times * 50, 2000),
          connectTimeout: 5000,
        });

        this.redis.on('error', (err) => {
          console.error('🔴 Redis Error:', err.message);
        });

        this.redis.on('connect', () => {
          console.log('📡 Redis L2 Cache Connected');
        });
      } catch (err) {
        console.warn('⚠️  Redis failed to initialize. Falling back to L1 only mode.');
      }
    }

    this.cleanupInterval = setInterval(() => this.evictExpired(), cleanupMs);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Get a cached value (L1 -> L2 fallback)
   */
  async get<T>(key: string): Promise<T | undefined> {
    // 1. Check L1 (In-Memory)
    const entry = this.l1Cache.get(key);
    if (entry && Date.now() <= entry.expiresAt) {
      this.hits.l1++;
      return entry.value as T;
    }

    // 2. Check L2 (Redis)
    if (this.redis) {
      try {
        const val = await this.redis.get(key);
        if (val) {
          const parsed = JSON.parse(val);
          this.hits.l2++;
          
          // Backfill L1
          this.l1Cache.set(key, {
            value: parsed.v,
            expiresAt: parsed.e,
            namespace: parsed.n
          });
          
          return parsed.v as T;
        }
      } catch (err) {
        console.error('❌ Redis Get Error:', err);
      }
    }

    this.misses++;
    return undefined;
  }

  /**
   * Set a value in both L1 and L2
   */
  async set<T>(key: string, value: T, ttlSeconds?: number, namespace?: string): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTTLSeconds;
    const expiresAt = Date.now() + ttl * 1000;

    // 1. Update L1
    if (this.l1Cache.size >= this.maxSize && !this.l1Cache.has(key)) {
      const firstKey = this.l1Cache.keys().next().value;
      if (firstKey !== undefined) this.l1Cache.delete(firstKey);
    }
    this.l1Cache.set(key, { value, expiresAt, namespace });

    // 2. Update L2 (Redis)
    if (this.redis) {
      try {
        const payload = JSON.stringify({ v: value, e: expiresAt, n: namespace });
        await this.redis.setex(key, ttl, payload);
        
        // If namespaced, add to the namespace set for invalidation
        if (namespace) {
          await this.redis.sadd(`ns:${namespace}`, key);
          await this.redis.expire(`ns:${namespace}`, ttl + 3600); // Buffer for ns set
        }
      } catch (err) {
        console.error('❌ Redis Set Error:', err);
      }
    }
  }

  /**
   * Primary method for cache-through patterns
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number,
    namespace?: string
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;

    const value = await factory();
    await this.set(key, value, ttlSeconds, namespace);
    return value;
  }

  /**
   * Delete from both L1 and L2
   */
  async delete(key: string): Promise<void> {
    this.l1Cache.delete(key);
    if (this.redis) {
      await this.redis.del(key).catch(console.error);
    }
  }

  /**
   * Invalidate entire namespace across the cluster
   */
  async invalidateNamespace(namespace: string): Promise<void> {
    // 1. Clear local L1
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.namespace === namespace) {
        this.l1Cache.delete(key);
      }
    }

    // 2. Clear L2 and notify other workers
    if (this.redis) {
      try {
        const keys = await this.redis.smembers(`ns:${namespace}`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        await this.redis.del(`ns:${namespace}`);
        
        // TODO: Use Redis Pub/Sub to invalidate L1 on other instances if needed
      } catch (err) {
        console.error('❌ Redis Namespace Invalidation Error:', err);
      }
    }
  }

  getStats() {
    const total = this.hits.l1 + this.hits.l2 + this.misses;
    return {
      l1Size: this.l1Cache.size,
      l2Status: this.redis ? 'connected' : 'disabled',
      hitsL1: this.hits.l1,
      hitsL2: this.hits.l2,
      misses: this.misses,
      hitRate: total > 0 ? (((this.hits.l1 + this.hits.l2) / total) * 100).toFixed(1) + '%' : '0%',
    };
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.l1Cache.entries()) {
      if (now > entry.expiresAt) this.l1Cache.delete(key);
    }
  }

  async destroy(): Promise<void> {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.redis) await this.redis.quit().catch(() => {});
    this.l1Cache.clear();
  }

  /**
   * Get the underlying Redis client for other services
   */
  getRedisClient(): Redis | null {
    return this.redis;
  }
}

export const appCache = new CacheService();
