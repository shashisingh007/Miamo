// ─── Auth Routes ─────────────────────────────────────
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../server';
import { AppError } from '../../middleware/error';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'miamo-dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'miamo-refresh-secret-change';

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

export const authRouter = Router();

// Register
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');

    const passwordHash = await bcrypt.hash(password, 12);
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 100);
    const miamoId = username;

    const user = await prisma.user.create({
      data: {
        email, passwordHash, displayName, username, miamoId,
        profile: { create: { age: 25, gender: 'other', city: 'Unknown', profession: 'Not set', bio: '', profileScore: 30 } },
        settings: { create: {} },
        privacySettings: { create: {} },
      },
      include: { profile: true },
    });

    const tokens = generateTokens(user.id);
    res.status(201).json({
      data: {
        user: { id: user.id, email: user.email, displayName: user.displayName, username: user.username, miamoId: user.miamoId, verified: user.verified, profileScore: user.profile?.profileScore || 30, avatar: null },
        ...tokens,
      },
    });
  } catch (e) { next(e); }
});

// Login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError('Email and password required', 400, 'VALIDATION_ERROR');

    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true, photos: { orderBy: { position: 'asc' }, take: 1 } } });
    if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    if (!user.active || user.deactivated) throw new AppError('Account deactivated', 403, 'ACCOUNT_DEACTIVATED');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

    // Update online status
    if (user.profile) {
      await prisma.profile.update({ where: { userId: user.id }, data: { online: true, lastActive: new Date() } });
    }

    const tokens = generateTokens(user.id);
    res.json({
      data: {
        user: {
          id: user.id, email: user.email, displayName: user.displayName, username: user.username,
          miamoId: user.miamoId, verified: user.verified,
          profileScore: user.profile?.profileScore || 30,
          avatar: user.photos[0]?.url || null,
          age: user.profile?.age, city: user.profile?.city, profession: user.profile?.profession,
          bio: user.profile?.bio, seriousMode: user.profile?.seriousMode,
          datingIntent: user.profile?.datingIntent, gender: user.profile?.gender,
          online: true,
        },
        ...tokens,
      },
    });
  } catch (e) { next(e); }
});

// Logout
authRouter.post('/logout', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.userId) {
      await prisma.profile.update({ where: { userId: req.userId }, data: { online: false, lastActive: new Date() } }).catch(() => {});
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Get current user
authRouter.get('/me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        profile: true,
        photos: { orderBy: { position: 'asc' } },
        prompts: { orderBy: { position: 'asc' } },
        interests: true,
        settings: true,
        privacySettings: true,
      },
    });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    const { passwordHash, ...userData } = user;
    res.json({ data: { user: userData } });
  } catch (e) { next(e); }
});
