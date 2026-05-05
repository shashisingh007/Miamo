// ─── Beats Routes ────────────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const beatsRouter = Router();

// Get my beats
beatsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { state } = req.query;
    const where: any = { OR: [{ user1Id: userId }, { user2Id: userId }] };
    if (state) where.state = state;

    const beats = await prisma.beat.findMany({
      where,
      include: {
        user1: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        user2: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        events: { take: 5, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = beats.map(b => {
      const otherUser = b.user1Id === userId ? b.user2 : b.user1;
      const { passwordHash, ...other } = otherUser;
      return { id: b.id, user: other, count: b.count, state: b.state, events: b.events, createdAt: b.createdAt, updatedAt: b.updatedAt };
    });

    res.json({ data: result });
  } catch (e) { next(e); }
});

// Start beat with matched user
beatsRouter.post('/start', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { matchedUserId } = req.body;
    const userId = req.userId!;

    // Check match exists
    const match = await prisma.match.findFirst({
      where: { OR: [{ user1Id: userId, user2Id: matchedUserId }, { user1Id: matchedUserId, user2Id: userId }], active: true },
    });
    if (!match) return res.status(400).json({ error: { message: 'Must be matched first' } });

    const beat = await prisma.beat.create({
      data: { user1Id: userId, user2Id: matchedUserId, count: 1, state: 'active', lastUser1: new Date() },
    });

    await prisma.beatEvent.create({
      data: { beatId: beat.id, userId, type: 'text', content: 'Beat started! ⚡' },
    });

    res.json({ data: beat });
  } catch (e) { next(e); }
});

// Complete today's beat
beatsRouter.post('/:id/complete', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const beat = await prisma.beat.findUnique({ where: { id: req.params.id } });
    if (!beat) return res.status(404).json({ error: { message: 'Beat not found' } });

    const isUser1 = beat.user1Id === userId;
    const lastField = isUser1 ? 'lastUser1' : 'lastUser2';
    const otherLastField = isUser1 ? 'lastUser2' : 'lastUser1';

    // Check if other user also completed today
    const otherLast = beat[otherLastField];
    const otherCompletedToday = otherLast && (new Date().getTime() - otherLast.getTime()) < 86400000;

    const newCount = otherCompletedToday ? beat.count + 1 : beat.count;

    const updated = await prisma.beat.update({
      where: { id: req.params.id },
      data: { [lastField]: new Date(), count: newCount, state: 'active' },
    });

    await prisma.beatEvent.create({
      data: { beatId: beat.id, userId, type: req.body.type || 'snap', content: req.body.content || 'Daily beat! ⚡' },
    });

    res.json({ data: updated });
  } catch (e) { next(e); }
});

// Mark missed (simulate)
beatsRouter.post('/:id/miss', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await prisma.beat.update({
      where: { id: req.params.id },
      data: { state: 'weak' },
    });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

// Expire beat (simulate)
beatsRouter.post('/:id/expire', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await prisma.beat.update({
      where: { id: req.params.id },
      data: { state: 'lost', count: 0 },
    });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

// Restore beat (demo)
beatsRouter.post('/:id/restore', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await prisma.beat.update({
      where: { id: req.params.id },
      data: { state: 'active', count: 1, lastUser1: new Date(), lastUser2: new Date() },
    });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

// Archive beat
beatsRouter.post('/:id/archive', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await prisma.beat.update({
      where: { id: req.params.id },
      data: { state: 'archived' },
    });
    res.json({ data: updated });
  } catch (e) { next(e); }
});
