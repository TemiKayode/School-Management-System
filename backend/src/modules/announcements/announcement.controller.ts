import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/apiResponse';
import { getIO } from '../../config/socket';
import { sendEmail } from '../../utils/email';
import { withCache, invalidatePattern } from '../../utils/cache';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const audience = (req.query.audience as string) || '';
    const announcements = await withCache(`announcements:${audience}`, 60, async () => {
      const where: any = {};
      if (audience) where.audience = { has: audience };
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
      return prisma.announcement.findMany({
        where,
        include: { author: { select: { name: true, role: true, avatar: true } } },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      });
    });
    return sendSuccess(res, announcements);
  } catch (err) { next(err); }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, content, audience, pinned, expiresAt, sendEmail: doEmail } = req.body;

    const announcement = await prisma.announcement.create({
      data: { title, content, audience, pinned: pinned ?? false, authorId: req.user!.id, expiresAt: expiresAt ? new Date(expiresAt) : null },
      include: { author: { select: { name: true, role: true } } },
    });

    // Push real-time to all relevant role rooms
    if (audience?.length) {
      audience.forEach((role: string) => {
        getIO().to(`role:${role}`).emit('announcement:new', announcement);
      });
    }

    // Optionally send email broadcast
    if (doEmail && audience?.length) {
      const users = await prisma.user.findMany({
        where: { role: { in: audience } },
        select: { email: true },
      });
      await Promise.allSettled(
        users.map(u => sendEmail({ to: u.email, subject: `Notice: ${title}`, html: `<h2>${title}</h2><p>${content}</p>` }))
      );
    }

    await invalidatePattern('announcements:*');
    return sendSuccess(res, announcement, 'Announcement created', 201);
  } catch (err) { next(err); }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const announcement = await prisma.announcement.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { author: { select: { name: true, role: true, avatar: true } } },
    });
    return sendSuccess(res, announcement);
  } catch (err) { next(err); }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await invalidatePattern('announcements:*');
    return sendSuccess(res, announcement);
  } catch (err) { next(err); }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    await invalidatePattern('announcements:*');
    return sendSuccess(res, null, 'Deleted');
  } catch (err) { next(err); }
}

export async function togglePin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const current = await prisma.announcement.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.announcement.update({
      where: { id: req.params.id },
      data: { pinned: !current.pinned },
    });
    return sendSuccess(res, updated, `Announcement ${updated.pinned ? 'pinned' : 'unpinned'}`);
  } catch (err) { next(err); }
}
