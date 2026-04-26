import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

export async function connectDatabase() {
  await prisma.$connect();
  logger.info('PostgreSQL connected via Prisma');
}

export default prisma;
