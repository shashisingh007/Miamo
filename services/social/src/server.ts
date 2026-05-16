// ─── Miamo Social Service ────────────────────────────
// Handles: Discover, Matches, AI-Match, Safety
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
export const app = express();
const PORT = parseInt(process.env.PORT || '3203', 10);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3100', credentials: true }));
app.use(express.json({ limit: '10mb' }));
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
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok', service: 'social', timestamp: new Date().toISOString(), db: 'connected' }); }
  catch { res.status(503).json({ status: 'error', service: 'social', db: 'disconnected' }); }
});
app.get('/ready', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ ready: true, service: 'social' }); }
  catch { res.status(503).json({ ready: false, service: 'social' }); }
});

// ═══ DISCOVER ════════════════════════════════════════
app.get('/api/v1/discover', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { seriousOnly, verifiedOnly, minAge, maxAge, city, cursor,
      gender, sexuality, lookingFor, smoking, drinking, exercise,
      education, religion, zodiac, pets, children,
      minHeight, maxHeight, activeToday, newHere, hasPhotos,
    } = req.query;
    const userId = req.userId!;
    const blocks = await prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
    const blockedIds = blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId);
    blockedIds.push(userId);

    // Also exclude users already liked/unmatched/reported by this user
    const sentLikes = await prisma.like.findMany({ where: { fromUserId: userId }, select: { toUserId: true } });
    sentLikes.forEach(l => { if (!blockedIds.includes(l.toUserId)) blockedIds.push(l.toUserId); });
    try {
      const myFeedback = await (prisma as any).matchFeedback.findMany({ where: { userId }, select: { targetUserId: true } });
      (myFeedback as any[]).forEach((f: any) => { if (!blockedIds.includes(f.targetUserId)) blockedIds.push(f.targetUserId); });
    } catch {}
    // Exclude users who were reported by anyone (multiple reports = likely problematic)
    const reportedUsers = await prisma.report.groupBy({ by: ['reportedId'], _count: true, having: { reportedId: { _count: { gte: 2 } } } });
    reportedUsers.forEach((r: any) => { if (!blockedIds.includes(r.reportedId)) blockedIds.push(r.reportedId); });

    const where: any = { active: true, deactivated: false, id: { notIn: blockedIds }, privacySettings: { profileVisible: true } };
    const profileWhere: any = {};
    if (seriousOnly === 'true') profileWhere.seriousMode = true;
    if (minAge) profileWhere.age = { ...profileWhere.age, gte: parseInt(minAge as string) };
    if (maxAge) profileWhere.age = { ...profileWhere.age, lte: parseInt(maxAge as string) };
    if (city) profileWhere.city = { contains: city as string, mode: 'insensitive' };

    // ── Gender (comma-separated, e.g. "male,female") ──
    if (gender) {
      const genders = (gender as string).split(',').map(g => g.trim()).filter(Boolean);
      if (genders.length === 1) profileWhere.gender = { equals: genders[0], mode: 'insensitive' };
      else if (genders.length > 1) profileWhere.gender = { in: genders, mode: 'insensitive' };
    }
    // ── Sexuality (comma-separated) ──
    if (sexuality) {
      const vals = (sexuality as string).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length === 1) profileWhere.sexuality = { equals: vals[0], mode: 'insensitive' };
      else if (vals.length > 1) profileWhere.sexuality = { in: vals, mode: 'insensitive' };
    }
    // ── Looking For (comma-separated) ──
    if (lookingFor) {
      const vals = (lookingFor as string).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length === 1) profileWhere.lookingFor = { equals: vals[0], mode: 'insensitive' };
      else if (vals.length > 1) profileWhere.lookingFor = { in: vals, mode: 'insensitive' };
    }
    // ── Lifestyle filters: smoking, drinking, exercise ──
    if (smoking) {
      const vals = (smoking as string).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length === 1) profileWhere.smoking = { equals: vals[0], mode: 'insensitive' };
      else if (vals.length > 1) profileWhere.smoking = { in: vals, mode: 'insensitive' };
    }
    if (drinking) {
      const vals = (drinking as string).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length === 1) profileWhere.drinking = { equals: vals[0], mode: 'insensitive' };
      else if (vals.length > 1) profileWhere.drinking = { in: vals, mode: 'insensitive' };
    }
    if (exercise) {
      const vals = (exercise as string).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length === 1) profileWhere.exercise = { equals: vals[0], mode: 'insensitive' };
      else if (vals.length > 1) profileWhere.exercise = { in: vals, mode: 'insensitive' };
    }
    // ── Education, Religion, Zodiac, Pets, Children ──
    if (education) {
      const vals = (education as string).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length === 1) profileWhere.education = { equals: vals[0], mode: 'insensitive' };
      else if (vals.length > 1) profileWhere.education = { in: vals, mode: 'insensitive' };
    }
    if (religion) {
      const vals = (religion as string).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length > 0) profileWhere.religion = { contains: vals[0], mode: 'insensitive' };
    }
    if (zodiac) {
      const vals = (zodiac as string).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length === 1) profileWhere.zodiac = { equals: vals[0], mode: 'insensitive' };
      else if (vals.length > 1) profileWhere.zodiac = { in: vals, mode: 'insensitive' };
    }
    if (pets) {
      const vals = (pets as string).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length === 1) profileWhere.pets = { equals: vals[0], mode: 'insensitive' };
      else if (vals.length > 1) profileWhere.pets = { in: vals, mode: 'insensitive' };
    }
    if (children) {
      const vals = (children as string).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length === 1) profileWhere.children = { equals: vals[0], mode: 'insensitive' };
      else if (vals.length > 1) profileWhere.children = { in: vals, mode: 'insensitive' };
    }
    // ── Height range ──
    if (minHeight) profileWhere.height = { ...profileWhere.height, gte: parseInt(minHeight as string) };
    if (maxHeight) profileWhere.height = { ...profileWhere.height, lte: parseInt(maxHeight as string) };
    // ── Active today (online or active within 24h) ──
    if (activeToday === 'true') {
      profileWhere.OR = [
        { online: true },
        { lastActive: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      ];
    }

    if (Object.keys(profileWhere).length > 0) where.profile = profileWhere;
    if (verifiedOnly === 'true') where.verified = true;
    // ── New Here (joined within 7 days) ──
    if (newHere === 'true') where.createdAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    // ── Has photos ──
    if (hasPhotos === 'true') where.photos = { some: {} };

    const users = await prisma.user.findMany({
      where, include: { profile: true, photos: { orderBy: { position: 'asc' } }, prompts: { orderBy: { position: 'asc' } }, interests: true },
      take: 60, ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });

    const myProfile = await prisma.profile.findUnique({ where: { userId } });
    const myInterests = await prisma.profileInterest.findMany({ where: { userId } });
    const myInterestNames = myInterests.map(i => i.name);

    // Get my active vibe for vibe-compatibility scoring
    let myVibe: any = null;
    try { myVibe = await prisma.vibeCheck.findFirst({ where: { userId, active: true }, orderBy: { createdAt: 'desc' } }); } catch {}

    // Get active vibes from other users (for vibe scoring)
    const activeVibeMap = new Map<string, any>();
    try {
      const activeVibes = await prisma.vibeCheck.findMany({
        where: { active: true, userId: { in: users.map(u => u.id) }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      });
      activeVibes.forEach(v => activeVibeMap.set(v.userId, v));
    } catch {}

    // ── AI Compatibility Scoring ──
    const profiles = users.map(u => {
      const { passwordHash, ...userData } = u;
      const commonInterests = u.interests.filter(i => myInterestNames.includes(i.name)).map(i => i.name);
      let discoverScore = 0;

      if (myProfile && u.profile) {
        const p = u.profile;
        // Interest overlap (0-20)
        discoverScore += Math.min(commonInterests.length * 4, 20);
        // Dating intent alignment (0-15)
        if (myProfile.datingIntent === p.datingIntent) discoverScore += 15;
        else if (myProfile.seriousMode === p.seriousMode) discoverScore += 8;
        // Location match (0-10)
        if (myProfile.city?.toLowerCase() === p.city?.toLowerCase()) discoverScore += 10;
        // Age proximity (0-10)
        const ageDiff = Math.abs(myProfile.age - p.age);
        if (ageDiff <= 3) discoverScore += 10;
        else if (ageDiff <= 5) discoverScore += 7;
        else if (ageDiff <= 8) discoverScore += 3;
        // Profile completeness (0-10)
        if (p.profileScore >= 80) discoverScore += 10;
        else if (p.profileScore >= 60) discoverScore += 6;
        else if (p.profileScore >= 40) discoverScore += 3;
        // Activity recency (0-10)
        if (p.online) discoverScore += 10;
        else if (p.lastActive && (Date.now() - new Date(p.lastActive).getTime()) < 3600000) discoverScore += 8;
        else if (p.lastActive && (Date.now() - new Date(p.lastActive).getTime()) < 86400000) discoverScore += 4;
        // Lifestyle alignment (0-10)
        let lifestyleMatch = 0;
        if ((myProfile as any).smoking === (p as any).smoking) lifestyleMatch++;
        if ((myProfile as any).drinking === (p as any).drinking) lifestyleMatch++;
        if ((myProfile as any).exercise === (p as any).exercise) lifestyleMatch++;
        if ((myProfile as any).children && (p as any).children && (myProfile as any).children === (p as any).children) lifestyleMatch++;
        if ((myProfile as any).religion && (p as any).religion && (myProfile as any).religion === (p as any).religion) lifestyleMatch++;
        discoverScore += Math.min(lifestyleMatch * 2, 10);
        // Verified bonus (0-5)
        if (u.verified) discoverScore += 5;
        // Has photos (0-5)
        if (u.photos.length >= 2) discoverScore += 5;
        else if (u.photos.length === 1) discoverScore += 2;
        // Has prompts filled out (0-5)
        if (u.prompts.length >= 2) discoverScore += 5;
        else if (u.prompts.length === 1) discoverScore += 2;

        // Vibe compatibility bonus (0-10)
        if (myVibe) {
          const theirVibe = activeVibeMap.get(u.id);
          if (theirVibe) {
            const myTopics: string[] = JSON.parse(myVibe.topics || '[]');
            const theirTopics: string[] = JSON.parse(theirVibe.topics || '[]');
            if (theirVibe.mood === myVibe.mood) discoverScore += 4;
            if (theirVibe.intent === myVibe.intent) discoverScore += 3;
            const topicOverlap = myTopics.filter((t: string) => theirTopics.includes(t)).length;
            discoverScore += Math.min(topicOverlap * 1.5, 3);
          }
        }
      }

      // Diversity: small random jitter (0-3) to avoid always showing same order
      discoverScore += Math.random() * 3;

      return { ...userData, commonInterests, discoverScore: Math.round(Math.min(discoverScore, 100)) };
    });

    // Sort by AI score descending
    profiles.sort((a, b) => b.discoverScore - a.discoverScore);

    // Return top 20
    const result = profiles.slice(0, 20);
    res.json({ data: result, cursor: result[result.length - 1]?.id });
  } catch (e) { next(e); }
});

