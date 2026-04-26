import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/apiResponse';

export async function academicReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { classId, subjectId } = req.query;
    const where: any = {};
    if (classId) where.exam = { classId };
    if (subjectId) where.exam = { ...where.exam, subjectId };

    const results = await prisma.examResult.findMany({
      where,
      include: { exam: { include: { subject: true } }, student: true },
    });

    const avg = results.length ? results.reduce((s, r) => s + r.score, 0) / results.length : 0;
    const top = [...results].sort((a, b) => b.score - a.score).slice(0, 5);
    const distribution = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((floor, i, arr) => ({
      range: `${floor}-${arr[i + 1] ?? 100}`,
      count: results.filter(r => r.score >= floor && r.score < (arr[i + 1] ?? 101)).length,
    }));

    return sendSuccess(res, { total: results.length, average: avg.toFixed(2), topStudents: top, distribution });
  } catch (err) { next(err); }
}

export async function attendanceReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { classId, from, to } = req.query;
    const where: any = {};
    if (classId) where.classId = classId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from as string);
      if (to) where.date.lte = new Date(to as string);
    }

    const grouped = await prisma.attendance.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    const total = grouped.reduce((s, g) => s + g._count.status, 0);
    const summary = grouped.reduce((acc: any, g) => { acc[g.status] = g._count.status; return acc; }, {});
    const rate = total ? ((summary.PRESENT || 0) / total * 100).toFixed(1) : '0.0';

    return sendSuccess(res, { total, summary, attendanceRate: `${rate}%` });
  } catch (err) { next(err); }
}

export async function financialReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { from, to } = req.query;
    const where: any = { status: 'PAID' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    const [paid, pending] = await Promise.all([
      prisma.feePayment.aggregate({ where, _sum: { amount: true }, _count: true }),
      prisma.feePayment.aggregate({ where: { ...where, status: 'PENDING' }, _sum: { amount: true }, _count: true }),
    ]);

    return sendSuccess(res, {
      collected: { total: paid._sum.amount || 0, count: paid._count },
      pending: { total: pending._sum.amount || 0, count: pending._count },
    });
  } catch (err) { next(err); }
}
