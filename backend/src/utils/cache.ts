import logger from './logger';

// Lazy import to avoid crash when Redis is unavailable
function getClient() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getRedis } = require('../config/redis');
    return getRedis() as import('ioredis').Redis;
  } catch {
    return null;
  }
}

/**
 * Cache-aside helper.
 * Returns cached value if present, otherwise calls `fn`, caches the result, and returns it.
 * Falls through silently if Redis is unavailable.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const client = getClient();

  if (client) {
    try {
      const hit = await client.get(key);
      if (hit) {
        logger.debug(`cache hit: ${key}`);
        return JSON.parse(hit) as T;
      }
    } catch {
      logger.warn(`cache read failed for key: ${key}`);
    }
  }

  const result = await fn();

  if (client) {
    try {
      await client.setex(key, ttlSeconds, JSON.stringify(result));
    } catch {
      logger.warn(`cache write failed for key: ${key}`);
    }
  }

  return result;
}

/** Invalidate one or more cache keys (or glob patterns via SCAN). */
export async function invalidate(...keys: string[]) {
  const client = getClient();
  if (!client || keys.length === 0) return;
  try {
    await client.del(...keys);
  } catch {
    logger.warn(`cache invalidation failed for keys: ${keys.join(', ')}`);
  }
}

/** Invalidate all keys matching a prefix pattern (e.g. "students:*"). */
export async function invalidatePattern(pattern: string) {
  const client = getClient();
  if (!client) return;
  try {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
    if (keys.length) await client.del(...keys);
  } catch {
    logger.warn(`cache pattern invalidation failed: ${pattern}`);
  }
}