app.post('/api/v1/discover/like', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { toUserId, targetType, targetId } = req.body;
    const fromUserId = req.userId!;
    const tType = targetType || 'profile';
    const tId = targetId || null;
    // Check for existing like first
    const existing = await prisma.like.findFirst({
      where: { fromUserId, toUserId, targetType: tType, targetId: tId },
    });
    const like = existing || await prisma.like.create({
      data: { fromUserId, toUserId, targetType: tType, targetId: tId },
    });

    const mutual = await prisma.like.findFirst({ where: { fromUserId: toUserId, toUserId: fromUserId } });
    let match = null;
    if (mutual) {
      // Only create match if doesn't exist yet
      const existingMatch = await prisma.match.findFirst({ where: { OR: [{ user1Id: fromUserId, user2Id: toUserId }, { user1Id: toUserId, user2Id: fromUserId }] } });
      if (!existingMatch) {
        match = await prisma.match.create({ data: { user1Id: fromUserId, user2Id: toUserId } });
        await prisma.chat.create({ data: { matchId: match.id, user1Id: fromUserId, user2Id: toUserId } });
        await prisma.notification.create({ data: { userId: toUserId, type: 'match', title: 'New Match! 🎉', body: 'You have a new match! Start chatting now.' } });
        await prisma.notification.create({ data: { userId: fromUserId, type: 'match', title: 'New Match! 🎉', body: 'You have a new match! Start chatting now.' } });
      } else { match = existingMatch; }
    }
    res.json({ data: { like, match, isMutual: !!mutual } });
  } catch (e) { next(e); }
});

app.post('/api/v1/discover/comment', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { toUserId, message, type, targetType, targetId } = req.body;
    const fromUserId = req.userId!;
    const existing = await prisma.matchRequest.findUnique({ where: { fromUserId_toUserId: { fromUserId, toUserId } } });
    if (existing) {
      // Update existing request instead of rejecting
      const updated = await prisma.matchRequest.update({
        where: { id: existing.id },
        data: { message: message || existing.message, type: type || existing.type, targetType: targetType || existing.targetType, targetId: targetId || existing.targetId },
      });
      return res.json({ data: updated });
    }

    const request = await prisma.matchRequest.create({
      data: { fromUserId, toUserId, type: type || 'comment', message: message || '', targetType: targetType || 'profile', targetId: targetId || null, status: 'pending' },
    });
    await prisma.notification.create({ data: { userId: toUserId, type: 'like', title: 'New thought received 💭', body: message || 'Someone sent you a thoughtful comment!' } });
    res.json({ data: request });
  } catch (e) { next(e); }
});

app.post('/api/v1/discover/pass', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { userId: passedUserId } = req.body;
    if (passedUserId) {
      // Record feedback so this user doesn't appear again
      try {
        await (prisma as any).matchFeedback.create({ data: { userId, targetUserId: passedUserId, action: 'pass' } });
      } catch {} // Ignore if already exists or table doesn't exist
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// ─── Send Miamo Move (stored in DB for algorithm analysis) ───
app.post('/api/v1/discover/move', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { toUserId, message, targetType, targetId } = req.body;
    const fromUserId = req.userId!;
    if (!toUserId) return res.status(400).json({ error: { message: 'toUserId is required' } });
    const existing = await (prisma as any).miamoMove.findFirst({
      where: { fromUserId, toUserId, targetType: targetType || 'profile', targetId: targetId || null },
    });
    if (existing) return res.status(409).json({ error: { message: 'Move already sent' } });
    const move = await (prisma as any).miamoMove.create({
      data: { fromUserId, toUserId, message: message || '', targetType: targetType || 'profile', targetId: targetId || null, status: 'pending' },
    });
    // Also create a like
    try { await prisma.like.create({ data: { fromUserId, toUserId, targetType: targetType || 'profile', targetId: targetId || null } }); } catch {}
    // Check for mutual like
    const mutual = await prisma.like.findFirst({ where: { fromUserId: toUserId, toUserId: fromUserId } });
    let match = null;
    if (mutual) {
      const existingMatch = await prisma.match.findFirst({ where: { OR: [{ user1Id: fromUserId, user2Id: toUserId }, { user1Id: toUserId, user2Id: fromUserId }] } });
      if (!existingMatch) {
        match = await prisma.match.create({ data: { user1Id: fromUserId, user2Id: toUserId } });
        await prisma.chat.create({ data: { matchId: match.id, user1Id: fromUserId, user2Id: toUserId } });
        await prisma.notification.create({ data: { userId: toUserId, type: 'match', title: 'New Match! 🎉', body: 'You have a new match! Start chatting now.' } });
        await prisma.notification.create({ data: { userId: fromUserId, type: 'match', title: 'New Match! 🎉', body: 'You have a new match! Start chatting now.' } });
      } else { match = existingMatch; }
    } else {
      await prisma.notification.create({ data: { userId: toUserId, type: 'like', title: '💫 New Miamo Move!', body: message ? `Someone sent: "${message.substring(0,50)}"` : 'Someone made a move on your profile!' } });
    }
    res.json({ data: { move, match, isMutual: !!mutual } });
  } catch (e) { next(e); }
});

