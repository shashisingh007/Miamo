// ─── Discover Routes ─────────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const discoverRouter = Router();

// ─── GET /discover — Enhanced with all filters ───────
discoverRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const {
      seriousOnly, verifiedOnly, minAge, maxAge, city, cursor,
      gender, sexuality, lookingFor, smoking, drinking, exercise,
      minHeight, maxHeight, education, religion, zodiac, pets, children,
      activeToday, newHere, hasPhotos,
    } = req.query;

    const blocks = await prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    });
    const blockedIds = blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId);
    blockedIds.push(userId);

    const sentLikes = await prisma.like.findMany({ where: { fromUserId: userId }, select: { toUserId: true } });
    const sentMoves = await prisma.miamoMove.findMany({ where: { fromUserId: userId }, select: { toUserId: true } });
    const excludeIds = [...new Set([...blockedIds, ...sentLikes.map(l => l.toUserId), ...sentMoves.map(m => m.toUserId)])];

    const where: any = {
      active: true, deactivated: false,
      id: { notIn: excludeIds },
      privacySettings: { profileVisible: true },
    };

    const profileWhere: any = {};
    if (seriousOnly === 'true') profileWhere.seriousMode = true;
    if (minAge) profileWhere.age = { ...profileWhere.age, gte: parseInt(minAge as string) };
    if (maxAge) profileWhere.age = { ...profileWhere.age, lte: parseInt(maxAge as string) };
    if (city) profileWhere.city = { contains: city as string, mode: 'insensitive' };
    if (gender) profileWhere.gender = { in: (gender as string).split(',').map(g => g.trim()) };
    if (sexuality) profileWhere.sexuality = { in: (sexuality as string).split(',').map(s => s.trim()) };
    if (lookingFor) profileWhere.lookingFor = { in: (lookingFor as string).split(',').map(l => l.trim()) };
    if (minHeight) profileWhere.height = { ...profileWhere.height, gte: parseInt(minHeight as string) };
    if (maxHeight) profileWhere.height = { ...profileWhere.height, lte: parseInt(maxHeight as string) };
    if (smoking) profileWhere.smoking = { in: (smoking as string).split(',').map(s => s.trim()) };
    if (drinking) profileWhere.drinking = { in: (drinking as string).split(',').map(d => d.trim()) };
    if (exercise) profileWhere.exercise = { in: (exercise as string).split(',').map(e => e.trim()) };
    if (education) profileWhere.education = { contains: education as string, mode: 'insensitive' };
    if (religion) profileWhere.religion = { contains: religion as string, mode: 'insensitive' };
    if (zodiac) profileWhere.zodiac = { contains: zodiac as string, mode: 'insensitive' };
    if (pets) profileWhere.pets = { in: (pets as string).split(',').map(p => p.trim()) };
    if (children) profileWhere.children = { in: (children as string).split(',').map(c => c.trim()) };
    if (activeToday === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      profileWhere.lastActive = { gte: today };
    }
    if (newHere === 'true') {
      profileWhere.createdAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    }
    if (Object.keys(profileWhere).length > 0) where.profile = profileWhere;
    if (verifiedOnly === 'true') where.verified = true;
    if (hasPhotos === 'true') where.photos = { some: {} };

    const users = await prisma.user.findMany({
      where,
      include: {
        profile: true,
        photos: { orderBy: { position: 'asc' } },
        prompts: { orderBy: { position: 'asc' } },
        interests: true,
      },
      take: 20,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });

    const myInterests = await prisma.profileInterest.findMany({ where: { userId } });
    const myInterestNames = myInterests.map(i => i.name);
    const myProfile = await prisma.profile.findUnique({ where: { userId } });

    const profiles = users.map(u => {
      const { passwordHash, ...userData } = u;
      const commonInterests = u.interests.filter(i => myInterestNames.includes(i.name)).map(i => i.name);
      let quickScore = 0;
      if (u.profile && myProfile) {
        quickScore += commonInterests.length * 5;
        if (u.profile.datingIntent === myProfile.datingIntent) quickScore += 15;
        if (u.profile.city?.toLowerCase() === myProfile.city?.toLowerCase()) quickScore += 10;
        const ageDiff = Math.abs(u.profile.age - myProfile.age);
        if (ageDiff <= 3) quickScore += 10;
        else if (ageDiff <= 7) quickScore += 5;
        if (u.profile.smoking === myProfile.smoking) quickScore += 5;
        if (u.profile.drinking === myProfile.drinking) quickScore += 5;
      }
      return { ...userData, commonInterests, compatibilityScore: Math.min(quickScore, 100) };
    });

    profiles.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    res.json({ data: profiles, cursor: users[users.length - 1]?.id });
  } catch (e) { next(e); }
});

