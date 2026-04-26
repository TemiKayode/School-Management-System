import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/apiResponse';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { classId, date, studentId } = req.query;
    const where: any = {};
    if (classId) where.classId = classId;
    if (date) where.date = new Date(date as string);
    if (studentId) where.studentId = studentId;

    const records = await prisma.attendance.findMany({
      where,
      include: { student: { include: { user: { select: { name: true, avatar: true } } } } },
      orderBy: { date: 'desc' },
      take: 100,
    });
    return sendSuccess(res, records);
  } catch (err) { next(err); }
}

export async function markBulk(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // req.body.records = [{ studentId, status, note }]
    const { classId, date, records } = req.body;

    const created = await prisma.$transaction(
      records.map((r: any) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: r.studentId, date: new Date(date) } },
          update: { status: r.status, note: r.note },
          create: { studentId: r.studentId, classId, date: new Date(date), status: r.status, note: r.note, markedById: req.user!.id },
        })
      )
    );
    return sendSuccess(res, created, 'Attendance marked');
  } catch (err) { next(err); }
}

export async function summary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { studentId, from, to } = req.query;
    const where: any = { studentId };
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

    const summary = grouped.reduce((acc: any, g) => {
      acc[g.status.toLowerCase()] = g._count.status;
      return acc;
    }, {});

    return sendSuccess(res, summary);
  } catch (err) { next(err); }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const record = await prisma.attendance.update({
      where: { id: req.params.id },
      data: { status: req.body.status, note: req.body.note },
    });
    return sendSuccess(res, record);
  } catch (err) { next(err); }
}
