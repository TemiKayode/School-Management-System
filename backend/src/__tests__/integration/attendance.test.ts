import request from 'supertest';
import app from '../../app';
import { signToken } from '../../utils/jwt';

jest.mock('../../config/database', () => {
  const mockPrisma = {
    attendance: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return { __esModule: true, default: mockPrisma };
});

jest.mock('../../config/redis', () => ({
  getRedis: () => ({ get: jest.fn().mockResolvedValue(null), setex: jest.fn() }),
}));

import prisma from '../../config/database';
const mockPrisma = prisma as any;

const teacherToken = signToken({ id: 't1', role: 'TEACHER', email: 'teacher@test.com' });
const studentToken = signToken({ id: 's1', role: 'STUDENT', email: 'student@test.com' });

describe('POST /api/v1/attendance (bulk mark)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);
  });

  it('allows TEACHER to mark attendance', async () => {
    const res = await request(app)
      .post('/api/v1/attendance')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        classId: 'class-1',
        date: '2025-01-15',
        records: [
          { studentId: 's1', status: 'PRESENT' },
          { studentId: 's2', status: 'ABSENT', note: 'Sick' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('prevents STUDENT from marking attendance', async () => {
    const res = await request(app)
      .post('/api/v1/attendance')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ classId: 'c1', date: '2025-01-15', records: [] });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/attendance/summary', () => {
  beforeEach(() => {
    mockPrisma.attendance.groupBy.mockResolvedValue([
      { status: 'PRESENT', _count: { status: 18 } },
      { status: 'ABSENT', _count: { status: 2 } },
    ]);
  });

  it('returns grouped summary', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/summary?studentId=s1')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('present', 18);
    expect(res.body.data).toHaveProperty('absent', 2);
  });
});