// ─── GET /discover/filters ──────────────────────────
discoverRouter.get('/filters', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let filters = await prisma.discoverFilter.findUnique({ where: { userId: req.userId! } });
    if (!filters) filters = await prisma.discoverFilter.create({ data: { userId: req.userId! } });
    res.json({ data: filters });
  } catch (e) { next(e); }
});

// ─── PUT /discover/filters ──────────────────────────
discoverRouter.put('/filters', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const b = req.body;
    const filters = await prisma.discoverFilter.upsert({
      where: { userId },
      create: { userId, ...b },
      update: b,
    });
    res.json({ data: filters });
  } catch (e) { next(e); }
});

// ─── POST /discover/like ────────────────────────────
discoverRouter.post('/like', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { toUserId, targetType, targetId } = req.body;
    const fromUserId = req.userId!;
    const like = await prisma.like.create({
      data: { fromUserId, toUserId, targetType: targetType || 'profile', targetId },
    });
    const mutual = await prisma.like.findFirst({ where: { fromUserId: toUserId, toUserId: fromUserId } });
    let match = null;
    if (mutual) {
      const existing = await prisma.match.findFirst({
        where: { OR: [{ user1Id: fromUserId, user2Id: toUserId }, { user1Id: toUserId, user2Id: fromUserId }] },
      });
      if (!existing) {
        match = await prisma.match.create({ data: { user1Id: fromUserId, user2Id: toUserId } });
        await prisma.chat.create({ data: { matchId: match.id, user1Id: fromUserId, user2Id: toUserId } });
        await prisma.notification.create({
          data: { userId: toUserId, type: 'match', title: 'New Match!', body: 'You have a new match!' },
        });
        await prisma.notification.create({
          data: { userId: fromUserId, type: 'match', title: 'New Match!', body: 'You have a new match!' },
        });
      }
    }
    res.json({ data: { like, match, isMutual: !!mutual } });
  } catch (e) { next(e); }
});

// ─── POST /discover/move — Send Miamo Move ──────────
discoverRouter.post('/move', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { toUserId, message, targetType, targetId } = req.body;
    const fromUserId = req.userId!;
    if (!toUserId) {
      return res.status(400).json({ error: { message: 'toUserId is required', code: 'MISSING_FIELD' } });
    }

    const existing = await prisma.miamoMove.findFirst({
      where: { fromUserId, toUserId, targetType: targetType || 'profile', targetId: targetId || null },
    });
    if (existing) {
      return res.status(409).json({ error: { message: 'Move already sent', code: 'ALREADY_SENT' } });
    }

    const move = await prisma.miamoMove.create({
      data: {
        fromUserId,
        toUserId,
        message: message || '',
        targetType: targetType || 'profile',
        targetId: targetId || null,
        status: 'pending',
      },
    });

    // Also create a like
    try {
      await prisma.like.create({
        data: { fromUserId, toUserId, targetType: targetType || 'profile', targetId: targetId || null },
      });
    } catch (err) {
      // duplicate like is fine
    }

    const sender = await prisma.user.findUnique({
      where: { id: fromUserId },
      select: { displayName: true },
    });
    const moveBody = message
      ? `${sender?.displayName || 'Someone'} sent: "${message.substring(0, 50)}"`
      : `${sender?.displayName || 'Someone'} made a move on your ${targetType || 'profile'}!`;

    await prisma.notification.create({
      data: {
        userId: toUserId,
        type: 'like',
        title: 'New Miamo Move!',
        body: moveBody,
        data: JSON.stringify({ moveId: move.id, fromUserId, targetType, targetId }),
      },
    });

    // Check for mutual move/like -> auto-match
    const mutualMove = await prisma.miamoMove.findFirst({
      where: { fromUserId: toUserId, toUserId: fromUserId, status: { not: 'rejected' } },
    });
    const mutualLike = await prisma.like.findFirst({
      where: { fromUserId: toUserId, toUserId: fromUserId },
    });

    let match = null;
    if (mutualMove || mutualLike) {
      const existingMatch = await prisma.match.findFirst({
        where: {
          OR: [
            { user1Id: fromUserId, user2Id: toUserId },
            { user1Id: toUserId, user2Id: fromUserId },
          ],
        },
      });
      if (!existingMatch) {
        match = await prisma.match.create({ data: { user1Id: fromUserId, user2Id: toUserId } });
        await prisma.chat.create({ data: { matchId: match.id, user1Id: fromUserId, user2Id: toUserId } });
        if (mutualMove) {
          await prisma.miamoMove.update({ where: { id: mutualMove.id }, data: { status: 'accepted' } });
        }
        await prisma.miamoMove.update({ where: { id: move.id }, data: { status: 'accepted' } });
        await prisma.notification.create({
          data: { userId: toUserId, type: 'match', title: 'Match!', body: 'Your moves connected!' },
        });
        await prisma.notification.create({
          data: { userId: fromUserId, type: 'match', title: 'Match!', body: 'Your moves connected!' },
        });
      }
    }
    res.json({ data: { move, match, isMutual: !!(mutualMove || mutualLike) } });
  } catch (e) { next(e); }
});

