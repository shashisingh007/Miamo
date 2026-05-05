// ─── Notifications Routes ────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const notificationsRouter = Router();

notificationsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { unreadOnly } = req.query;
    const where: any = { userId: req.userId! };
    if (unreadOnly === 'true') where.read = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: notifications });
  } catch (e) { next(e); }
});

notificationsRouter.get('/count', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.userId!, read: false } });
    res.json({ data: { count } });
  } catch (e) { next(e); }
});

notificationsRouter.post('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

notificationsRouter.post('/read-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.userId!, read: false }, data: { read: true } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});
