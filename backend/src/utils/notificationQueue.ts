import { getRedis } from '../config/redis';

const QUEUE_KEY = 'notification:queue';

export interface NotificationJob {
  type: string;
  channel: 'email' | 'sms' | 'push';
  recipient: {
    userId?: string;
    email?: string;
    phone?: string;
    pushEndpoint?: string;
    pushP256dh?: string;
    pushAuth?: string;
  };
  payload: {
    title: string;
    body: string;
    url?: string;
    data?: Record<string, unknown>;
  };
}

// Enqueue a notification job — the notifications microservice consumes this queue
export async function enqueueNotification(job: NotificationJob) {
  const redis = getRedis();
  await redis.rpush(QUEUE_KEY, JSON.stringify(job));
}

// Convenience helpers
export async function queueEmail(to: string, title: string, body: string, url?: string) {
  return enqueueNotification({ type: 'custom', channel: 'email', recipient: { email: to }, payload: { title, body, url } });
}

export async function queueSMS(phone: string, title: string, body: string) {
  return enqueueNotification({ type: 'custom', channel: 'sms', recipient: { phone }, payload: { title, body } });
}

export async function queuePush(subscription: { endpoint: string; p256dh: string; auth: string }, title: string, body: string, url?: string) {
  return enqueueNotification({
    type: 'custom',
    channel: 'push',
    recipient: { pushEndpoint: subscription.endpoint, pushP256dh: subscription.p256dh, pushAuth: subscription.auth },
    payload: { title, body, url },
  });
}