// ─── GET /discover/moves/received ───────────────────
discoverRouter.get('/moves/received', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const moves = await prisma.miamoMove.findMany({
      where: { toUserId: req.userId!, status: 'pending' },
      include: {
        fromUser: {
          include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      data: moves.map(m => {
        const { passwordHash, ...user } = m.fromUser;
        return { ...m, fromUser: user };
      }),
    });
  } catch (e) { next(e); }
});

// ─── POST /discover/moves/:id/accept ────────────────
discoverRouter.post('/moves/:id/accept', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const move = await prisma.miamoMove.update({
      where: { id: req.params.id },
      data: { status: 'accepted' },
    });
    const existingMatch = await prisma.match.findFirst({
      where: {
        OR: [
          { user1Id: move.fromUserId, user2Id: move.toUserId },
          { user1Id: move.toUserId, user2Id: move.fromUserId },
        ],
      },
    });
    let match = existingMatch;
    if (!existingMatch) {
      match = await prisma.match.create({
        data: { user1Id: move.fromUserId, user2Id: move.toUserId },
      });
      await prisma.chat.create({
        data: { matchId: match.id, user1Id: move.fromUserId, user2Id: move.toUserId },
      });
    }
    await prisma.notification.create({
      data: { userId: move.fromUserId, type: 'match', title: 'Move accepted!', body: 'Your Miamo Move was accepted!' },
    });
    res.json({ data: { match, move } });
  } catch (e) { next(e); }
});

// ─── POST /discover/moves/:id/reject ────────────────
discoverRouter.post('/moves/:id/reject', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const move = await prisma.miamoMove.update({
      where: { id: req.params.id },
      data: { status: 'rejected' },
    });
    res.json({ data: move });
  } catch (e) { next(e); }
});

// ─── POST /discover/comment — Legacy ────────────────
discoverRouter.post('/comment', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { toUserId, message, type, targetType, targetId } = req.body;
    const fromUserId = req.userId!;
    const existing = await prisma.matchRequest.findUnique({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
    });
    if (existing) {
      return res.status(409).json({ error: { message: 'Request already sent', code: 'ALREADY_SENT' } });
    }
    const request = await prisma.matchRequest.create({
      data: {
        fromUserId, toUserId,
        type: type || 'comment',
        message: message || '',
        targetType: targetType || 'profile',
        targetId,
        status: 'pending',
      },
    });
    await prisma.notification.create({
      data: {
        userId: toUserId,
        type: 'like',
        title: 'New thought received',
        body: message || 'Someone sent you a thoughtful comment!',
      },
    });
    res.json({ data: request });
  } catch (e) { next(e); }
});

// ─── POST /discover/pass ────────────────────────────
discoverRouter.post('/pass', async (req: AuthRequest, res: Response) => {
  res.json({ data: { success: true } });
});
