import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess, sendPaginated } from '../../utils/apiResponse';
import bcrypt from 'bcryptjs';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { name: true, email: true, phone: true, avatar: true, createdAt: true } },
          subjects: { select: { name: true, id: true } },
          classes: { select: { id: true, name: true, grade: true, _count: { select: { students: true } } } },
          _count: { select: { classes: true, timetable: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teacher.count(),
    ]);
    return sendPaginated(res, teachers, total, page, limit);
  } catch (err) { next(err); }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, email, phone, password, employeeNo, department, qualification } = req.body;

    if (!name || !email) {
      res.status(400).json({ success: false, message: 'Name and email are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'A user with this email already exists' });
      return;
    }

    const hashed = await bcrypt.hash(password || 'Teacher@123', 12);

    const teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, phone, password: hashed, role: 'TEACHER' },
      });
      return tx.teacher.create({
        data: { userId: user.id, employeeNo: employeeNo || `T${Date.now()}`, department, qualification },
        include: { user: { select: { name: true, email: true, phone: true } } },
      });
    });

    return sendSuccess(res, teacher, 'Teacher created', 201);
  } catch (err) { next(err); }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const teacher = await prisma.teacher.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, email: true, phone: true, avatar: true } },
        subjects: true,
        classes: { include: { _count: { select: { students: true } } } },
        timetable: { include: { subject: true, class: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
        _count: { select: { classes: true, timetable: true } },
      },
    });
    return sendSuccess(res, teacher);
  } catch (err) { next(err); }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const teacher = await prisma.teacher.update({ where: { id: req.params.id }, data: req.body });
    return sendSuccess(res, teacher, 'Teacher updated');
  } catch (err) { next(err); }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.teacher.delete({ where: { id: req.params.id } });
    return sendSuccess(res, null, 'Teacher deleted');
  } catch (err) { next(err); }
}

export async function getClasses(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const classes = await prisma.class.findMany({
      where: { teacherId: req.params.id },
      include: { _count: { select: { students: true } } },
    });
    return sendSuccess(res, classes);
  } catch (err) { next(err); }
}

export async function getTimetable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const timetable = await prisma.timetableSlot.findMany({
      where: { teacherId: req.params.id },
      include: { subject: true, class: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return sendSuccess(res, timetable);
  } catch (err) { next(err); }
}

export async function getStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, activeClasses, newThisMonth, allTeachers] = await Promise.all([
      prisma.teacher.count(),
      prisma.class.count({ where: { teacherId: { not: null } } }),
      prisma.teacher.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.teacher.findMany({
        include: { _count: { select: { classes: true, timetable: true } } },
      }),
    ]);

    const avgClasses = total > 0 ? (allTeachers.reduce((s, t) => s + t._count.classes, 0) / total).toFixed(1) : 0;
    const withFullTimetable = allTeachers.filter(t => t._count.timetable >= 5).length;
    const withNoClasses = allTeachers.filter(t => t._count.classes === 0).length;

    return sendSuccess(res, { total, activeClasses, newThisMonth, avgClasses, withFullTimetable, withNoClasses });
  } catch (err) { next(err); }
}
