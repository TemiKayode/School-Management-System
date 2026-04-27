import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import prisma from '../../config/database';
import { Role } from '@prisma/client';
import { getRedis } from '../../config/redis';
import { signToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { AppError } from '../../middleware/errorHandler';
import { sendEmail } from '../../utils/email';

export async function register(data: {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
}) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new AppError('Email already in use', 409);

  const hash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { ...data, password: hash, role: data.role as Role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return user;
}

export async function login(email: string, password: string, mfaCode?: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Invalid credentials', 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError('Invalid credentials', 401);

  if (user.mfaEnabled) {
    if (!mfaCode) throw new AppError('MFA code required', 403);
    const isValid = authenticator.verify({ token: mfaCode, secret: user.mfaSecret! });
    if (!isValid) throw new AppError('Invalid MFA code', 401);
  }

  const payload = { id: user.id, role: user.role, email: user.email };
  const accessToken = signToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store refresh token in Redis
  const redis = getRedis();
  await redis.setex(`refresh:${user.id}`, 30 * 24 * 3600, refreshToken);

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    accessToken,
    refreshToken,
  };
}

export async function refreshAccessToken(token: string) {
  const payload = verifyRefreshToken(token);
  const redis = getRedis();
  const stored = await redis.get(`refresh:${payload.id}`);
  if (stored !== token) throw new AppError('Invalid refresh token', 401);

  const newAccess = signToken({ id: payload.id, role: payload.role, email: payload.email });
  return { accessToken: newAccess };
}

export async function logout(userId: string, token: string) {
  const redis = getRedis();
  await redis.del(`refresh:${userId}`);
  // Blacklist access token for remaining TTL
  await redis.setex(`blacklist:${token}`, 7 * 24 * 3600, '1');
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // silent — don't reveal if email exists

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600 * 1000); // 1 hour
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpires: expires },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Password Reset',
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 1 hour.</p>`,
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExpires: { gt: new Date() } },
  });
  if (!user) throw new AppError('Invalid or expired reset token', 400);

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash, resetToken: null, resetTokenExpires: null },
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new AppError('Current password is incorrect', 400);

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hash } });
}

export async function enableMFA(userId: string) {
  const secret = authenticator.generateSecret();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const otpauth = authenticator.keyuri(user.email, process.env.MFA_ISSUER || 'SMS', secret);
  const qrCodeUrl = await QRCode.toDataURL(otpauth);

  await prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
  return { secret, qrCodeUrl };
}

export async function verifyMFA(userId: string, code: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.mfaSecret) throw new AppError('MFA not set up', 400);

  const isValid = authenticator.verify({ token: code, secret: user.mfaSecret });
  if (!isValid) throw new AppError('Invalid MFA code', 400);

  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
}

export async function disableMFA(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: false, mfaSecret: null },
  });
}
