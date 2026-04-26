import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess } from '../utils/apiResponse';
import { AuthRequest } from './auth';

// Adds GDPR-required response headers
export function gdprHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
}

// Right to Access — export all personal data for a user
export async function exportMyData(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const [user, student, notifications, messages] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } }),
      prisma.student.findUnique({ where: { userId }, include: { attendance: true, examResults: true, feePayments: true } }),
      prisma.notification.findMany({ where: { userId } }),
      prisma.message.findMany({ where: { senderId: userId } }),
    ]);
    return sendSuccess(res, { user, student, notifications, messages }, 'Your data export');
  } catch (err) { next(err); }
}

// Right to Erasure — anonymise personal data
export async function deleteMyData(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.message.deleteMany({ where: { senderId: userId } }),
      prisma.user.update({
        where: { id: userId },
        data: { name: '[Deleted User]', email: `deleted-${userId}@deleted.invalid`, phone: null, avatar: null },
      }),
    ]);
    return sendSuccess(res, null, 'Your data has been anonymised');
  } catch (err) { next(err); }
}

// Consent audit log middleware
export function auditConsent(req: Request, _res: Response, next: NextFunction) {
  if (req.method !== 'GET') {
    // In production wire this to an audit log table / external SIEM
    const record = {
      ip: req.ip,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
    };
    // logger.debug('Audit', record); // uncomment to log every mutating request
  }
  next();
}
