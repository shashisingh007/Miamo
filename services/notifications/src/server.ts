// ─── Miamo Notification Service ──────────────────────
import express, { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/src/logger';
import { errorHandler } from '../../shared/src/errorHandler';
import { sanitize } from '../../shared/src/sanitize';
import { env } from '../../shared/src/env';
import { createPrisma, applyBaseMiddleware, installHealthRoutes, createInternalAuthMiddleware, createPushToUser } from '../../shared/src/service';
import { cursorOpt } from '../../shared/src/coerce';

const prisma = createPrisma(5);
export const app = express();
const PORT = parseInt(process.env.PORT || '3206', 10);

applyBaseMiddleware(app, { jsonLimit: '1mb', serviceName: 'notifications' });
interface AuthRequest extends Request { userId?: string }
const authMiddleware = createInternalAuthMiddleware();
installHealthRoutes(app, 'notifications', prisma);
const pushToUser = createPushToUser();

// Routes
app.get('/api/v1/notifications', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { unreadOnly, cursor } = req.query;
    const where: any = { userId: req.userId! };
    if (unreadOnly === 'true') where.read = false;
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      ...cursorOpt(cursor),
    });
    const nextCursor = notifications.length === 50 ? notifications[notifications.length - 1].id : null;
    res.json({ data: notifications, nextCursor });
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
    if (key !== env.internalServiceKey) {
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
app.use(errorHandler);

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
