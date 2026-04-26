import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import prisma from '../../config/database';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.register(req.body);
    return sendSuccess(res, user, 'Registration successful', 201);
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, mfaCode } = req.body;
    const result = await authService.login(email, password, mfaCode);
    return sendSuccess(res, result, 'Login successful');
  } catch (err) { next(err); }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendError(res, 'Refresh token required', 400);
    const result = await authService.refreshAccessToken(refreshToken);
    return sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization!.split(' ')[1];
    await authService.logout(req.user!.id, token);
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) { next(err); }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.forgotPassword(req.body.email);
    return sendSuccess(res, null, 'If the email exists, a reset link has been sent');
  } catch (err) { next(err); }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    return sendSuccess(res, null, 'Password reset successful');
  } catch (err) { next(err); }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    return sendSuccess(res, null, 'Password changed');
  } catch (err) { next(err); }
}

export async function enableMFA(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await authService.enableMFA(req.user!.id);
    return sendSuccess(res, result, 'Scan QR code with authenticator app');
  } catch (err) { next(err); }
}

export async function verifyMFA(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await authService.verifyMFA(req.user!.id, req.body.code);
    return sendSuccess(res, null, 'MFA enabled');
  } catch (err) { next(err); }
}

export async function disableMFA(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await authService.disableMFA(req.user!.id);
    return sendSuccess(res, null, 'MFA disabled');
  } catch (err) { next(err); }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, mfaEnabled: true, createdAt: true },
    });
    return sendSuccess(res, user);
  } catch (err) { next(err); }
}