// ─── Get received moves ───
app.get('/api/v1/discover/moves/received', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const moves = await (prisma as any).miamoMove.findMany({
      where: { toUserId: req.userId!, status: 'pending' },
      include: { fromUser: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: moves });
  } catch (e) { next(e); }
});

// ─── Accept/reject move ───
app.post('/api/v1/discover/moves/:id/accept', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const move = await (prisma as any).miamoMove.update({ where: { id: req.params.id }, data: { status: 'accepted' } });
    res.json({ data: move });
  } catch (e) { next(e); }
});
app.post('/api/v1/discover/moves/:id/reject', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const move = await (prisma as any).miamoMove.update({ where: { id: req.params.id }, data: { status: 'rejected' } });
    res.json({ data: move });
  } catch (e) { next(e); }
});

// ─── Discover filters (persist) ───
app.get('/api/v1/discover/filters', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filter = await (prisma as any).discoverFilter.findUnique({ where: { userId: req.userId! } });
    res.json({ data: filter || {} });
  } catch (e) { next(e); }
});
app.put('/api/v1/discover/filters', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    // Convert any array values to comma-separated strings (schema uses String fields)
    const data: Record<string, any> = {};
    for (const [k, v] of Object.entries(req.body)) {
      data[k] = Array.isArray(v) ? v.join(',') : v;
    }
    const filter = await (prisma as any).discoverFilter.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    res.json({ data: filter });
  } catch (e) { next(e); }
});

// ═══ MATCHES ═════════════════════════════════════════
app.get('/api/v1/matches', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { q, filter } = req.query;
    const matches = await prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }], active: true },
      include: {
        user1: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } }, interests: true } },
        user2: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } }, interests: true } },
        chat: { include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Check which matches are held by the current user
    const otherUserIds = matches.map(m => m.user1Id === userId ? m.user2Id : m.user1Id);
    const heldRequests = await prisma.matchRequest.findMany({
      where: { fromUserId: { in: otherUserIds }, toUserId: userId, status: 'held' },
      select: { fromUserId: true },
    });
    const heldUserIds = new Set(heldRequests.map(r => r.fromUserId));

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
        isFavorite: isUser1 ? (m as any).favorite1 : (m as any).favorite2,
        isPinned: isUser1 ? (m as any).pinned1 : (m as any).pinned2,
        isNew: (Date.now() - new Date(m.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000,
        isHeld: heldUserIds.has(otherUser.id),
      };
    });
    // By default, exclude held matches from the list (they show in On Hold tab)
    const includeHeld = req.query.includeHeld === 'true';
    if (!includeHeld) {
      result = result.filter(m => !m.isHeld);
    }
    // Search by name, username, miamoId
    if (q && typeof q === 'string' && q.trim()) {
      const search = q.toLowerCase().trim();
      result = result.filter(m => {
        const u = m.matchedUser as any;
        return (u.displayName || '').toLowerCase().includes(search) ||
               (u.username || '').toLowerCase().includes(search) ||
               (u.miamoId || '').toLowerCase().includes(search);
      });
    }
    if (filter === 'new') result = result.filter(m => m.isNew);
    else if (filter === 'active') result = result.filter(m => (m.matchedUser as any).profile?.online);
    else if (filter === 'favorites') result = result.filter(m => m.isFavorite);
    else if (filter === 'serious') result = result.filter(m => (m.matchedUser as any).profile?.seriousMode);
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

app.post('/api/v1/matches/:id/favorite', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: { message: 'Match not found' } });
    const isUser1 = match.user1Id === userId;
    const currentFav = isUser1 ? (match as any).favorite1 : (match as any).favorite2;
    await prisma.match.update({
      where: { id: req.params.id },
      data: isUser1 ? { favorite1: !currentFav } : { favorite2: !currentFav } as any,
    });
    res.json({ data: { isFavorite: !currentFav } });
  } catch (e) { next(e); }
});

app.post('/api/v1/matches/:id/pin', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: { message: 'Match not found' } });
    const isUser1 = match.user1Id === userId;
    const currentPin = isUser1 ? (match as any).pinned1 : (match as any).pinned2;
    await prisma.match.update({
      where: { id: req.params.id },
      data: isUser1 ? { pinned1: !currentPin } : { pinned2: !currentPin } as any,
    });
    res.json({ data: { isPinned: !currentPin } });
  } catch (e) { next(e); }
});

app.post('/api/v1/matches/:id/report', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { reason, details } = req.body;
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: { message: 'Match not found' } });
    const targetUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
    try {
      await prisma.$executeRaw`INSERT INTO "MatchFeedback" (id, "matchId", "userId", "targetUserId", type, reason, details, "createdAt") VALUES (gen_random_uuid(), ${match.id}, ${userId}, ${targetUserId}, 'report', ${reason || 'other'}, ${details || ''}, NOW())`;
    } catch {}
    await prisma.report.create({
      data: { reporterId: userId, reportedId: targetUserId, reason: reason || 'other', details: details || '', targetType: 'match', targetId: match.id, status: 'pending' },
    });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.get('/api/v1/matches/requests', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.matchRequest.findMany({
      where: { toUserId: req.userId!, status: 'pending' },
      include: { fromUser: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: requests.map(r => { const { passwordHash, ...user } = r.fromUser; return { ...r, fromUser: user }; }) });
  } catch (e) { next(e); }
});

app.get('/api/v1/matches/requests/sent', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.matchRequest.findMany({
      where: { fromUserId: req.userId! },
      include: { toUser: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: requests.map(r => { const { passwordHash, ...user } = r.toUser; return { ...r, toUser: user }; }) });
  } catch (e) { next(e); }
});

app.post('/api/v1/matches/requests/:id/accept', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const request = await prisma.matchRequest.update({ where: { id: req.params.id }, data: { status: 'accepted' } });
    const match = await prisma.match.create({ data: { user1Id: request.fromUserId, user2Id: request.toUserId } });
    await prisma.chat.create({ data: { matchId: match.id, user1Id: request.fromUserId, user2Id: request.toUserId } });
    await prisma.notification.create({ data: { userId: request.fromUserId, type: 'match', title: 'Match accepted! 🎉', body: 'Your thoughtful comment was accepted! You can now chat.' } });
    res.json({ data: { match, request } });
  } catch (e) { next(e); }
});

app.post('/api/v1/matches/requests/:id/reject', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const request = await prisma.matchRequest.update({ where: { id: req.params.id }, data: { status: 'rejected' } });
    res.json({ data: request });
  } catch (e) { next(e); }
});

app.delete('/api/v1/matches/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { reason, details } = req.body || {};
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: { message: 'Match not found' } });
    const targetUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
    if (reason) {
      try {
        await prisma.$executeRaw`INSERT INTO "MatchFeedback" (id, "matchId", "userId", "targetUserId", type, reason, details, "createdAt") VALUES (gen_random_uuid(), ${match.id}, ${userId}, ${targetUserId}, 'unmatch', ${reason}, ${details || ''}, NOW())`;
      } catch {}
    }
    await prisma.match.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Unmatch by other userId (for messages page)
