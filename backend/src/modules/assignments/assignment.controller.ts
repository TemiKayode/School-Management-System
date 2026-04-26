import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess, sendPaginated } from '../../utils/apiResponse';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const where: any = {};
    if (req.query.classId) where.classId = req.query.classId;
    if (req.query.subjectId) where.subjectId = req.query.subjectId;
    if (req.user?.role === 'TEACHER') where.createdById = req.user.id;

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: {
          subject: true,
          class: { select: { name: true, _count: { select: { students: true } } } },
          createdBy: { select: { name: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.assignment.count({ where }),
    ]);
    return sendPaginated(res, assignments, total, page, limit);
  } catch (err) { next(err); }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const assignment = await prisma.assignment.create({
      data: { ...req.body, createdById: req.user!.id },
      include: { subject: true, class: true },
    });
    return sendSuccess(res, assignment, 'Assignment created', 201);
  } catch (err) { next(err); }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const assignment = await prisma.assignment.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        subject: true,
        class: { include: { students: { include: { user: { select: { name: true } } } }, _count: { select: { students: true } } } },
        _count: { select: { submissions: true } },
      },
    });
    return sendSuccess(res, assignment);
  } catch (err) { next(err); }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const assignment = await prisma.assignment.update({ where: { id: req.params.id }, data: req.body });
    return sendSuccess(res, assignment);
  } catch (err) { next(err); }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.assignment.delete({ where: { id: req.params.id } });
    return sendSuccess(res, null, 'Assignment deleted');
  } catch (err) { next(err); }
}

export async function submit(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
    if (!student) return sendSuccess(res, null, 'Student not found', 404);

    const submission = await prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId: req.params.id, studentId: student.id } },
      update: { content: req.body.content, fileUrl: req.body.fileUrl },
      create: { assignmentId: req.params.id, studentId: student.id, content: req.body.content, fileUrl: req.body.fileUrl },
    });
    return sendSuccess(res, submission, 'Submitted');
  } catch (err) { next(err); }
}

export async function listSubmissions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const assignment = await prisma.assignment.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        class: {
          include: {
            students: { include: { user: { select: { name: true, email: true, avatar: true } } } },
          },
        },
        submissions: {
          include: { student: { include: { user: { select: { name: true, avatar: true } } } } },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    const submittedIds = new Set(assignment.submissions.map(s => s.studentId));
    const allStudents = assignment.class?.students ?? [];

    const pending = allStudents
      .filter(s => !submittedIds.has(s.id))
      .map(s => ({ studentId: s.id, studentName: s.user?.name, admissionNo: s.admissionNo, status: 'PENDING' }));

    return sendSuccess(res, {
      submitted: assignment.submissions,
      pending,
      totalStudents: allStudents.length,
      submittedCount: assignment.submissions.length,
      pendingCount: pending.length,
    });
  } catch (err) { next(err); }
}

export async function gradeSubmission(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const submission = await prisma.assignmentSubmission.update({
      where: { id: req.params.subId },
      data: { score: req.body.score, feedback: req.body.feedback },
      include: { student: { include: { user: { select: { name: true } } } } },
    });
    return sendSuccess(res, submission, 'Graded');
  } catch (err) { next(err); }
}
