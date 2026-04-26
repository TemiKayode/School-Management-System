import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/apiResponse';

// Parents are linked to students via parentEmail matching their user email
async function getLinkedStudents(parentEmail: string) {
  return prisma.student.findMany({
    where: { parentEmail },
    include: {
      user: { select: { name: true, email: true, avatar: true } },
      class: { include: { teacher: { include: { user: { select: { name: true } } } } } },
    },
  });
}

export async function getChildren(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const children = await getLinkedStudents(req.user!.email);
    return sendSuccess(res, children);
  } catch (err) { next(err); }
}

export async function getChildOverview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { studentId } = req.params;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [student, attendanceSummary, recentGrades, pendingFees, upcomingAssignments] = await Promise.all([
      prisma.student.findUniqueOrThrow({
        where: { id: studentId },
        include: { user: true, class: true },
      }),
      prisma.attendance.groupBy({ by: ['status'], where: { studentId }, _count: { status: true } }),
      prisma.examResult.findMany({ where: { studentId }, include: { exam: { include: { subject: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.feePayment.aggregate({ where: { studentId, status: 'PENDING' }, _sum: { amount: true }, _count: true }),
      prisma.assignment.findMany({ where: { classId: student.classId ?? undefined, dueDate: { gte: today } }, include: { subject: true }, orderBy: { dueDate: 'asc' }, take: 5 }),
    ]);

    const attendance = attendanceSummary.reduce((acc: any, g) => { acc[g.status] = g._count.status; return acc; }, {});
    const avgGrade = recentGrades.length ? (recentGrades.reduce((s, r) => s + r.score, 0) / recentGrades.length).toFixed(1) : null;

    return sendSuccess(res, { student, attendance, avgGrade, recentGrades, pendingFees, upcomingAssignments });
  } catch (err) { next(err); }
}

export async function getChildAttendance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const records = await prisma.attendance.findMany({
      where: { studentId: req.params.studentId },
      orderBy: { date: 'desc' },
      take: 90,
    });
    return sendSuccess(res, records);
  } catch (err) { next(err); }
}

export async function getChildGrades(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const grades = await prisma.examResult.findMany({
      where: { studentId: req.params.studentId },
      include: { exam: { include: { subject: true, class: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, grades);
  } catch (err) { next(err); }
}

export async function getChildFees(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const fees = await prisma.feePayment.findMany({
      where: { studentId: req.params.studentId },
      include: { fee: true },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, fees);
  } catch (err) { next(err); }
}

export async function getChildAssignments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const student = await prisma.student.findUniqueOrThrow({ where: { id: req.params.studentId } });
    const assignments = await prisma.assignment.findMany({
      where: { classId: student.classId ?? undefined },
      include: {
        subject: true,
        submissions: { where: { studentId: req.params.studentId } },
      },
      orderBy: { dueDate: 'asc' },
    });
    return sendSuccess(res, assignments);
  } catch (err) { next(err); }
}

export async function getChildTimetable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const student = await prisma.student.findUniqueOrThrow({ where: { id: req.params.studentId } });
    const timetable = await prisma.timetableSlot.findMany({
      where: { classId: student.classId ?? undefined },
      include: { subject: true, teacher: { include: { user: { select: { name: true } } } } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return sendSuccess(res, timetable);
  } catch (err) { next(err); }
}