app.delete('/api/v1/matches/by-user/:userId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const targetUserId = req.params.userId;
    const { reason, details } = req.body || {};
    const match = await prisma.match.findFirst({
      where: { active: true, OR: [{ user1Id: userId, user2Id: targetUserId }, { user1Id: targetUserId, user2Id: userId }] },
    });
    if (!match) return res.status(404).json({ error: { message: 'Match not found' } });
    if (reason) {
      try {
        await prisma.$executeRaw`INSERT INTO "MatchFeedback" (id, "matchId", "userId", "targetUserId", type, reason, details, "createdAt") VALUES (gen_random_uuid(), ${match.id}, ${userId}, ${targetUserId}, 'unmatch', ${reason}, ${details || ''}, NOW())`;
      } catch {}
    }
    await prisma.match.update({ where: { id: match.id }, data: { active: false } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Report by other userId (for messages page)
app.post('/api/v1/matches/by-user/:userId/report', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const targetUserId = req.params.userId;
    const { reason, details } = req.body || {};
    const match = await prisma.match.findFirst({
      where: { OR: [{ user1Id: userId, user2Id: targetUserId }, { user1Id: targetUserId, user2Id: userId }] },
    });
    if (match && reason) {
      try {
        await prisma.$executeRaw`INSERT INTO "MatchFeedback" (id, "matchId", "userId", "targetUserId", type, reason, details, "createdAt") VALUES (gen_random_uuid(), ${match.id}, ${userId}, ${targetUserId}, 'report', ${reason}, ${details || ''}, NOW())`;
      } catch {}
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Block with feedback (for messages/matches pages)
app.post('/api/v1/matches/by-user/:userId/block', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const targetUserId = req.params.userId;
    const { reason, details } = req.body || {};
    // Save feedback
    const match = await prisma.match.findFirst({
      where: { OR: [{ user1Id: userId, user2Id: targetUserId }, { user1Id: targetUserId, user2Id: userId }] },
    });
    if (match && reason) {
      try {
        await prisma.$executeRaw`INSERT INTO "MatchFeedback" (id, "matchId", "userId", "targetUserId", type, reason, details, "createdAt") VALUES (gen_random_uuid(), ${match.id}, ${userId}, ${targetUserId}, 'block', ${reason}, ${details || ''}, NOW())`;
      } catch {}
    }
    // Create block record
    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetUserId } },
      create: { blockerId: userId, blockedId: targetUserId },
      update: {},
    });
    // Deactivate match if exists
    if (match) await prisma.match.update({ where: { id: match.id }, data: { active: false } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// ═══ VIBE CHECK ══════════════════════════════════════
// Save a new vibe check
app.post('/api/v1/vibe-check', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { mood, energy, topics, intent } = req.body;
    if (!mood) return res.status(400).json({ error: { message: 'Mood is required', code: 'VALIDATION_ERROR' } });
    // Deactivate previous active vibes
    await prisma.vibeCheck.updateMany({ where: { userId, active: true }, data: { active: false } });
    // Create new vibe
    const vibe = await prisma.vibeCheck.create({
      data: { userId, mood, energy: energy || 3, topics: JSON.stringify(topics || []), intent: intent || '', active: true },
    });
    res.json({ data: { ...vibe, topics: topics || [] } });
  } catch (e) { next(e); }
});

// Get vibe history
app.get('/api/v1/vibe-check', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const vibes = await prisma.vibeCheck.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
    const parsed = vibes.map(v => ({ ...v, topics: JSON.parse(v.topics || '[]') }));
    res.json({ data: parsed });
  } catch (e) { next(e); }
});

// Get latest active vibe
app.get('/api/v1/vibe-check/latest', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const vibe = await prisma.vibeCheck.findFirst({ where: { userId, active: true }, orderBy: { createdAt: 'desc' } });
    if (vibe) {
      res.json({ data: { ...vibe, topics: JSON.parse(vibe.topics || '[]') } });
    } else {
      res.json({ data: null });
    }
  } catch (e) { next(e); }
});

// Get vibe-compatible users (users with active vibes that match yours)
app.get('/api/v1/vibe-check/matches', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const myVibe = await prisma.vibeCheck.findFirst({ where: { userId, active: true }, orderBy: { createdAt: 'desc' } });
    if (!myVibe) return res.json({ data: [] });
    const myTopics: string[] = JSON.parse(myVibe.topics || '[]');

    // Get all active vibes from other users (set within last 24h)
    const recentVibes = await prisma.vibeCheck.findMany({
      where: { active: true, userId: { not: userId }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      include: { user: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } }, interests: true } } },
    });

    const blocks = await prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
    const blockedIds = new Set(blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId));

    const scored = recentVibes
      .filter(v => !blockedIds.has(v.userId))
      .map(v => {
        let score = 0;
        const theirTopics: string[] = JSON.parse(v.topics || '[]');
        // Mood match
        if (v.mood === myVibe.mood) score += 30;
        // Energy proximity
        const energyDiff = Math.abs(v.energy - myVibe.energy);
        score += Math.max(0, 20 - energyDiff * 5);
        // Topic overlap
        const topicOverlap = myTopics.filter(t => theirTopics.includes(t)).length;
        score += Math.min(topicOverlap * 10, 30);
        // Intent match
        if (v.intent === myVibe.intent) score += 20;

        const { passwordHash, ...userData } = v.user as any;
        return { user: userData, vibeScore: Math.min(score, 100), mood: v.mood, energy: v.energy, topics: theirTopics, intent: v.intent };
      })
      .sort((a, b) => b.vibeScore - a.vibeScore)
      .slice(0, 20);

    res.json({ data: scored });
  } catch (e) { next(e); }
});

