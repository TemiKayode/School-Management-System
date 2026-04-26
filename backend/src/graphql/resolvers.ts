import { GraphQLScalarType, Kind } from 'graphql';
import prisma from '../config/database';
import * as authService from '../modules/auth/auth.service';
import { AppError } from '../middleware/errorHandler';

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  serialize: (value: any) => (value instanceof Date ? value.toISOString() : value),
  parseValue: (value: any) => new Date(value),
  parseLiteral: (ast: any) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
});

function requireAuth(context: any) {
  if (!context.user) throw new AppError('Not authenticated', 401);
  return context.user;
}

function requireRole(context: any, ...roles: string[]) {
  const user = requireAuth(context);
  if (!roles.includes(user.role)) throw new AppError('Forbidden', 403);
  return user;
}

export const resolvers = {
  DateTime: DateTimeScalar,

  Query: {
    me: async (_: any, __: any, ctx: any) => {
      const user = requireAuth(ctx);
      return prisma.user.findUnique({ where: { id: user.id }, select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, createdAt: true } });
    },

    dashboard: async (_: any, __: any, ctx: any) => {
      const user = requireAuth(ctx);
      const [totalStudents, totalTeachers, unreadNotifications] = await Promise.all([
        prisma.student.count(),
        prisma.teacher.count(),
        prisma.notification.count({ where: { userId: user.id, read: false } }),
      ]);
      return { totalStudents, totalTeachers, unreadNotifications };
    },

    students: async (_: any, { page = 1, limit = 20, search = '' }: any, ctx: any) => {
      requireRole(ctx, 'ADMIN', 'TEACHER');
      const where = search ? { OR: [{ user: { name: { contains: search, mode: 'insensitive' as const } } }, { admissionNo: { contains: search } }] } : {};
      const [data, total] = await Promise.all([
        prisma.student.findMany({ where, skip: (page - 1) * limit, take: limit, include: { user: true, class: true } }),
        prisma.student.count({ where }),
      ]);
      return { data, total, page, pages: Math.ceil(total / limit) };
    },

    student: async (_: any, { id }: any, ctx: any) => {
      requireAuth(ctx);
      return prisma.student.findUnique({ where: { id }, include: { user: true, class: true } });
    },

    teachers: async (_: any, { page = 1, limit = 20 }: any, ctx: any) => {
      requireRole(ctx, 'ADMIN');
      return prisma.teacher.findMany({ skip: (page - 1) * limit, take: limit, include: { user: true, subjects: true } });
    },

    teacher: async (_: any, { id }: any, ctx: any) => {
      requireAuth(ctx);
      return prisma.teacher.findUnique({ where: { id }, include: { user: true, subjects: true, classes: true } });
    },

    classes: async (_: any, __: any, ctx: any) => {
      requireAuth(ctx);
      return prisma.class.findMany({ include: { teacher: true, subjects: true } });
    },

    class: async (_: any, { id }: any, ctx: any) => {
      requireAuth(ctx);
      return prisma.class.findUnique({ where: { id }, include: { teacher: true, subjects: true, students: { include: { user: true } } } });
    },

    exams: async (_: any, { page = 1, limit = 20 }: any, ctx: any) => {
      requireAuth(ctx);
      return prisma.exam.findMany({ skip: (page - 1) * limit, take: limit, include: { subject: true, class: true }, orderBy: { examDate: 'desc' } });
    },

    exam: async (_: any, { id }: any, ctx: any) => {
      requireAuth(ctx);
      return prisma.exam.findUnique({ where: { id }, include: { subject: true, class: true, results: { include: { student: { include: { user: true } } } } } });
    },

    fees: async (_: any, __: any, ctx: any) => {
      requireAuth(ctx);
      return prisma.fee.findMany({ orderBy: { createdAt: 'desc' } });
    },

    assignments: async (_: any, { classId, subjectId }: any, ctx: any) => {
      requireAuth(ctx);
      const where: any = {};
      if (classId) where.classId = classId;
      if (subjectId) where.subjectId = subjectId;
      return prisma.assignment.findMany({ where, include: { subject: true, class: true }, orderBy: { dueDate: 'asc' } });
    },

    notifications: async (_: any, __: any, ctx: any) => {
      const user = requireAuth(ctx);
      return prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
    },

    announcements: async (_: any, { audience }: any, ctx: any) => {
      requireAuth(ctx);
      const where: any = {};
      if (audience) where.audience = { has: audience };
      return prisma.announcement.findMany({ where, include: { author: true }, orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] });
    },
  },

  Mutation: {
    login: async (_: any, { email, password, mfaCode }: any) => {
      return authService.login(email, password, mfaCode);
    },

    logout: async (_: any, __: any, ctx: any) => {
      const user = requireAuth(ctx);
      if (ctx.token) await authService.logout(user.id, ctx.token);
      return true;
    },

    markAttendance: async (_: any, { classId, date, records }: any, ctx: any) => {
      requireRole(ctx, 'ADMIN', 'TEACHER');
      await prisma.$transaction(
        records.map((r: any) =>
          prisma.attendance.upsert({
            where: { studentId_date: { studentId: r.studentId, date: new Date(date) } },
            update: { status: r.status, note: r.note },
            create: { studentId: r.studentId, classId, date: new Date(date), status: r.status, note: r.note, markedById: ctx.user.id },
          })
        )
      );
      return true;
    },

    createAnnouncement: async (_: any, { title, content, audience, pinned = false }: any, ctx: any) => {
      requireRole(ctx, 'ADMIN', 'TEACHER');
      return prisma.announcement.create({
        data: { title, content, audience, pinned, authorId: ctx.user.id },
        include: { author: true },
      });
    },

    markNotificationRead: async (_: any, { id }: any, ctx: any) => {
      requireAuth(ctx);
      await prisma.notification.update({ where: { id }, data: { read: true } });
      return true;
    },
  },

  // Field resolvers for nested types
  Student: {
    attendance: (parent: any, { limit = 30 }: any) =>
      prisma.attendance.findMany({ where: { studentId: parent.id }, orderBy: { date: 'desc' }, take: limit }),
    examResults: (parent: any) =>
      prisma.examResult.findMany({ where: { studentId: parent.id }, include: { exam: { include: { subject: true } } } }),
    feePayments: (parent: any) =>
      prisma.feePayment.findMany({ where: { studentId: parent.id }, include: { fee: true } }),
  },

  Teacher: {
    subjects: (parent: any) => prisma.teacher.findUnique({ where: { id: parent.id } }).subjects(),
    classes: (parent: any) => prisma.class.findMany({ where: { teacherId: parent.id } }),
  },

  Exam: {
    results: (parent: any) =>
      prisma.examResult.findMany({ where: { examId: parent.id }, include: { student: { include: { user: true } } } }),
  },
};
