import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import prisma from '../../config/database';
import { signToken, signRefreshToken } from '../../utils/jwt';
import { getRedis } from '../../config/redis';
import { sendError } from '../../utils/apiResponse';

const router = Router();

// ─── Google OAuth 2.0 ────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = `${process.env.BACKEND_URL}/api/v1/auth/oauth/google/callback`;

router.get('/google', (_req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/google/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const { access_token } = tokenRes.data;

    // Fetch user info
    const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { email, name, picture, sub: googleId } = userInfo.data;

    // Upsert user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          password: crypto.randomBytes(32).toString('hex'), // unusable password
          role: 'STUDENT',
          avatar: picture,
          oauthProvider: 'GOOGLE',
          oauthId: googleId,
        },
      });
    } else if (!user.oauthId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { oauthProvider: 'GOOGLE', oauthId: googleId, avatar: picture },
      });
    }

    const payload = { id: user.id, role: user.role, email: user.email };
    const accessToken = signToken(payload);
    const refreshToken = signRefreshToken(payload);

    const redis = getRedis();
    await redis.setex(`refresh:${user.id}`, 30 * 24 * 3600, refreshToken);

    // Redirect to frontend with tokens in query (frontend stores them)
    res.redirect(
      `${process.env.FRONTEND_URL}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}&role=${user.role}`
    );
  } catch (err) {
    console.error('OAuth error', err);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

// ─── Microsoft OAuth 2.0 ─────────────────────────────────────────────────────

const MS_CLIENT_ID = process.env.MS_CLIENT_ID!;
const MS_CLIENT_SECRET = process.env.MS_CLIENT_SECRET!;
const MS_TENANT_ID = process.env.MS_TENANT_ID || 'common';
const MS_REDIRECT_URI = `${process.env.BACKEND_URL}/api/v1/auth/oauth/microsoft/callback`;

router.get('/microsoft', (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    redirect_uri: MS_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile User.Read',
    response_mode: 'query',
  });
  res.redirect(`https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/authorize?${params}`);
});

router.get('/microsoft/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);

  try {
    const tokenRes = await axios.post(
      `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        code: code as string,
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        redirect_uri: MS_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const userInfo = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
    });

    const { mail, displayName, id: msId } = userInfo.data;
    const email = mail || userInfo.data.userPrincipalName;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: displayName,
          password: crypto.randomBytes(32).toString('hex'),
          role: 'STUDENT',
          oauthProvider: 'MICROSOFT',
          oauthId: msId,
        },
      });
    }

    const payload = { id: user.id, role: user.role, email: user.email };
    const accessToken = signToken(payload);
    const refreshToken = signRefreshToken(payload);
    const redis = getRedis();
    await redis.setex(`refresh:${user.id}`, 30 * 24 * 3600, refreshToken);

    res.redirect(
      `${process.env.FRONTEND_URL}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}&role=${user.role}`
    );
  } catch (err) {
    console.error('MS OAuth error', err);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

export default router;
