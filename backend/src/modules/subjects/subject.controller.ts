import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function list(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
    return sendSuccess(res, subjects);
  } catch (err) { next(err); }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    const credits = req.body.credits === undefined ? 1 : Number(req.body.credits);

    if (!name || !code) return sendError(res, 'Subject name and code are required', 400);
    if (!Number.isInteger(credits) || credits < 1) return sendError(res, 'Credits must be a positive whole number', 400);

    const existing = await prisma.subject.findUnique({ where: { code } });
    if (existing) return sendError(res, 'A subject with this code already exists', 409);

    const subject = await prisma.subject.create({ data: { name, code, credits } });
    return sendSuccess(res, subject, 'Subject created', 201);
  } catch (err) { next(err); }
}
