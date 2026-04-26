import request from 'supertest';
import app from '../../app';
import { signToken } from '../../utils/jwt';

jest.mock('../../config/database', () => {
  const mockPrisma = {
    student: { findMany: jest.fn(), count: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    examResult: { findMany: jest.fn() },
    attendance: { findMany: jest.fn() },
    feePayment: { findMany: jest.fn() },
    assignmentSubmission: { findMany: jest.fn() },
  };
  return { __esModule: true, default: mockPrisma };
});

jest.mock('../../config/redis', () => ({
  getRedis: () => ({ get: jest.fn().mockResolvedValue(null), setex: jest.fn() }),
}));

import prisma from '../../config/database';
const mockPrisma = prisma as any;

const adminToken = signToken({ id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' });
const teacherToken = signToken({ id: 'teacher-1', role: 'TEACHER', email: 'teacher@test.com' });
const studentToken = signToken({ id: 'student-1', role: 'STUDENT', email: 'student@test.com' });

const mockStudents = [
  { id: 's1', admissionNo: 'S001', user: { name: 'Alice', email: 'alice@test.com', avatar: null }, class: { name: '10A' }, enrolledAt: new Date() },
  { id: 's2', admissionNo: 'S002', user: { name: 'Bob', email: 'bob@test.com', avatar: null }, class: null, enrolledAt: new Date() },
];

describe('GET /api/v1/students', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.student.findMany.mockResolvedValue(mockStudents);
    mockPrisma.student.count.mockResolvedValue(2);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/students');
    expect(res.status).toBe(401);
  });

  it('returns 200 with student list for ADMIN', async () => {
    const res = await request(app)
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it('returns 200 for TEACHER', async () => {
    const res = await request(app)
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(200);
  });

  it('returns 403 for STUDENT role', async () => {
    const res = await request(app)
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/v1/students/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.student.delete.mockResolvedValue({ id: 's1' });
  });

  it('allows ADMIN to delete a student', async () => {
    const res = await request(app)
      .delete('/api/v1/students/s1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('prevents TEACHER from deleting a student', async () => {
    const res = await request(app)
      .delete('/api/v1/students/s1')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(403);
  });
});