// ═══ AI MATCH ════════════════════════════════════════
app.get('/api/v1/ai-match/suggestions', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const myProfile = await prisma.profile.findUnique({ where: { userId } });
    const myInterests = await prisma.profileInterest.findMany({ where: { userId } });
    const myInterestNames = myInterests.map(i => i.name);

    const blocks = await prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
    const blockedIds = blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId);
    blockedIds.push(userId);

    // Also exclude already-liked users
    const sentLikes = await prisma.like.findMany({ where: { fromUserId: userId }, select: { toUserId: true } });
    sentLikes.forEach(l => { if (!blockedIds.includes(l.toUserId)) blockedIds.push(l.toUserId); });

    // Fetch larger candidate pool (100 instead of 30)
    const candidates = await prisma.user.findMany({
      where: { id: { notIn: blockedIds }, active: true, deactivated: false, privacySettings: { profileVisible: true } },
      include: { profile: true, interests: true, photos: { take: 3, orderBy: { position: 'asc' }, select: { url: true } }, prompts: { take: 3, select: { question: true, answer: true } } },
      take: 100,
    });

    // Get my vibe for vibe-matching
    let myVibe: any = null;
    try { myVibe = await prisma.vibeCheck.findFirst({ where: { userId, active: true }, orderBy: { createdAt: 'desc' } }); } catch {}

    // Get active vibes from candidates
    const vibeMap = new Map<string, any>();
    try {
      const vibes = await prisma.vibeCheck.findMany({
        where: { active: true, userId: { in: candidates.map(c => c.id) }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      });
      vibes.forEach(v => vibeMap.set(v.userId, v));
    } catch {}

    // Get feedback history for collaborative filtering
    let feedbackPenalties = new Map<string, number>();
    try {
      const myFeedback = await (prisma as any).matchFeedback.findMany({
        where: { userId }, include: { targetUser: { include: { profile: true } } },
      });
      if (myFeedback.length > 0) {
        const unmatchedProfiles = myFeedback.filter((f: any) => f.type === 'unmatch').map((f: any) => f.targetUser?.profile).filter(Boolean);
        candidates.forEach(c => {
          if (!c.profile) return;
          let penalty = 0;
          unmatchedProfiles.forEach((up: any) => {
            if (up.datingIntent === c.profile!.datingIntent && up.datingIntent !== myProfile?.datingIntent) penalty += 2;
            if (Math.abs(up.age - c.profile!.age) <= 2) penalty += 1;
          });
          if (penalty > 0) feedbackPenalties.set(c.id, Math.min(penalty, 15));
        });
      }
    } catch {}

    const zodiacCompat: Record<string, string[]> = {
      Aries:['Leo','Sagittarius','Gemini','Aquarius'], Taurus:['Virgo','Capricorn','Cancer','Pisces'],
      Gemini:['Libra','Aquarius','Aries','Leo'], Cancer:['Scorpio','Pisces','Taurus','Virgo'],
      Leo:['Aries','Sagittarius','Gemini','Libra'], Virgo:['Taurus','Capricorn','Cancer','Scorpio'],
      Libra:['Gemini','Aquarius','Leo','Sagittarius'], Scorpio:['Cancer','Pisces','Virgo','Capricorn'],
      Sagittarius:['Aries','Leo','Libra','Aquarius'], Capricorn:['Taurus','Virgo','Scorpio','Pisces'],
      Aquarius:['Gemini','Libra','Aries','Sagittarius'], Pisces:['Cancer','Scorpio','Taurus','Capricorn'],
    };

    const scored = candidates.map(c => {
      let score = 0; const reasons: string[] = []; const concerns: string[] = [];
      const cInterests = c.interests.map(i => i.name);
      const common = cInterests.filter(i => myInterestNames.includes(i));

      // ── Interest Overlap (0-20) — weighted by total shared ──
      const interestScore = common.length >= 5 ? 20 : common.length >= 3 ? 15 : common.length >= 1 ? common.length * 4 : 0;
      score += interestScore;
      if (common.length >= 3) reasons.push(`${common.length} shared interests including ${common.slice(0,2).join(' & ')}`);
      else if (common.length > 0) reasons.push(`You both love ${common[0]}`);

      if (myProfile && c.profile) {
        // ── Dating Intent (0-18) ──
        if (myProfile.datingIntent === c.profile.datingIntent) { score += 18; reasons.push('Aligned dating goals'); }
        else if (myProfile.seriousMode === c.profile.seriousMode) { score += 9; reasons.push('Similar relationship mindset'); }
        else { concerns.push('Different relationship goals'); }

        // ── Location (0-10) ──
        if (myProfile.city?.toLowerCase() === c.profile.city?.toLowerCase()) { score += 10; reasons.push(`Both in ${c.profile.city}`); }

        // ── Age Compatibility (0-10) ──
        const ageDiff = Math.abs(myProfile.age - c.profile.age);
        if (ageDiff <= 2) { score += 10; reasons.push('Very similar age'); }
        else if (ageDiff <= 5) { score += 7; }
        else if (ageDiff <= 8) { score += 3; }
        else { concerns.push('Notable age difference'); }

        // ── Lifestyle Alignment (0-12) ──
        let lifestyleScore = 0; const lifestyleDetails: string[] = [];
        if ((myProfile as any).smoking === (c.profile as any).smoking) { lifestyleScore += 3; lifestyleDetails.push('smoking habits'); }
        if ((myProfile as any).drinking === (c.profile as any).drinking) { lifestyleScore += 3; lifestyleDetails.push('drinking'); }
        if ((myProfile as any).exercise === (c.profile as any).exercise) { lifestyleScore += 3; lifestyleDetails.push('fitness'); }
        if ((myProfile as any).children && (c.profile as any).children && (myProfile as any).children === (c.profile as any).children) { lifestyleScore += 3; lifestyleDetails.push('family plans'); }
        score += lifestyleScore;
        if (lifestyleDetails.length >= 2) reasons.push(`Compatible ${lifestyleDetails.slice(0,2).join(' & ')}`);

        // ── Values & Beliefs (0-8) ──
        let valuesScore = 0;
        if ((myProfile as any).religion && (c.profile as any).religion && (myProfile as any).religion === (c.profile as any).religion) { valuesScore += 5; reasons.push('Shared beliefs'); }
        if ((myProfile as any).zodiac && (c.profile as any).zodiac && zodiacCompat[(myProfile as any).zodiac]?.includes((c.profile as any).zodiac)) { valuesScore += 3; }
        score += valuesScore;

        // ── Profile Quality (0-8) ──
        if (c.profile.profileScore >= 80) { score += 8; reasons.push('Detailed, authentic profile'); }
        else if (c.profile.profileScore >= 60) score += 5;
        else if (c.profile.profileScore >= 40) score += 2;

        // ── Activity Recency (0-7) — online users rank higher ──
        if (c.profile.online) { score += 7; reasons.push('Currently online'); }
        else if (c.profile.lastActive && (Date.now() - new Date(c.profile.lastActive).getTime()) < 3600000) score += 5;
        else if (c.profile.lastActive && (Date.now() - new Date(c.profile.lastActive).getTime()) < 86400000) score += 3;
        else score += 0;

        // ── Photo & Prompt Quality (0-5) ──
        if (c.photos.length >= 3) score += 3; else if (c.photos.length >= 1) score += 1;
        if (c.prompts.length >= 2) score += 2; else if (c.prompts.length >= 1) score += 1;

        // ── Vibe Compatibility (0-10) ──
        if (myVibe) {
          const theirVibe = vibeMap.get(c.id);
          if (theirVibe) {
            const myTopics: string[] = JSON.parse(myVibe.topics || '[]');
            const theirTopics: string[] = JSON.parse(theirVibe.topics || '[]');
            let vibeScore = 0;
            if (theirVibe.mood === myVibe.mood) vibeScore += 4;
            if (theirVibe.intent === myVibe.intent) vibeScore += 3;
            const topicOverlap = myTopics.filter((t: string) => theirTopics.includes(t)).length;
            vibeScore += Math.min(topicOverlap * 1.5, 3);
            score += vibeScore;
            if (vibeScore >= 7) reasons.push('Matching vibes right now');
          }
        }

        // ── Serious Mode Bonus (0-5) ──
        if (myProfile.seriousMode && c.profile.seriousMode) { score += 5; reasons.push('Both in Serious Mode'); }
      }
      // ── Verified (0-3) ──
      if (c.verified) { score += 3; reasons.push('Verified'); }

      // ── Feedback-based penalty ──
      const penalty = feedbackPenalties.get(c.id) || 0;
      score = Math.max(0, score - penalty);

      // Cap at 100
      score = Math.min(score, 100);

      // ── Smart Icebreakers ──
      const icebreakers: string[] = [];
      if (common.length > 0) icebreakers.push(`I noticed you love ${common[0]} too! What's your favorite part?`);
      if (c.prompts[0]) icebreakers.push(`Your answer to "${c.prompts[0].question}" really resonated — tell me more!`);
      if (c.profile?.profession) icebreakers.push(`${c.profile.profession} sounds fascinating! What drew you to it?`);
      if (c.profile?.city && myProfile?.city === c.profile.city) icebreakers.push(`Fellow ${c.profile.city} person! What's your favorite hidden gem?`);
      if (icebreakers.length === 0) icebreakers.push('Your profile really caught my eye — what are you passionate about?');

      // ── Date Ideas based on shared interests ──
      const dateIdeas = ['Walk and talk in a beautiful spot'];
      if (common.includes('Coffee') || common.includes('Foodie')) dateIdeas.unshift('Coffee shop exploration date');
      if (common.includes('Hiking') || common.includes('Outdoors')) dateIdeas.unshift('Scenic trail hike together');
      if (common.includes('Cooking')) dateIdeas.unshift('Cooking class for two');
      if (common.includes('Art') || common.includes('Museums')) dateIdeas.unshift('Gallery or museum visit');
      if (common.includes('Music')) dateIdeas.unshift('Live music night');

      const { passwordHash, ...userData } = c;
      return {
        user: userData, aiScore: score,
        reasons: reasons.slice(0, 4), concerns: concerns.slice(0, 2),
        commonInterests: common, suggestedIcebreaker: icebreakers[0],
        suggestedComment: icebreakers[1] || icebreakers[0],
        suggestedDateIdea: dateIdeas[0],
        profileTip: score < 40 ? 'Complete more of your profile to get better matches' : score >= 75 ? 'Excellent compatibility!' : 'Your profile is looking great!',
      };
    });

    // Sort by score with slight diversity: ensure not all results are from same city
    scored.sort((a, b) => b.aiScore - a.aiScore);

    // Apply diversity: interleave top matches with some variety
    const topResults = scored.slice(0, 25);
    const cities = new Set<string>();
    const diversified: typeof topResults = [];
    const remaining: typeof topResults = [];
    for (const item of topResults) {
      const city = item.user?.profile?.city?.toLowerCase() || '';
      if (cities.size < 3 || !cities.has(city) || diversified.length < 5) {
        diversified.push(item);
        cities.add(city);
      } else {
        remaining.push(item);
      }
    }
    const finalResults = [...diversified, ...remaining].slice(0, 20);

    res.json({ data: finalResults });
  } catch (e) { next(e); }
});

