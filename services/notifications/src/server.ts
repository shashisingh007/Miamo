// ─── Miamo Notification Service ──────────────────────
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
export const app = express();
const PORT = parseInt(process.env.PORT || '3206', 10);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3100', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') app.use(morgan('short'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 2000, standardHeaders: true, legacyHeaders: false }));

interface AuthRequest extends Request { userId?: string; }
function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  if (userId && req.headers['x-internal-key'] === (process.env.INTERNAL_SERVICE_KEY || 'miamo-internal-dev-key')) {
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
  try { await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } }); res.json({ data: { success: true } }); } catch (e) { next(e); }
});

app.post('/api/v1/notifications/read-all', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await prisma.notification.updateMany({ where: { userId: req.userId!, read: false }, data: { read: true } }); res.json({ data: { success: true } }); } catch (e) { next(e); }
});

// Internal endpoint for other services to create notifications
app.post('/internal/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.headers['x-internal-key'];
    if (key !== (process.env.INTERNAL_SERVICE_KEY || 'miamo-internal-dev-key')) {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }
    const { userId, type, title, body, data } = req.body;
    const notification = await prisma.notification.create({ data: { userId, type, title, body, data: data || '{}' } });
    res.json({ data: notification });
  } catch (e) { next(e); }
});

// Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ error: { message: err.message, code: err.code || 'INTERNAL_ERROR', statusCode } });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => { console.log(`\n⚡ Miamo Notification Service on port ${PORT}\n`); });
}
