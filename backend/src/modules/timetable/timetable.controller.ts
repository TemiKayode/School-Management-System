import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/apiResponse';
import { withCache, invalidatePattern } from '../../utils/cache';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const classId = (req.query.classId as string) || '';
    const teacherId = (req.query.teacherId as string) || '';
    const slots = await withCache(`timetable:${classId}:${teacherId}`, 600, async () => {
      const where: any = {};
      if (classId) where.classId = classId;
      if (teacherId) where.teacherId = teacherId;
      return prisma.timetableSlot.findMany({
        where,
        include: { subject: true, teacher: true, class: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });
    return sendSuccess(res, slots);
  } catch (err) { next(err); }
}

export async function listMy(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
    if (!teacher) return sendSuccess(res, []);
    const slots = await withCache(`timetable:my:${teacher.id}`, 600, () =>
      prisma.timetableSlot.findMany({
        where: { teacherId: teacher.id },
        include: { subject: true, class: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      })
    );
    return sendSuccess(res, slots);
  } catch (err) { next(err); }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const slot = await prisma.timetableSlot.create({ data: req.body });
    await invalidatePattern('timetable:*');
    return sendSuccess(res, slot, 'Slot created', 201);
  } catch (err) { next(err); }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const slot = await prisma.timetableSlot.update({ where: { id: req.params.id }, data: req.body });
    await invalidatePattern('timetable:*');
    return sendSuccess(res, slot);
  } catch (err) { next(err); }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.timetableSlot.delete({ where: { id: req.params.id } });
    await invalidatePattern('timetable:*');
    return sendSuccess(res, null, 'Slot deleted');
  } catch (err) { next(err); }
}
