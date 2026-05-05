// ─── Matches Routes ──────────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const matchesRouter = Router();

// Get my matches (with search, filter, favorite, pin support)
matchesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { q, filter } = req.query; // q = search, filter = all|new|active|favorites|serious

    const matches = await prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }], active: true },
      include: {
        user1: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } }, interests: true } },
        user2: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } }, interests: true } },
        chat: { include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let result = matches.map(m => {
      const isUser1 = m.user1Id === userId;
      const otherUser = isUser1 ? m.user2 : m.user1;
      const { passwordHash, ...other } = otherUser;
      return {
        id: m.id,
        matchedUser: other,
        chatId: m.chat?.id,
        lastMessage: m.chat?.messages[0],
        createdAt: m.createdAt,
        isFavorite: isUser1 ? m.favorite1 : m.favorite2,
        isPinned: isUser1 ? m.pinned1 : m.pinned2,
        isNew: (Date.now() - new Date(m.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000,
      };
    });

    // Search by name, username, or miamoId
    if (q && typeof q === 'string' && q.trim()) {
      const search = q.toLowerCase().trim();
      result = result.filter(m => {
        const u = m.matchedUser as any;
        return (u.displayName || '').toLowerCase().includes(search) ||
               (u.username || '').toLowerCase().includes(search) ||
               (u.miamoId || '').toLowerCase().includes(search);
      });
    }

    // Filter
    if (filter === 'new') result = result.filter(m => m.isNew);
    else if (filter === 'active') result = result.filter(m => (m.matchedUser as any).profile?.online);
    else if (filter === 'favorites') result = result.filter(m => m.isFavorite);
    else if (filter === 'serious') result = result.filter(m => (m.matchedUser as any).profile?.seriousMode);

    // Pinned first, then favorites, then by date
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json({ data: result });
  } catch (e) { next(e); }
});

// Toggle favorite
matchesRouter.post('/:id/favorite', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: { message: 'Match not found' } });
    const isUser1 = match.user1Id === userId;
    const currentFav = isUser1 ? match.favorite1 : match.favorite2;
    await prisma.match.update({
      where: { id: req.params.id },
      data: isUser1 ? { favorite1: !currentFav } : { favorite2: !currentFav },
    });
    res.json({ data: { isFavorite: !currentFav } });
  } catch (e) { next(e); }
});

// Toggle pin
matchesRouter.post('/:id/pin', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: { message: 'Match not found' } });
    const isUser1 = match.user1Id === userId;
    const currentPin = isUser1 ? match.pinned1 : match.pinned2;
    await prisma.match.update({
      where: { id: req.params.id },
      data: isUser1 ? { pinned1: !currentPin } : { pinned2: !currentPin },
    });
    res.json({ data: { isPinned: !currentPin } });
  } catch (e) { next(e); }
});

// Get match requests (incoming)
matchesRouter.get('/requests', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.matchRequest.findMany({
      where: { toUserId: req.userId!, status: 'pending' },
      include: { fromUser: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: requests.map(r => { const { passwordHash, ...user } = r.fromUser; return { ...r, fromUser: user }; }) });
  } catch (e) { next(e); }
});

// Get sent requests
matchesRouter.get('/requests/sent', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.matchRequest.findMany({
      where: { fromUserId: req.userId! },
      include: { toUser: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: requests.map(r => { const { passwordHash, ...user } = r.toUser; return { ...r, toUser: user }; }) });
  } catch (e) { next(e); }
});

// Accept request → creates match
matchesRouter.post('/requests/:id/accept', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const request = await prisma.matchRequest.update({
      where: { id: req.params.id },
      data: { status: 'accepted' },
    });
    const match = await prisma.match.create({
      data: { user1Id: request.fromUserId, user2Id: request.toUserId },
    });
    await prisma.chat.create({
      data: { matchId: match.id, user1Id: request.fromUserId, user2Id: request.toUserId },
    });
    await prisma.notification.create({
      data: { userId: request.fromUserId, type: 'match', title: 'Match accepted! 🎉', body: 'Your thoughtful comment was accepted! You can now chat.' },
    });
    res.json({ data: { match, request } });
  } catch (e) { next(e); }
});

// Reject request
matchesRouter.post('/requests/:id/reject', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const request = await prisma.matchRequest.update({
      where: { id: req.params.id },
      data: { status: 'rejected' },
    });
    res.json({ data: request });
  } catch (e) { next(e); }
});

// Unmatch with feedback
matchesRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { reason, details } = req.body || {};
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: { message: 'Match not found' } });

    const targetUserId = match.user1Id === userId ? match.user2Id : match.user1Id;

    // Store feedback for algorithm improvement
    if (reason) {
      await prisma.matchFeedback.create({
        data: { matchId: match.id, userId, targetUserId, type: 'unmatch', reason, details: details || '' },
      });
    }

    await prisma.match.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Report match with feedback
matchesRouter.post('/:id/report', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { reason, details } = req.body;
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: { message: 'Match not found' } });

    const targetUserId = match.user1Id === userId ? match.user2Id : match.user1Id;

    // Store in MatchFeedback for algorithm
    await prisma.matchFeedback.create({
      data: { matchId: match.id, userId, targetUserId, type: 'report', reason: reason || 'other', details: details || '' },
    });

    // Also create a safety report
    await prisma.report.create({
      data: { reporterId: userId, reportedId: targetUserId, reason: reason || 'other', details: details || '', targetType: 'match', targetId: match.id, status: 'pending' },
    });

    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});
