import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { sendError } from '../utils/apiResponse';
import { getRedis } from '../config/redis';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 'No token provided', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    // Check if token is blacklisted (logged out)
    const redis = getRedis();
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) return sendError(res, 'Token revoked', 401);

    req.user = verifyToken(token);
    next();
  } catch {
    return sendError(res, 'Invalid or expired token', 401);
  }
}
