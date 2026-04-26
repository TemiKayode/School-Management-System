import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess, sendPaginated, sendError } from '../../utils/apiResponse';
import { withCache, invalidate, invalidatePattern } from '../../utils/cache';
import bcrypt from 'bcryptjs';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = (req.query.search as string) || '';

    const result = await withCache(`students:list:${page}:${limit}:${search}`, 120, async () => {
      const where = search
        ? { OR: [{ user: { name: { contains: search, mode: 'insensitive' as const } } }, { admissionNo: { contains: search, mode: 'insensitive' as const } }] }
        : {};
      const [students, total] = await Promise.all([
        prisma.student.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            class: true,
            user: { select: { name: true, email: true, avatar: true } },
            feePayments: { select: { status: true }, take: 5 },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.student.count({ where }),
      ]);
      return { students, total };
    });

    return sendPaginated(res, result.students, result.total, page, limit);
  } catch (err) { next(err); }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, email, password, admissionNo, classId, parentName, parentPhone, parentEmail, gender, dateOfBirth } = req.body;

    if (!name || !email) return sendError(res, 'Name and email are required', 400);

    if (classId) {
      const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
      if (!cls) return sendError(res, 'Invalid classId', 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'A user with this email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password || 'Student@123', 12);

    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, password: hashedPassword, role: 'STUDENT' },
      });
      return tx.student.create({
        data: {
          userId: user.id,
          admissionNo: admissionNo || `S${Date.now()}`,
          classId: classId || undefined,
          parentName, parentPhone, parentEmail,
          gender, dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        },
        include: { user: { select: { name: true, email: true } }, class: true },
      });
    });

    await invalidatePattern('students:list:*');
    return sendSuccess(res, student, 'Student created', 201);
  } catch (err) { next(err); }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const student = await withCache(`students:${req.params.id}`, 300, () =>
      prisma.student.findUniqueOrThrow({
        where: { id: req.params.id },
        include: { class: true, user: { select: { name: true, email: true, avatar: true, phone: true } } },
      })
    );
    return sendSuccess(res, student);
  } catch (err) { next(err); }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const student = await prisma.student.update({ where: { id: req.params.id }, data: req.body });
    await invalidate(`students:${req.params.id}`);
    await invalidatePattern('students:list:*');
    return sendSuccess(res, student, 'Student updated');
  } catch (err) { next(err); }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.student.delete({ where: { id: req.params.id } });
    await invalidate(`students:${req.params.id}`);
    await invalidatePattern('students:list:*');
    return sendSuccess(res, null, 'Student deleted');
  } catch (err) { next(err); }
}

export async function getGrades(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const grades = await prisma.examResult.findMany({
      where: { studentId: req.params.id },
      include: { exam: { include: { subject: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, grades);
  } catch (err) { next(err); }
}

export async function getAttendance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const records = await prisma.attendance.findMany({
      where: { studentId: req.params.id },
      orderBy: { date: 'desc' },
      take: 60,
    });
    return sendSuccess(res, records);
  } catch (err) { next(err); }
}

export async function getFees(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const fees = await prisma.feePayment.findMany({
      where: { studentId: req.params.id },
      include: { fee: true },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, fees);
  } catch (err) { next(err); }
}

export async function getAssignments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { studentId: req.params.id },
      include: { assignment: { include: { subject: true } } },
      orderBy: { submittedAt: 'desc' },
    });
    return sendSuccess(res, submissions);
  } catch (err) { next(err); }
}
