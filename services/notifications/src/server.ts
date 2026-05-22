// ─── Miamo Notification Service ──────────────────────
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../shared/src/logger';
import { sanitize } from '../../shared/src/sanitize';
import { env } from '../../shared/src/env';

const DB_URL = process.env.DATABASE_URL || 'postgresql://miamo:miamo@localhost:5432/miamo?schema=public';
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  datasources: { db: { url: DB_URL + (DB_URL.includes('?') ? '&' : '?') + 'connection_limit=5&pool_timeout=20' } },
});
export const app = express();
const PORT = parseInt(process.env.PORT || '3206', 10);

// ═══ GATEWAY SSE PUSH HELPER ═════════════════════════
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3200';
const INTERNAL_KEY = env.internalServiceKey;

async function pushToUser(userId: string, event: string, data: any) {
  try {
    await fetch(`${GATEWAY_URL}/internal/push-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': INTERNAL_KEY },
      body: JSON.stringify({ userId, event, data }),
    });
  } catch (e) {
    logger.warn('SSE push failed for user', userId, ':', (e as Error).message);
  }
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3100', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') app.use(morgan('short'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 2000, standardHeaders: true, legacyHeaders: false }));

interface AuthRequest extends Request { userId?: string; }
function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  if (userId && req.headers['x-internal-key'] === env.internalServiceKey) {
    req.userId = userId; return next();
  }
  return res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
}

// Health
app.get('/health', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok', service: 'notifications', timestamp: new Date().toISOString(), db: 'connected' }); }
  catch { res.status(503).json({ status: 'error', service: 'notifications', db: 'disconnected' }); }
});
app.get('/ready', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ ready: true, service: 'notifications' }); }
  catch { res.status(503).json({ ready: false, service: 'notifications' }); }
});

// Routes
app.get('/api/v1/notifications', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { unreadOnly } = req.query;
    const where: any = { userId: req.userId! };
    if (unreadOnly === 'true') where.read = false;
    const notifications = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json({ data: notifications });
  } catch (e) { next(e); }
});

app.get('/api/v1/notifications/count', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.userId!, read: false } });
    res.json({ data: { count } });
  } catch (e) { next(e); }
});

app.post('/api/v1/notifications/:id/read', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // SECURITY FIX: Verify the notification belongs to the requesting user
    const notification = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!notification) return res.status(404).json({ error: { message: 'Notification not found', code: 'NOT_FOUND' } });
    await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.post('/api/v1/notifications/read-all', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await prisma.notification.updateMany({ where: { userId: req.userId!, read: false }, data: { read: true } }); res.json({ data: { success: true } }); } catch (e) { next(e); }
});

// Bulk mark-read by IDs
app.post('/api/v1/notifications/mark-read', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      await prisma.notification.updateMany({ where: { id: { in: ids }, userId: req.userId! }, data: { read: true } });
    } else {
      await prisma.notification.updateMany({ where: { userId: req.userId!, read: false }, data: { read: true } });
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Internal endpoint for other services to create notifications
app.post('/internal/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.headers['x-internal-key'];
    if (key !== INTERNAL_KEY) {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }
    const { userId, type, title: rawTitle, body: rawBody, data } = req.body;
    const title = sanitize(rawTitle || '');
    const body = sanitize(rawBody || '');
    const notification = await prisma.notification.create({ data: { userId, type, title, body, data: data || '{}' } });
    // Push real-time notification to user via SSE
    const unreadCount = await prisma.notification.count({ where: { userId, read: false } });
    pushToUser(userId, 'new-notification', { notification, unreadCount });
    res.json({ data: notification });
  } catch (e) { next(e); }
});

// Error Handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const error = err as { statusCode?: number; message?: string; code?: string };
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (error.message || 'Internal server error');
  if (statusCode >= 500) logger.error('Unhandled error:', error.message);
  res.status(statusCode).json({ error: { message, code: error.code || 'INTERNAL_ERROR', statusCode } });
});

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => { logger.info(`Miamo Notification Service on port ${PORT}`); });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down notifications service...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Notifications service stopped cleanly');
      process.exit(0);
    });
    setTimeout(() => { process.exit(1); }, 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
