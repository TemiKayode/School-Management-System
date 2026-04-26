import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/apiResponse';
import { withCache } from '../../utils/cache';

export async function getTeacherStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
    if (!teacher) return sendSuccess(res, {});

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [classes, assignments, todayAttendance, unreadNotifications] = await Promise.all([
      prisma.class.findMany({
        where: { teacherId: teacher.id },
        include: { _count: { select: { students: true } } },
      }),
      prisma.assignment.findMany({
        where: { createdById: req.user!.id },
        include: { subject: true, _count: { select: { submissions: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.attendance.groupBy({
        by: ['status'],
        where: {
          date: { gte: today },
          student: { class: { teacherId: teacher.id } },
        },
        _count: { status: true },
      }),
      prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
    ]);

    const totalStudents = classes.reduce((s, c) => s + (c._count?.students ?? 0), 0);
    const attendanceSummary = todayAttendance.reduce((acc: any, g) => {
      acc[g.status.toLowerCase()] = g._count.status;
      return acc;
    }, {});

    return sendSuccess(res, {
      classes,
      assignments,
      totalStudents,
      attendanceToday: attendanceSummary,
      unreadNotifications,
    });
  } catch (err) { next(err); }
}

export async function getStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await withCache(`dashboard:${req.user!.role}`, 300, async () => {
      const [
        totalStudents,
        totalTeachers,
        todayAttendance,
        pendingFees,
        recentExams,
        unreadNotifications,
      ] = await Promise.all([
        prisma.student.count(),
        prisma.teacher.count(),
        prisma.attendance.groupBy({ by: ['status'], where: { date: { gte: today } }, _count: { status: true } }),
        prisma.feePayment.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true }, _count: true }),
        prisma.exam.findMany({ orderBy: { examDate: 'desc' }, take: 5, include: { subject: true, class: true } }),
        prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
      ]);

      const attendanceSummary = todayAttendance.reduce((acc: any, g) => {
        acc[g.status.toLowerCase()] = g._count.status;
        return acc;
      }, {});

      return {
        totalStudents,
        totalTeachers,
        attendanceToday: attendanceSummary,
        pendingFees: { total: pendingFees._sum.amount || 0, count: pendingFees._count },
        recentExams,
        unreadNotifications,
      };
    });

    return sendSuccess(res, stats);
  } catch (err) {
    // If DB schema isn't fully migrated in an environment, return safe defaults.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021') {
      return sendSuccess(res, {
        totalStudents: 0,
        totalTeachers: 0,
        attendanceToday: {},
        pendingFees: { total: 0, count: 0 },
        recentExams: [],
        unreadNotifications: 0,
      });
    }
    next(err);
  }
}
