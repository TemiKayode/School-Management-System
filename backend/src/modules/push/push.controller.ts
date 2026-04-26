import { Response, NextFunction } from 'express';
import webpush from 'web-push';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/apiResponse';
import logger from '../../utils/logger';

// Configure VAPID once at module load
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    `mailto:${process.env.EMAIL_FROM || 'admin@school.com'}`,
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

export async function getVapidKey(_req: AuthRequest, res: Response) {
  return sendSuccess(res, { publicKey: VAPID_PUBLIC });
}

export async function subscribe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { endpoint, keys } = req.body;
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth },
      create: { userId: req.user!.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });
    return sendSuccess(res, null, 'Subscribed to push notifications', 201);
  } catch (err) { next(err); }
}

export async function unsubscribe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.pushSubscription.deleteMany({ where: { userId: req.user!.id } });
    return sendSuccess(res, null, 'Unsubscribed');
  } catch (err) { next(err); }
}

export async function sendPush(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, body, url, roles, userIds } = req.body;

    const where: any = {};
    if (userIds?.length) where.userId = { in: userIds };
    else if (roles?.length) where.user = { role: { in: roles } };

    const subscriptions = await prisma.pushSubscription.findMany({
      where,
      include: { user: { select: { id: true } } },
    });

    const payload = JSON.stringify({ title, body, url: url || '/', icon: '/icon-192.png' });

    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
      )
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length) logger.warn(`Push: ${failed.length} failed out of ${subscriptions.length}`);

    return sendSuccess(res, { sent: subscriptions.length - failed.length, failed: failed.length });
  } catch (err) { next(err); }
}
