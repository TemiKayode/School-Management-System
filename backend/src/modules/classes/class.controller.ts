import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess, sendPaginated, sendError } from '../../utils/apiResponse';
import { withCache, invalidate, invalidatePattern } from '../../utils/cache';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await withCache(`classes:list:${page}:${limit}`, 300, async () => {
      const [classes, total] = await Promise.all([
        prisma.class.findMany({
          skip: (page - 1) * limit, take: limit,
          include: { teacher: { include: { user: { select: { name: true } } } }, _count: { select: { students: true } } },
        }),
        prisma.class.count(),
      ]);
      return { classes, total };
    });
    return sendPaginated(res, result.classes, result.total, page, limit);
  } catch (err) { next(err); }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, grade, section, teacherId, academicYear, subjectIds } = req.body;
    if (!name || !grade) return sendError(res, 'name and grade are required', 400);

    if (teacherId) {
      const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true } });
      if (!teacher) return sendError(res, 'Invalid teacherId', 400);
    }

    const cls = await prisma.class.create({
      data: {
        name, grade, section,
        teacherId: teacherId || undefined,
        academicYear: academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        subjects: subjectIds?.length ? { connect: subjectIds.map((id: string) => ({ id })) } : undefined,
      },
      include: { teacher: { include: { user: { select: { name: true } } } }, _count: { select: { students: true } } },
    });
    await invalidatePattern('classes:*');
    return sendSuccess(res, cls, 'Class created', 201);
  } catch (err) { next(err); }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cls = await withCache(`classes:${req.params.id}`, 300, () =>
      prisma.class.findUnique({
        where: { id: req.params.id },
        include: { teacher: true, subjects: true, _count: { select: { students: true } } },
      })
    );
    if (!cls) return sendError(res, 'No Class found', 404);
    return sendSuccess(res, cls);
  } catch (err) { next(err); }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cls = await prisma.class.update({ where: { id: req.params.id }, data: req.body });
    await invalidate(`classes:${req.params.id}`);
    await invalidatePattern('classes:list:*');
    return sendSuccess(res, cls);
  } catch (err) { next(err); }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.class.delete({ where: { id: req.params.id } });
    await invalidate(`classes:${req.params.id}`);
    await invalidatePattern('classes:list:*');
    return sendSuccess(res, null, 'Class deleted');
  } catch (err) { next(err); }
}

export async function listMy(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
    if (!teacher) return sendSuccess(res, []);
    const classes = await prisma.class.findMany({
      where: { teacherId: teacher.id },
      include: { _count: { select: { students: true } } },
    });
    return sendSuccess(res, classes);
  } catch (err) { next(err); }
}

export async function getStudents(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const students = await withCache(`classes:${req.params.id}:students`, 180, () =>
      prisma.student.findMany({
        where: { classId: req.params.id },
        include: { user: { select: { name: true, email: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
      })
    );
    return sendSuccess(res, students);
  } catch (err) { next(err); }
}

export async function getTimetable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const timetable = await prisma.timetableSlot.findMany({
      where: { classId: req.params.id },
      include: { subject: true, teacher: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return sendSuccess(res, timetable);
  } catch (err) { next(err); }
}

export async function getSubjects(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cls = await prisma.class.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { subjects: true },
    });
    return sendSuccess(res, cls.subjects);
  } catch (err) { next(err); }
}
