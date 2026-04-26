import webpush from 'web-push';
import { NotificationJob } from '../types';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.EMAIL_FROM || 'admin@school.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendPushNotification(job: NotificationJob) {
  const { pushEndpoint, pushP256dh, pushAuth } = job.recipient;
  if (!pushEndpoint || !pushP256dh || !pushAuth) throw new Error('Missing push subscription details');

  const payload = JSON.stringify({
    title: job.payload.title,
    body: job.payload.body,
    url: job.payload.url || '/',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: job.payload.data,
  });

  await webpush.sendNotification(
    { endpoint: pushEndpoint, keys: { p256dh: pushP256dh, auth: pushAuth } },
    payload
  );
}
