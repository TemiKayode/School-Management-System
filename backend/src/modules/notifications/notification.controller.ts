import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/apiResponse';
import { getIO } from '../../config/socket';
import { sendEmail, sendSMS } from '../../utils/email';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return sendSuccess(res, notifications);
  } catch (err) { next(err); }
}

export async function broadcast(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, message, roles, channels } = req.body;
    const users = await prisma.user.findMany({
      where: roles?.length ? { role: { in: roles } } : {},
      select: { id: true, email: true, phone: true },
    });

    // Create in-app notifications
    await prisma.notification.createMany({
      data: users.map((u) => ({ userId: u.id, title, message })),
    });

    // Push via Socket.IO
    if (channels?.includes('socket')) {
      roles?.forEach((r: string) => getIO().to(`role:${r}`).emit('notification', { title, message }));
    }

    // Email
    if (channels?.includes('email')) {
      await Promise.allSettled(users.map((u) => sendEmail({ to: u.email, subject: title, html: `<p>${message}</p>` })));
    }

    // SMS
    if (channels?.includes('sms')) {
      await Promise.allSettled(users.filter(u => u.phone).map((u) => sendSMS(u.phone!, message)));
    }

    return sendSuccess(res, null, `Notification sent to ${users.length} users`);
  } catch (err) { next(err); }
}

export async function markRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
    return sendSuccess(res, null, 'Marked as read');
  } catch (err) { next(err); }
}

export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
    return sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
}
