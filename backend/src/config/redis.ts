import Redis from 'ioredis';
import logger from '../utils/logger';

let redis: Redis | undefined;

export async function connectRedis() {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  client.on('error', (err) => logger.error('Redis error', err));

  try {
    await client.connect();
    redis = client;
    logger.info('Redis connected');
  } catch (error) {
    logger.warn('Redis unavailable — continuing without Redis in dev mode');
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

export function getRedis(): Redis {
  if (!redis) throw new Error('Redis not initialized. Set REDIS_URL or install Redis.');
  return redis;
}

export default redis as Redis;
