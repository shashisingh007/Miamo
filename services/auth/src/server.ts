// ─── Miamo Auth Service ──────────────────────────────
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
export const app = express();

const PORT = parseInt(process.env.PORT || '3201', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'miamo-dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'miamo-refresh-secret-change';

// ─── Middleware ───────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3100', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') app.use(morgan('short'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }));

// ─── Helpers ─────────────────────────────────────────
class AppError extends Error {
  statusCode: number; code: string;
  constructor(message: string, statusCode: number, code = 'UNKNOWN_ERROR') {
    super(message); this.statusCode = statusCode; this.code = code;
  }
}

interface AuthRequest extends Request { userId?: string; }

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const internalUserId = req.headers['x-user-id'] as string;
  if (internalUserId && req.headers['x-internal-key'] === (process.env.INTERNAL_SERVICE_KEY || 'miamo-internal-dev-key')) {
    req.userId = internalUserId; return next();
  }
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) return res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId; next();
  } catch { return res.status(401).json({ error: { message: 'Invalid or expired token', code: 'TOKEN_INVALID' } }); }
}

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

// ─── Health ──────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok', service: 'auth', timestamp: new Date().toISOString(), db: 'connected' }); }
  catch { res.status(503).json({ status: 'error', service: 'auth', db: 'disconnected' }); }
});

app.get('/ready', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ ready: true, service: 'auth' }); }
  catch { res.status(503).json({ ready: false, service: 'auth' }); }
});

// ─── Routes ──────────────────────────────────────────
// Register
app.post('/api/v1/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');

    const passwordHash = await bcrypt.hash(password, 12);
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 100);

    const user = await prisma.user.create({
      data: {
        email, passwordHash, displayName, username, miamoId: username,
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
app.post('/api/v1/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError('Email and password required', 400, 'VALIDATION_ERROR');

    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true, photos: { orderBy: { position: 'asc' }, take: 1 } } });
    if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    if (!user.active || user.deactivated) throw new AppError('Account deactivated', 403, 'ACCOUNT_DEACTIVATED');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

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
app.post('/api/v1/auth/logout', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.userId) {
      await prisma.profile.update({ where: { userId: req.userId }, data: { online: false, lastActive: new Date() } }).catch(() => {});
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Get current user
app.get('/api/v1/auth/me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { profile: true, photos: { orderBy: { position: 'asc' } }, prompts: { orderBy: { position: 'asc' } }, interests: true, settings: true, privacySettings: true },
    });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    const { passwordHash, ...userData } = user;
    res.json({ data: { user: userData } });
  } catch (e) { next(e); }
});

// Refresh token
app.post('/api/v1/auth/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400, 'VALIDATION_ERROR');
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    const tokens = generateTokens(payload.userId);
    res.json({ data: tokens });
  } catch (e) { next(e); }
});

// ─── Error Handler ───────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ error: { message: err.message, code: err.code || 'INTERNAL_ERROR', statusCode } });
});

// ─── Start ───────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n⚡ Miamo Auth Service on port ${PORT}\n`);
  });
}
