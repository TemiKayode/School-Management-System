import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess, sendPaginated } from '../../utils/apiResponse';
import { AppError } from '../../middleware/errorHandler';

export async function listCourses(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = (req.query.search as string) || '';
    const where: any = { status: 'PUBLISHED' };
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: {
          subject: true,
          _count: { select: { lessons: true, enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.count({ where }),
    ]);
    return sendPaginated(res, courses, total, page, limit);
  } catch (err) { next(err); }
}

export async function createCourse(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const course = await prisma.course.create({
      data: { ...req.body, authorId: req.user!.id },
      include: { subject: true },
    });
    return sendSuccess(res, course, 'Course created', 201);
  } catch (err) { next(err); }
}

export async function getCourse(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const course = await prisma.course.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        subject: true,
        lessons: { orderBy: { order: 'asc' } },
        _count: { select: { enrollments: true } },
      },
    });
    // Check if current user is enrolled
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId: course.id, userId: req.user!.id } },
    });
    return sendSuccess(res, { ...course, enrolled: !!enrollment });
  } catch (err) { next(err); }
}

export async function updateCourse(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const course = await prisma.course.update({ where: { id: req.params.id }, data: req.body });
    return sendSuccess(res, course);
  } catch (err) { next(err); }
}

export async function deleteCourse(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.course.delete({ where: { id: req.params.id } });
    return sendSuccess(res, null, 'Course deleted');
  } catch (err) { next(err); }
}

export async function publishCourse(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED' },
    });
    return sendSuccess(res, course, 'Course published');
  } catch (err) { next(err); }
}

export async function enroll(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const enrollment = await prisma.courseEnrollment.upsert({
      where: { courseId_userId: { courseId: req.params.id, userId: req.user!.id } },
      update: {},
      create: { courseId: req.params.id, userId: req.user!.id },
    });
    return sendSuccess(res, enrollment, 'Enrolled');
  } catch (err) { next(err); }
}

export async function getCourseProgress(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const totalLessons = await prisma.lesson.count({ where: { courseId: req.params.id } });
    const completed = await prisma.lessonProgress.count({
      where: { lesson: { courseId: req.params.id }, userId: req.user!.id, completed: true },
    });
    const percentage = totalLessons ? Math.round((completed / totalLessons) * 100) : 0;
    return sendSuccess(res, { totalLessons, completed, percentage });
  } catch (err) { next(err); }
}

export async function addLesson(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const maxOrder = await prisma.lesson.aggregate({
      where: { courseId: req.params.id }, _max: { order: true },
    });
    const lesson = await prisma.lesson.create({
      data: { ...req.body, courseId: req.params.id, order: (maxOrder._max.order ?? -1) + 1 },
    });
    return sendSuccess(res, lesson, 'Lesson added', 201);
  } catch (err) { next(err); }
}

export async function updateLesson(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const lesson = await prisma.lesson.update({ where: { id: req.params.lessonId }, data: req.body });
    return sendSuccess(res, lesson);
  } catch (err) { next(err); }
}

export async function deleteLesson(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.lesson.delete({ where: { id: req.params.lessonId } });
    return sendSuccess(res, null, 'Lesson deleted');
  } catch (err) { next(err); }
}

export async function markLessonComplete(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const progress = await prisma.lessonProgress.upsert({
      where: { lessonId_userId: { lessonId: req.params.lessonId, userId: req.user!.id } },
      update: { completed: true, watchedSecs: req.body.watchedSecs ?? 0 },
      create: { lessonId: req.params.lessonId, userId: req.user!.id, completed: true, watchedSecs: req.body.watchedSecs ?? 0 },
    });
    return sendSuccess(res, progress, 'Lesson marked complete');
  } catch (err) { next(err); }
}

export async function myCourses(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId: req.user!.id },
      include: { course: { include: { subject: true, _count: { select: { lessons: true } } } } },
      orderBy: { enrolledAt: 'desc' },
    });
    return sendSuccess(res, enrollments);
  } catch (err) { next(err); }
}
