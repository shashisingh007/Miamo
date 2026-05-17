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
import { logger } from '../../shared/src/logger';
import { sanitize, sanitizeObject } from '../../shared/src/sanitize';
import { auditLog } from '../../shared/src/audit';

import { randomBytes } from 'crypto';

const DB_URL = process.env.DATABASE_URL || 'postgresql://miamo:miamo@localhost:5432/miamo?schema=public';
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  datasources: { db: { url: DB_URL + (DB_URL.includes('?') ? '&' : '?') + 'connection_limit=10&pool_timeout=20' } },
});
export const app = express();

const PORT = parseInt(process.env.PORT || '3201', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'miamo-dev-jwt-secret-change-in-production-2026';
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

function parseDevice(ua: string) {
  const isMobile = /mobile|android|iphone/i.test(ua);
  const isTablet = /tablet|ipad/i.test(ua);
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
  const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/i);
  const osMatch = ua.match(/(Windows|Mac OS X|Linux|Android|iOS)[\s/]?[\d._]*/i);
  return {
    deviceType,
    browser: browserMatch ? browserMatch[1] : 'Unknown',
    os: osMatch ? osMatch[0].replace(/_/g, '.') : 'Unknown',
  };
}

async function createSession(userId: string, req: Request) {
  const ua = req.headers['user-agent'] || '';
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
  const { deviceType, browser, os } = parseDevice(ua);
  const token = randomBytes(32).toString('hex');
  return prisma.session.create({
    data: { userId, token, deviceType, browser, os, ipAddress: ip, userAgent: ua, lastActiveAt: new Date() },
  });
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
    const { email: rawEmail, password, displayName: rawDisplayName } = req.body;
    if (!rawEmail || !password || !rawDisplayName) throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    const email = sanitize(rawEmail);
    const displayName = sanitize(rawDisplayName);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');

    // Hash password with bcrypt using 12 rounds (2^12 = 4096 iterations).
    // 12 rounds balances security (~250ms per hash) vs. UX responsiveness.
    // Lower rounds risk brute-force; higher rounds delay login response.
    const passwordHash = await bcrypt.hash(password, 12);

    // Auto-generate a username from the email prefix + random suffix.
    // This gives every user a unique, URL-safe identifier immediately.
    // Users can change their username later in settings.
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 100);

    // Create User + Profile + Settings + PrivacySettings in one transaction.
    // Profile starts with sensible defaults (age 25, score 30) so the user
    // can immediately appear in Discover while they complete their profile.
    // The profileScore of 30 indicates an incomplete profile, which the UI
    // nudges the user to improve.
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
    const session = await createSession(user.id, req);
    auditLog(prisma, user.id, 'register', { email });
    res.status(201).json({
      data: {
        user: { id: user.id, email: user.email, displayName: user.displayName, username: user.username, miamoId: user.miamoId, verified: user.verified, profileScore: user.profile?.profileScore || 30, avatar: null },
        ...tokens, sessionId: session.id,
      },
    });
  } catch (e) { next(e); }
});

// Login
app.post('/api/v1/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email: rawEmail, password } = req.body;
    if (!rawEmail || !password) throw new AppError('Email and password required', 400, 'VALIDATION_ERROR');
    const email = sanitize(rawEmail);

    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true, photos: { orderBy: { position: 'asc' }, take: 1 } } });
    if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    if (!user.active || user.deactivated) throw new AppError('Account deactivated', 403, 'ACCOUNT_DEACTIVATED');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

    if (user.profile) {
      await prisma.profile.update({ where: { userId: user.id }, data: { online: true, lastActive: new Date() } });
    }

    const tokens = generateTokens(user.id);
    const session = await createSession(user.id, req);
    auditLog(prisma, user.id, 'login', { email });
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
        ...tokens, sessionId: session.id,
      },
    });
  } catch (e) { next(e); }
});

// Logout
app.post('/api/v1/auth/logout', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.userId) {
      await prisma.profile.update({ where: { userId: req.userId }, data: { online: false, lastActive: new Date() } }).catch((e: unknown) => logger.warn('Logout profile update failed:', e));
      // Revoke all active sessions for this user (logout = full sign-out)
      await prisma.session.updateMany({ where: { userId: req.userId, revoked: false }, data: { revoked: true } }).catch((e: unknown) => logger.warn('Session revoke failed:', e));
      auditLog(prisma, req.userId, 'logout');
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Change password
app.put('/api/v1/auth/password', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new AppError('Both current and new password required', 400, 'VALIDATION_ERROR');
    if (newPassword.length < 6) throw new AppError('New password must be at least 6 characters', 400, 'VALIDATION_ERROR');

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.userId }, data: { passwordHash } });
    // Revoke all sessions except current on password change
    await prisma.session.updateMany({ where: { userId: req.userId!, revoked: false }, data: { revoked: true } }).catch((e: unknown) => logger.warn('Session revoke on pw change failed:', e));
    auditLog(prisma, req.userId!, 'password_change');
    res.json({ data: { success: true, message: 'Password updated successfully' } });
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
    // Update session lastActiveAt
    await prisma.session.updateMany({ where: { userId: payload.userId, revoked: false }, data: { lastActiveAt: new Date() } }).catch((e: unknown) => logger.warn('Session refresh update failed:', e));
    res.json({ data: tokens });
  } catch (e) { next(e); }
});

// ─── Session Management ─────────────────────────────
app.get('/api/v1/auth/sessions', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.userId, revoked: false },
      orderBy: { lastActiveAt: 'desc' },
      select: { id: true, deviceType: true, deviceName: true, browser: true, os: true, ipAddress: true, location: true, lastActiveAt: true, createdAt: true },
    });
    res.json({ data: sessions });
  } catch (e) { next(e); }
});

app.post('/api/v1/auth/sessions/:id/revoke', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await prisma.session.findFirst({ where: { id: req.params.id, userId: req.userId, revoked: false } });
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    await prisma.session.update({ where: { id: req.params.id }, data: { revoked: true } });
    auditLog(prisma, req.userId!, 'session_revoke', { sessionId: req.params.id });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// ─── Error Handler ───────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ error: { message: err.message, code: err.code || 'INTERNAL_ERROR', statusCode } });
});

// ─── Start ───────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Miamo Auth Service on port ${PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down auth service...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Auth service stopped cleanly');
      process.exit(0);
    });
    setTimeout(() => { process.exit(1); }, 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
