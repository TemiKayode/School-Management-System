import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess, sendPaginated } from '../../utils/apiResponse';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
        skip: (page - 1) * limit, take: limit,
        include: { subject: true, class: true },
        orderBy: { examDate: 'desc' },
      }),
      prisma.exam.count(),
    ]);
    return sendPaginated(res, exams, total, page, limit);
  } catch (err) { next(err); }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const exam = await prisma.exam.create({ data: req.body });
    return sendSuccess(res, exam, 'Exam created', 201);
  } catch (err) { next(err); }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const exam = await prisma.exam.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { subject: true, class: true },
    });
    return sendSuccess(res, exam);
  } catch (err) { next(err); }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const exam = await prisma.exam.update({ where: { id: req.params.id }, data: req.body });
    return sendSuccess(res, exam);
  } catch (err) { next(err); }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.exam.delete({ where: { id: req.params.id } });
    return sendSuccess(res, null, 'Exam deleted');
  } catch (err) { next(err); }
}

export async function addResults(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // req.body.results = [{ studentId, score, grade, remarks }]
    const { results } = req.body;
    const saved = await prisma.$transaction(
      results.map((r: any) =>
        prisma.examResult.upsert({
          where: { examId_studentId: { examId: req.params.id, studentId: r.studentId } },
          update: { score: r.score, grade: r.grade, remarks: r.remarks },
          create: { examId: req.params.id, studentId: r.studentId, score: r.score, grade: r.grade, remarks: r.remarks },
        })
      )
    );
    return sendSuccess(res, saved, 'Results saved');
  } catch (err) { next(err); }
}

export async function getResults(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const results = await prisma.examResult.findMany({
      where: { examId: req.params.id },
      include: { student: true },
      orderBy: { score: 'desc' },
    });
    return sendSuccess(res, results);
  } catch (err) { next(err); }
}

export async function getMyResults(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!student) return sendSuccess(res, []);

    const results = await prisma.examResult.findMany({
      where: { studentId: student.id },
      include: { exam: { include: { subject: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, results);
  } catch (err) { next(err); }
}

export async function generateReportCard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { studentId } = req.query;
    const results = await prisma.examResult.findMany({
      where: { studentId: studentId as string },
      include: { exam: { include: { subject: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const total = results.reduce((sum, r) => sum + r.score, 0);
    const average = results.length ? (total / results.length).toFixed(2) : 0;

    return sendSuccess(res, { results, average, total });
  } catch (err) { next(err); }
}
