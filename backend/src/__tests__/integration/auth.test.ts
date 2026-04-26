import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../app';

// Mock Prisma and Redis for integration tests
jest.mock('../../config/database', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  return { __esModule: true, default: mockPrisma };
});

jest.mock('../../config/redis', () => ({
  getRedis: () => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  }),
}));

import prisma from '../../config/database';

const mockPrisma = prisma as any;

describe('POST /api/v1/auth/login', () => {
  const hashedPassword = bcrypt.hashSync('ValidPass@1', 10);

  const mockUser = {
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@test.com',
    password: hashedPassword,
    role: 'ADMIN',
    mfaEnabled: false,
    avatar: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
  });

  it('returns 200 with tokens on valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'ValidPass@1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe('admin@test.com');
  });

  it('returns 422 on invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'ValidPass@1' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid credentials/i);
  });

  it('returns 401 when user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.com', password: 'ValidPass@1' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'new-user',
      name: 'New User',
      email: 'new@test.com',
      role: 'STUDENT',
      createdAt: new Date(),
    });
  });

  it('creates a user and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'New User', email: 'new@test.com', password: 'ValidPass@1', role: 'STUDENT' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('returns 409 when email already exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Dup', email: 'dup@test.com', password: 'ValidPass@1', role: 'STUDENT' });

    expect(res.status).toBe(409);
  });

  it('rejects invalid role', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'X', email: 'x@test.com', password: 'ValidPass@1', role: 'SUPERUSER' });

    expect(res.status).toBe(422);
  });
});
