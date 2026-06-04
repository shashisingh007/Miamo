// ─── Miamo Notification Service ──────────────────────
import express, { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/src/logger';
import { errorHandler } from '../../shared/src/errorHandler';
import { validate } from '../../shared/src/validate';
import { markReadBodySchema } from '../../shared/src/schemas';
import { sanitize } from '../../shared/src/sanitize';
import { env } from '../../shared/src/env';
import { createPrisma, applyBaseMiddleware, installHealthRoutes, createInternalAuthMiddleware, createPushToUser } from '../../shared/src/service';
import { cursorOpt } from '../../shared/src/coerce';
import { PrismaSignalReader } from '../../shared/src/algo/signals';
import { nextNotifyAt } from '../../shared/src/algo/notifyTiming';
import { v4RankEnabled } from '../../shared/src/algo/flags';
import { loadPersonalizationCtx } from '../../shared/personalize';

const prisma = createPrisma(5);
export const app = express();
const PORT = parseInt(process.env.PORT || '3206', 10);

applyBaseMiddleware(app, { jsonLimit: '1mb', serviceName: 'notifications' });
interface AuthRequest extends Request { userId?: string }
const authMiddleware = createInternalAuthMiddleware();
installHealthRoutes(app, 'notifications', prisma);
const pushToUser = createPushToUser();

// Per-intent relevance weights for notification types. Different intents
// care about different things: a serious user values match/profile-view
// notifications; a casual user values likes/messages; DTM seekers value
// access requests/family-info notifications.
const NOTIF_RELEVANCE: Record<string, Record<string, number>> = {
  serious:   { match: 1.4, profile_view: 1.3, access_request: 1.2, message: 1.0, like: 0.7, super_like: 1.1, system: 0.5, marketing: 0.2 },
  dtm:       { access_request: 1.6, match: 1.3, profile_view: 1.2, message: 0.9, like: 0.6, super_like: 0.8, system: 0.5, marketing: 0.1 },
  casual:    { like: 1.3, message: 1.3, super_like: 1.4, match: 1.1, profile_view: 0.7, access_request: 0.5, system: 0.5, marketing: 0.4 },
  exploring: { like: 1.0, message: 1.1, match: 1.1, profile_view: 0.9, super_like: 1.0, access_request: 0.8, system: 0.5, marketing: 0.3 },
};

function notifRelevance(intent: 'serious' | 'dtm' | 'casual' | 'exploring', type: string): number {
  const w = NOTIF_RELEVANCE[intent] || NOTIF_RELEVANCE.exploring;
  return w[type] ?? 0.8;
}

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

    // v6.8 personalization: rerank by intent-aware type relevance + recency
    // − read penalty. Unread urgent items float; old read marketing sinks.
    let pMeta: any = null;
    let ordered: any[] = notifications;
    try {
      if (notifications.length > 1) {
        const ctx = await loadPersonalizationCtx(prisma, req.userId!, { surface: 'notifications', prevWindowMin: 1440 });
        const scored = notifications.map((n: any) => {
          const ageH = (Date.now() - new Date(n.createdAt).getTime()) / 3600_000;
          const recency = Math.exp(-ageH / 48); // 48h half-life
          const rel = notifRelevance(ctx.intent.revealed, n.type || 'system');
          const readPenalty = n.read ? 0.3 : 1.0;
          const score = recency * rel * readPenalty;
          return { n, score };
        });
        scored.sort((a, b) => b.score - a.score);
        ordered = scored.map(s => s.n);
        pMeta = { intent: { revealed: ctx.intent.revealed, confidence: ctx.intent.confidence }, reranked: true };
      }
    } catch { /* fallback to chronological */ }

    res.json({ data: ordered, nextCursor, meta: pMeta || undefined });
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
app.post('/api/v1/notifications/mark-read', authMiddleware, validate({ body: markReadBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    // v4: stamp a recommended delivery time onto data.scheduledFor so cron / push
    // workers can hold non-urgent notifications until the recipient's peak hour.
    // Non-breaking: the row is still created immediately; consumers may ignore.
    let finalData = data || '{}';
    if (v4RankEnabled('notifications')) {
      try {
        const reader = new PrismaSignalReader(prisma);
        const feat = await reader.features(reader.hashOf(userId));
        const lastSent = await prisma.notification.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });
        const scheduledFor = nextNotifyAt({
          now: new Date(),
          peakHours: feat?.peakHours ?? null,
          quietHours: null,
          lastSent: lastSent?.createdAt ?? null,
          minSpacingSec: 1800,
          tzOffsetMin: 0,
        });
        const parsed = typeof finalData === 'string' ? (() => { try { return JSON.parse(finalData); } catch { return {}; } })() : finalData;
        finalData = JSON.stringify({ ...parsed, scheduledFor: scheduledFor.toISOString(), algo: 'v4' });
      } catch { /* silent fallback to legacy */ }
    }

    const notification = await prisma.notification.create({ data: { userId, type, title, body, data: finalData } });
    // Push real-time notification to user via SSE
    const unreadCount = await prisma.notification.count({ where: { userId, read: false } });
    pushToUser(userId, 'new-notification', { notification, unreadCount });
    res.json({ data: notification });
  } catch (e) { next(e); }
});

// v4: schedule-only helper. Returns the recommended next delivery timestamp
// for a user without creating a notification row. Useful for batchers / cron.
app.post('/internal/notifications/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.headers['x-internal-key'];
    if (key !== env.internalServiceKey) return res.status(403).json({ error: { message: 'Forbidden' } });
    if (!v4RankEnabled('notifications')) return res.status(404).json({ error: { message: 'v4 notifications disabled' } });
    const { userId, minSpacingSec = 1800, tzOffsetMin = 0, quietHours = null } = req.body || {};
    if (!userId) return res.status(400).json({ error: { message: 'userId required' } });
    const reader = new PrismaSignalReader(prisma);
    const feat = await reader.features(reader.hashOf(userId));
    const lastSent = await prisma.notification.findFirst({
      where: { userId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true },
    });
    const at = nextNotifyAt({
      now: new Date(),
      peakHours: feat?.peakHours ?? null,
      quietHours,
      lastSent: lastSent?.createdAt ?? null,
      minSpacingSec,
      tzOffsetMin,
    });
    res.json({ data: { scheduledFor: at.toISOString(), algo: 'v4' } });
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
