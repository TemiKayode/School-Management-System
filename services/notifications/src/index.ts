import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import Redis from 'ioredis';
import winston from 'winston';
import { sendEmailNotification } from './channels/email';
import { sendSMSNotification } from './channels/sms';
import { sendPushNotification } from './channels/push';
import { NotificationJob } from './types';

const PORT = process.env.PORT || 5010;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_KEY = 'notification:queue';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

const app = express();
app.use(helmet());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notifications' }));

// Enqueue a notification job (called by the main backend via internal network)
app.post('/enqueue', async (req, res) => {
  try {
    const job: NotificationJob = req.body;
    await redis.rpush(QUEUE_KEY, JSON.stringify(job));
    logger.info('Job enqueued', { type: job.type, channel: job.channel });
    res.json({ queued: true });
  } catch (err) {
    logger.error('Enqueue failed', err);
    res.status(500).json({ error: 'Enqueue failed' });
  }
});

const redis = new Redis(REDIS_URL);

// Worker: process notification queue
async function processQueue() {
  while (true) {
    try {
      // Blocking pop — waits up to 5 seconds for a new job
      const result = await redis.blpop(QUEUE_KEY, 5);
      if (!result) continue;

      const job: NotificationJob = JSON.parse(result[1]);
      logger.info('Processing job', { type: job.type, channel: job.channel });

      switch (job.channel) {
        case 'email':
          await sendEmailNotification(job);
          break;
        case 'sms':
          await sendSMSNotification(job);
          break;
        case 'push':
          await sendPushNotification(job);
          break;
        default:
          logger.warn('Unknown channel', { channel: job.channel });
      }
    } catch (err) {
      logger.error('Worker error', err);
      await new Promise(r => setTimeout(r, 2000)); // Back-off on error
    }
  }
}

app.listen(PORT, () => {
  logger.info(`Notifications service on port ${PORT}`);
  processQueue(); // Start worker
});