app.get('/api/v1/ai-match/score/:targetId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const myInterests = await prisma.profileInterest.findMany({ where: { userId } });
    const myInterestNames = myInterests.map(i => i.name);
    const myProfile = await prisma.profile.findUnique({ where: { userId } });
    const target = await prisma.user.findUnique({
      where: { id: req.params.targetId },
      include: { profile: true, interests: true, photos: { orderBy: { position: 'asc' } }, prompts: { orderBy: { position: 'asc' } } },
    });
    if (!target) return res.status(404).json({ error: { message: 'User not found' } });

    const cProfile = target.profile;
    const cInterests = target.interests.map(i => i.name);
    const common = cInterests.filter(i => myInterestNames.includes(i));

    // ── Compute detailed compatibility ──
    let score = 0;
    const breakdown: Record<string, number> = {};

    const interestScore = Math.min(common.length * 5, 25);
    score += interestScore; breakdown.interests = interestScore;

    if (myProfile && cProfile) {
      if (myProfile.datingIntent === cProfile.datingIntent) { score += 20; breakdown.datingIntent = 20; }
      else if (myProfile.seriousMode === cProfile.seriousMode) { score += 10; breakdown.datingIntent = 10; }
      else { breakdown.datingIntent = 0; }

      if (myProfile.city?.toLowerCase() === cProfile.city?.toLowerCase()) { score += 10; breakdown.location = 10; }
      else { breakdown.location = 0; }

      const ageDiff = Math.abs(myProfile.age - cProfile.age);
      if (ageDiff <= 3) { score += 10; breakdown.age = 10; }
      else if (ageDiff <= 7) { score += 5; breakdown.age = 5; }
      else { breakdown.age = 0; }

      let lifestyleScore = 0;
      if ((myProfile as any).smoking === (cProfile as any).smoking) lifestyleScore += 5;
      if ((myProfile as any).drinking === (cProfile as any).drinking) lifestyleScore += 5;
      if ((myProfile as any).exercise === (cProfile as any).exercise) lifestyleScore += 5;
      score += lifestyleScore; breakdown.lifestyle = lifestyleScore;

      let valuesScore = 0;
      if ((myProfile as any).children && (cProfile as any).children && (myProfile as any).children === (cProfile as any).children) valuesScore += 5;
      if ((myProfile as any).religion && (cProfile as any).religion && (myProfile as any).religion === (cProfile as any).religion) valuesScore += 5;
      score += valuesScore; breakdown.values = valuesScore;

      if (cProfile.profileScore >= 80) { score += 10; breakdown.profileQuality = 10; }
      else if (cProfile.profileScore >= 60) { score += 5; breakdown.profileQuality = 5; }
      else { breakdown.profileQuality = 0; }

      if (target.verified) { score += 5; breakdown.verification = 5; }
      else { breakdown.verification = 0; }

      if (cProfile.online) { score += 10; breakdown.activity = 10; }
      else if (cProfile.lastActive && (Date.now() - new Date(cProfile.lastActive).getTime()) < 86400000) { score += 5; breakdown.activity = 5; }
      else { breakdown.activity = 0; }

      const zodiacCompat: Record<string, string[]> = {
        Aries:['Leo','Sagittarius','Gemini','Aquarius'], Taurus:['Virgo','Capricorn','Cancer','Pisces'],
        Gemini:['Libra','Aquarius','Aries','Leo'], Cancer:['Scorpio','Pisces','Taurus','Virgo'],
        Leo:['Aries','Sagittarius','Gemini','Libra'], Virgo:['Taurus','Capricorn','Cancer','Scorpio'],
        Libra:['Gemini','Aquarius','Leo','Sagittarius'], Scorpio:['Cancer','Pisces','Virgo','Capricorn'],
        Sagittarius:['Aries','Leo','Libra','Aquarius'], Capricorn:['Taurus','Virgo','Scorpio','Pisces'],
        Aquarius:['Gemini','Libra','Aries','Sagittarius'], Pisces:['Cancer','Scorpio','Taurus','Capricorn'],
      };
      if ((myProfile as any).zodiac && (cProfile as any).zodiac && zodiacCompat[(myProfile as any).zodiac]?.includes((cProfile as any).zodiac)) {
        score += 5; breakdown.zodiac = 5;
      } else { breakdown.zodiac = 0; }
    }

    // ── Feedback-based penalty (Meta-style collaborative filtering) ──
    // Check if user previously unmatched/reported people with similar traits
    try {
      const myFeedback = await (prisma as any).matchFeedback.findMany({
        where: { userId },
        include: { targetUser: { include: { profile: true, interests: true } } },
      });
      if (myFeedback.length > 0 && cProfile) {
        let penalty = 0;
        const unmatchReasons: Record<string, number> = {};
        myFeedback.forEach((f: any) => {
          unmatchReasons[f.reason] = (unmatchReasons[f.reason] || 0) + 1;
          const tProfile = f.targetUser?.profile;
          if (!tProfile) return;
          // Penalize if target shares traits with previously-unmatched users
          if (f.type === 'unmatch') {
            if (tProfile.datingIntent === cProfile.datingIntent && tProfile.datingIntent !== myProfile?.datingIntent) penalty += 3;
            if (Math.abs(tProfile.age - cProfile.age) <= 2) penalty += 2;
            if (tProfile.city?.toLowerCase() === cProfile.city?.toLowerCase() && f.reason === 'too-far') penalty += 3;
            if (f.reason === 'different-goals' && tProfile.lookingFor === (cProfile as any).lookingFor) penalty += 4;
            if (f.reason === 'bad-conversation' || f.reason === 'no-response') penalty += 1; // mild — not about the new person
          }
          if (f.type === 'report') {
            // Heavier penalty: avoid recommending similar-profile users to reported ones
            if (tProfile.city?.toLowerCase() === cProfile.city?.toLowerCase()) penalty += 2;
            if (Math.abs(tProfile.age - cProfile.age) <= 3) penalty += 2;
          }
        });
        // Also, if THIS specific target user was reported by ANYONE, lower score
        const targetReports = await prisma.report.count({ where: { reportedId: req.params.targetId, status: { not: 'dismissed' } } });
        if (targetReports > 0) penalty += targetReports * 5;

        // Cap penalty at 30 to avoid zeroing out otherwise good matches
        penalty = Math.min(penalty, 30);
        score = Math.max(0, score - penalty);
        breakdown.feedbackPenalty = -penalty;
      }
    } catch {} // graceful — if MatchFeedback table not ready, skip

    score = Math.min(score, 100);

    // ── Why This Match (3 reasons) ──
    const whyPoints: { text: string; weight: number }[] = [];
    if (common.length >= 3) {
      whyPoints.push({ text: `You both love ${common.slice(0,3).join(', ')} — ${common.length} interests in common`, weight: common.length * 3 });
    } else if (common.length > 0) {
      whyPoints.push({ text: `A shared passion for ${common[0]} could spark something special`, weight: 8 });
    }
    if (myProfile && cProfile) {
      if (myProfile.datingIntent === cProfile.datingIntent) {
        whyPoints.push({ text: `Both looking for ${cProfile.datingIntent?.toLowerCase()} — aligned intentions`, weight: 15 });
      }
      if (myProfile.city?.toLowerCase() === cProfile.city?.toLowerCase()) {
        whyPoints.push({ text: `Both in ${cProfile.city} — easy to meet up`, weight: 10 });
      }
      const ageDiff2 = Math.abs(myProfile.age - cProfile.age);
      if (ageDiff2 <= 3) whyPoints.push({ text: 'Similar life stage and shared perspectives', weight: 8 });
      const lm: string[] = [];
      if ((myProfile as any).smoking === (cProfile as any).smoking) lm.push('smoking habits');
      if ((myProfile as any).drinking === (cProfile as any).drinking) lm.push('drinking preferences');
      if ((myProfile as any).exercise === (cProfile as any).exercise) lm.push('fitness levels');
      if (lm.length >= 2) whyPoints.push({ text: `Compatible lifestyles — matching ${lm.join(' and ')}`, weight: lm.length * 4 });
      if ((myProfile as any).children && (cProfile as any).children && (myProfile as any).children === (cProfile as any).children) {
        whyPoints.push({ text: 'Aligned views on family and children', weight: 10 });
      }
      if (cProfile.profileScore >= 85) whyPoints.push({ text: `Well-crafted profile (${cProfile.profileScore}% complete) shows authenticity`, weight: 6 });
      if (target.prompts?.length >= 2) whyPoints.push({ text: 'Thoughtful prompt answers reveal personality depth', weight: 5 });
    }
    whyPoints.sort((a, b) => b.weight - a.weight);
    const whyThisMatch = whyPoints.slice(0, 3).map(p => p.text);
    while (whyThisMatch.length < 3) {
      const fillers = ['Shared values and depth', 'Compatible communication styles', 'Similar relationship intent'];
      whyThisMatch.push(fillers[whyThisMatch.length] || fillers[0]);
    }

    // ── Move Recommendations (5 suggestions) ──
    const moveRecs: { text: string; type: string; confidence: number }[] = [];
    if (common.length > 0) moveRecs.push({ text: `I noticed you love ${common[0]} too! What got you into it?`, type: 'shared-interest', confidence: 0.92 });
    if (target.prompts?.[0]) moveRecs.push({ text: `Love your answer to "${target.prompts[0].question}" — tell me more!`, type: 'prompt-response', confidence: 0.88 });
    if (cProfile?.profession) moveRecs.push({ text: `${cProfile.profession} sounds fascinating! What's the most unexpected part?`, type: 'profession', confidence: 0.82 });
    if (cProfile?.city && myProfile?.city !== cProfile.city) {
      moveRecs.push({ text: `I've always wanted to visit ${cProfile.city}! What's your favorite hidden spot?`, type: 'location', confidence: 0.78 });
    } else if (cProfile?.city) {
      moveRecs.push({ text: `Fellow ${cProfile.city} person! Got a favorite spot nobody knows about?`, type: 'location', confidence: 0.85 });
    }
    if (cProfile?.bio && cProfile.bio.length > 20) moveRecs.push({ text: `Your bio caught my eye — "${cProfile.bio.substring(0,40)}..." I'd love to hear more`, type: 'bio', confidence: 0.75 });
    if (target.photos?.length > 0) moveRecs.push({ text: `Your photos have such great energy! Really stood out to me`, type: 'photo', confidence: 0.70 });
    if (target.prompts?.[1]) moveRecs.push({ text: `"${target.prompts[1].answer.substring(0,50)}" — I completely relate! Here's my take...`, type: 'prompt-response', confidence: 0.80 });
    moveRecs.sort((a, b) => b.confidence - a.confidence);

    res.json({ data: { score, commonInterests: common, breakdown, whyThisMatch, moveRecommendations: moveRecs.slice(0, 5) } });
  } catch (e) { next(e); }
});

