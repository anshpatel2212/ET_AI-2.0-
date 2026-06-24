import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

let redis: Redis | null = null;
let redisAvailable = false;

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export function getRedisClient(): Redis | null {
  if (!redis) {
    try {
      redis = new Redis(config.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        retryStrategy(times) {
          if (times > 3) {
            logger.warn('Redis unavailable after 3 retries — running without Redis');
            return null; // stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      redis.on('connect', () => {
        redisAvailable = true;
        logger.info('Redis connected');
      });

      redis.on('error', (err) => {
        redisAvailable = false;
        // Only log once, not every retry
      });

      redis.on('close', () => {
        redisAvailable = false;
      });

      // Attempt connection but don't block startup
      redis.connect().catch(() => {
        logger.warn('Redis connection failed — running without Redis');
        redisAvailable = false;
      });
    } catch {
      logger.warn('Redis initialization failed — running without Redis');
      redis = null;
      redisAvailable = false;
    }
  }
  return redis;
}

export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch {
      // ignore
    }
    redis = null;
    redisAvailable = false;
    logger.info('Redis connection closed gracefully');
  }
}