// ═══ SAFETY ══════════════════════════════════════════
app.post('/api/v1/safety/report', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reportedId, reason, details, targetType, targetId } = req.body;
    // If no reportedId provided, use a general/system report
    const actualReportedId = reportedId || req.userId!;
    const report = await prisma.report.create({
      data: { reporterId: req.userId!, reportedId: actualReportedId, reason: reason || 'general', details: details || '', targetType: targetType || 'user', targetId: targetId || null, status: 'pending' },
    });
    res.json({ data: report });
  } catch (e) { next(e); }
});

app.post('/api/v1/safety/block', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { blockedId } = req.body;
    const userId = req.userId!;
    const block = await prisma.block.create({ data: { blockerId: userId, blockedId } });
    await prisma.matchRequest.deleteMany({ where: { OR: [{ fromUserId: userId, toUserId: blockedId }, { fromUserId: blockedId, toUserId: userId }] } });
    await prisma.match.updateMany({ where: { OR: [{ user1Id: userId, user2Id: blockedId }, { user1Id: blockedId, user2Id: userId }] }, data: { active: false } });
    res.json({ data: block });
  } catch (e) { next(e); }
});

app.post('/api/v1/safety/unblock', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.block.deleteMany({ where: { blockerId: req.userId!, blockedId: req.body.blockedId } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.get('/api/v1/safety/reports', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reports = await prisma.report.findMany({ where: { reporterId: req.userId! }, orderBy: { createdAt: 'desc' } });
    res.json({ data: reports });
  } catch (e) { next(e); }
});

app.get('/api/v1/safety/tips', authMiddleware, async (_req: AuthRequest, res: Response) => {
  res.json({
    data: [
      { title: 'Verify your profile', description: 'Add a verified badge to build trust with your matches.' },
      { title: 'Meet in public places', description: 'For first dates, always choose a public location.' },
      { title: 'Tell someone your plans', description: 'Let a friend know where you\'re going and who you\'re meeting.' },
      { title: 'Trust your instincts', description: 'If something feels off, don\'t hesitate to leave or report.' },
      { title: 'Don\'t share personal info early', description: 'Keep your address and financial details private until you build trust.' },
      { title: 'Use Miamo video call first', description: 'Video-chat before meeting in person to verify identity.' },
    ],
  });
});

// ═══ INCOMING LIKES (people who liked you, pending your decision) ═══
app.get('/api/v1/matches/incoming', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    // Get all likes TO this user
    const incomingLikes = await prisma.like.findMany({
      where: { toUserId: userId },
      include: { fromUser: { include: { profile: true, photos: { orderBy: { position: 'asc' } }, interests: true, prompts: { orderBy: { position: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
    });
    // Exclude users where:
    // 1. A match already exists (mutual)
    // 2. User already liked them back
    // 3. User blocked them
    // 4. User has "held" them (stored in MatchRequest with status 'held')
    const existingMatches = await prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    });
    const matchedUserIds = new Set(existingMatches.map(m => m.user1Id === userId ? m.user2Id : m.user1Id));

    const myLikes = await prisma.like.findMany({ where: { fromUserId: userId }, select: { toUserId: true } });
    const likedBackIds = new Set(myLikes.map(l => l.toUserId));

    const blocks = await prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
    const blockedIds = new Set(blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId));

    // Get held users
    const heldRequests = await prisma.matchRequest.findMany({
      where: { toUserId: userId, status: 'held' }, select: { fromUserId: true },
    });
    const heldIds = new Set(heldRequests.map(h => h.fromUserId));

    // Get hidden users
    const hiddenRequests = await prisma.matchRequest.findMany({
      where: { toUserId: userId, status: 'hidden' }, select: { fromUserId: true },
    });
    const hiddenIds = new Set(hiddenRequests.map(h => h.fromUserId));

    const { showHeld, showHidden } = req.query;
    
    let filtered = incomingLikes.filter(like => {
      if (matchedUserIds.has(like.fromUserId)) return false;
      if (likedBackIds.has(like.fromUserId)) return false;
      if (blockedIds.has(like.fromUserId)) return false;
      if (!showHeld && heldIds.has(like.fromUserId)) return false;
      if (!showHidden && hiddenIds.has(like.fromUserId)) return false;
      return true;
    });

    // Deduplicate by fromUserId (keep latest)
    const seen = new Set<string>();
    filtered = filtered.filter(l => { if (seen.has(l.fromUserId)) return false; seen.add(l.fromUserId); return true; });

    // Also get the held and hidden counts
    const heldCount = heldIds.size;
    const hiddenCount = hiddenIds.size;

    // Also include any MatchRequests (comments/moves) that are pending
    const pendingRequests = await prisma.matchRequest.findMany({
      where: { toUserId: userId, status: 'pending' },
      include: { fromUser: { include: { profile: true, photos: { orderBy: { position: 'asc' } }, interests: true, prompts: { orderBy: { position: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
    });

    const data = filtered.map(like => {
      const { passwordHash, ...userData } = like.fromUser;
      const request = pendingRequests.find(r => r.fromUserId === like.fromUserId);
      return {
        id: like.id,
        type: request ? (request.type === 'comment' ? 'move' : request.type) : 'like',
        message: request?.message || null,
        targetType: like.targetType,
        targetId: like.targetId,
        user: userData,
        requestId: request?.id || null,
        createdAt: like.createdAt,
        isHeld: heldIds.has(like.fromUserId),
      };
    });

    // Also add requests that don't have a corresponding like
    pendingRequests.forEach(req => {
      if (!data.find(d => d.user.id === req.fromUserId) && !matchedUserIds.has(req.fromUserId) && !blockedIds.has(req.fromUserId)) {
        const { passwordHash, ...userData } = req.fromUser;
        data.push({
          id: req.id,
          type: req.type === 'comment' ? 'move' : req.type,
          message: req.message || null,
          targetType: req.targetType,
          targetId: req.targetId,
          user: userData,
          requestId: req.id,
          createdAt: req.createdAt,
          isHeld: false,
        });
      }
    });

    // Include held MatchRequests when showHeld=true (they may not have a Like record)
    if (showHeld) {
      const heldRequestsFull = await prisma.matchRequest.findMany({
        where: { toUserId: userId, status: 'held' },
        include: { fromUser: { include: { profile: true, photos: { orderBy: { position: 'asc' } }, interests: true, prompts: { orderBy: { position: 'asc' } } } } },
        orderBy: { createdAt: 'desc' },
      });
      heldRequestsFull.forEach(req => {
        // Only exclude blocked users — held items bypass match/like-back filters
        if (!data.find(d => d.user.id === req.fromUserId) && !blockedIds.has(req.fromUserId)) {
          const { passwordHash, ...userData } = req.fromUser;
          data.push({
            id: req.id,
            type: req.type === 'comment' ? 'move' : req.type,
            message: req.message || null,
            targetType: req.targetType || 'profile',
            targetId: req.targetId || null,
            user: userData,
            requestId: req.id,
            createdAt: req.createdAt,
            isHeld: true,
          });
        }
      });
    }

    res.json({ data, meta: { total: data.length, heldCount, hiddenCount } });
  } catch (e) { next(e); }
});

// ═══ MATCH BACK (accept an incoming like / create mutual match) ═══
app.post('/api/v1/matches/incoming/:userId/match-back', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const myId = req.userId!;
    const targetUserId = req.params.userId;

    // Verify they liked us
    const theirLike = await prisma.like.findFirst({ where: { fromUserId: targetUserId, toUserId: myId } });
    if (!theirLike) return res.status(404).json({ error: { message: 'No incoming like from this user' } });

    // Create our like back (if not exists)
    try {
      await prisma.like.create({ data: { fromUserId: myId, toUserId: targetUserId, targetType: 'profile' } });
    } catch {} // already exists is fine

    // Create match (if not exists)
    let match = await prisma.match.findFirst({ where: { OR: [{ user1Id: myId, user2Id: targetUserId }, { user1Id: targetUserId, user2Id: myId }] } });
    if (!match) {
      match = await prisma.match.create({ data: { user1Id: targetUserId, user2Id: myId } });
      await prisma.chat.create({ data: { matchId: match.id, user1Id: targetUserId, user2Id: myId } });
    }

    // Accept any pending requests from this user
    await prisma.matchRequest.updateMany({
      where: { fromUserId: targetUserId, toUserId: myId, status: { in: ['pending', 'held'] } },
      data: { status: 'accepted' },
    });

    // Notify them
    await prisma.notification.create({
      data: { userId: targetUserId, type: 'match', title: 'It\'s a Match! 🎉', body: 'Someone matched back with you! Start chatting now.' },
    });

    const chat = await prisma.chat.findFirst({ where: { matchId: match.id } });
    res.json({ data: { match, chatId: chat?.id, success: true } });
  } catch (e) { next(e); }
});

// ═══ MATCH BACK with Miamo Move (accept + send a move message) ═══
app.post('/api/v1/matches/incoming/:userId/match-move', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const myId = req.userId!;
    const targetUserId = req.params.userId;
    const { message } = req.body;

    // Match back first
    try { await prisma.like.create({ data: { fromUserId: myId, toUserId: targetUserId, targetType: 'profile' } }); } catch {}
    
    let match = await prisma.match.findFirst({ where: { OR: [{ user1Id: myId, user2Id: targetUserId }, { user1Id: targetUserId, user2Id: myId }] } });
    if (!match) {
      match = await prisma.match.create({ data: { user1Id: targetUserId, user2Id: myId } });
      await prisma.chat.create({ data: { matchId: match.id, user1Id: targetUserId, user2Id: myId } });
    }
    await prisma.matchRequest.updateMany({
      where: { fromUserId: targetUserId, toUserId: myId, status: { in: ['pending', 'held'] } },
      data: { status: 'accepted' },
    });

    // Send the first message in chat if message provided
    const chat = await prisma.chat.findFirst({ where: { matchId: match.id } });
    if (chat && message) {
      await prisma.message.create({ data: { chatId: chat.id, senderId: myId, content: message, type: 'text' } });
    }

    await prisma.notification.create({
      data: { userId: targetUserId, type: 'match', title: 'It\'s a Match! 🎉💫', body: message ? `They matched with a move: "${message.substring(0,50)}"` : 'Someone matched back with style!' },
    });

    res.json({ data: { match, chatId: chat?.id, success: true } });
  } catch (e) { next(e); }
});

// ═══ HOLD FOR NOW (park an incoming like for later) ═══
app.post('/api/v1/matches/incoming/:userId/hold', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const myId = req.userId!;
    const targetUserId = req.params.userId;
    // Upsert a MatchRequest to track the "held" status
    const existing = await prisma.matchRequest.findUnique({ where: { fromUserId_toUserId: { fromUserId: targetUserId, toUserId: myId } } });
    if (existing) {
      await prisma.matchRequest.update({ where: { id: existing.id }, data: { status: 'held' } });
    } else {
      await prisma.matchRequest.create({ data: { fromUserId: targetUserId, toUserId: myId, type: 'like', status: 'held' } });
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// ═══ RESUME (un-hold an incoming like — move back to pending/incoming) ═══
app.post('/api/v1/matches/incoming/:userId/resume', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const myId = req.userId!;
    const targetUserId = req.params.userId;
    const existing = await prisma.matchRequest.findUnique({ where: { fromUserId_toUserId: { fromUserId: targetUserId, toUserId: myId } } });
    if (existing && existing.status === 'held') {
      await prisma.matchRequest.update({ where: { id: existing.id }, data: { status: 'pending' } });
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// ═══ HIDE (dismiss an incoming like) ═══
app.post('/api/v1/matches/incoming/:userId/hide', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const myId = req.userId!;
    const targetUserId = req.params.userId;
    const existing = await prisma.matchRequest.findUnique({ where: { fromUserId_toUserId: { fromUserId: targetUserId, toUserId: myId } } });
    if (existing) {
      await prisma.matchRequest.update({ where: { id: existing.id }, data: { status: 'hidden' } });
    } else {
      await prisma.matchRequest.create({ data: { fromUserId: targetUserId, toUserId: myId, type: 'like', status: 'hidden' } });
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// ═══ Get AI-suggested openers for an incoming match ═══
app.get('/api/v1/matches/incoming/:userId/suggestions', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const myId = req.userId!;
    const targetUserId = req.params.userId;
    const myInterests = await prisma.profileInterest.findMany({ where: { userId: myId } });
    const myInterestNames = myInterests.map(i => i.name);
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true, interests: true, prompts: { take: 3 } },
    });
    if (!target) return res.status(404).json({ error: { message: 'User not found' } });

    const theirInterests = target.interests.map(i => i.name);
    const common = theirInterests.filter(i => myInterestNames.includes(i));

    const suggestions: string[] = [];
    if (common.length > 0) {
      suggestions.push(`I noticed we both love ${common[0]}! What got you into it? 💫`);
      if (common.length > 1) suggestions.push(`${common.length} things in common already — ${common.slice(0,2).join(' and ')}. This could be something special!`);
    }
    if (target.prompts?.[0]) {
      suggestions.push(`Loved your answer to "${target.prompts[0].question}" — tell me more!`);
    }
    if (target.profile?.profession) {
      suggestions.push(`${target.profile.profession} sounds fascinating! I'd love to hear what drew you to it.`);
    }
    if (target.profile?.city) {
      suggestions.push(`Fellow ${target.profile.city} person! Got a hidden gem spot you'd recommend? ✨`);
    }
    suggestions.push("Hey! Your profile really caught my eye. What's something that made you smile today?");
    suggestions.push("I have a feeling we'd get along — let's find out! What are you passionate about right now?");

    res.json({ data: suggestions.slice(0, 5) });
  } catch (e) { next(e); }
});

// Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ error: { message: err.message, code: err.code || 'INTERNAL_ERROR', statusCode } });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => { console.log(`\n⚡ Miamo Social Service on port ${PORT}\n`); });
}
