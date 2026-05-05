// ─── Miamo User Service ──────────────────────────────
// Handles: Users, Profiles, Settings, Privacy, Search
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
export const app = express();

const PORT = parseInt(process.env.PORT || '3202', 10);

// ─── Middleware ───────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3100', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') app.use(morgan('short'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 2000, standardHeaders: true, legacyHeaders: false }));

// ─── Auth ────────────────────────────────────────────
interface AuthRequest extends Request { userId?: string; }

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  if (userId && req.headers['x-internal-key'] === (process.env.INTERNAL_SERVICE_KEY || 'miamo-internal-dev-key')) {
    req.userId = userId; return next();
  }
  return res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
}

// ─── Health ──────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok', service: 'users', timestamp: new Date().toISOString(), db: 'connected' }); }
  catch { res.status(503).json({ status: 'error', service: 'users', db: 'disconnected' }); }
});
app.get('/ready', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ ready: true, service: 'users' }); }
  catch { res.status(503).json({ ready: false, service: 'users' }); }
});

// ─── Users Routes ────────────────────────────────────
app.get('/api/v1/users', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { active: true, deactivated: false },
      include: { profile: true, photos: { orderBy: { position: 'asc' }, take: 1 } },
      take: 50,
    });
    res.json({ data: users.map(u => { const { passwordHash, ...rest } = u; return rest; }) });
  } catch (e) { next(e); }
});

app.get('/api/v1/users/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { profile: true, photos: { orderBy: { position: 'asc' } }, prompts: { orderBy: { position: 'asc' } }, interests: true },
    });
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });
    const { passwordHash, ...rest } = user;
    res.json({ data: rest });
  } catch (e) { next(e); }
});

// ─── Profiles Routes ─────────────────────────────────
app.get('/api/v1/profiles/me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    const photos = await prisma.profilePhoto.findMany({ where: { userId: req.userId }, orderBy: { position: 'asc' } });
    const prompts = await prisma.profilePrompt.findMany({ where: { userId: req.userId }, orderBy: { position: 'asc' } });
    const interests = await prisma.profileInterest.findMany({ where: { userId: req.userId } });
    res.json({ data: { profile, photos, prompts, interests } });
  } catch (e) { next(e); }
});

app.put('/api/v1/profiles/me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { age, gender, city, profession, bio, datingIntent, seriousMode, avatarGradient } = req.body;
    const data: any = {};
    if (age !== undefined) data.age = age;
    if (gender !== undefined) data.gender = gender;
    if (city !== undefined) data.city = city;
    if (profession !== undefined) data.profession = profession;
    if (bio !== undefined) data.bio = bio;
    if (datingIntent !== undefined) data.datingIntent = datingIntent;
    if (seriousMode !== undefined) data.seriousMode = seriousMode;
    if (avatarGradient !== undefined) data.avatarGradient = avatarGradient;

    const profile = await prisma.profile.update({ where: { userId: req.userId }, data });

    // Recalculate profile score
    const photos = await prisma.profilePhoto.count({ where: { userId: req.userId } });
    const prompts = await prisma.profilePrompt.count({ where: { userId: req.userId } });
    const interests = await prisma.profileInterest.count({ where: { userId: req.userId } });
    let score = 20;
    if (profile.bio.length > 10) score += 15;
    score += Math.min(photos * 10, 20);
    score += Math.min(prompts * 10, 15);
    score += Math.min(interests * 3, 15);
    if (profile.profession !== 'Not set') score += 5;
    if (profile.city !== 'Unknown') score += 5;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.verified) score += 5;
    score = Math.min(score, 100);

    const updated = await prisma.profile.update({ where: { userId: req.userId }, data: { profileScore: score } });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

app.put('/api/v1/profiles/me/prompts', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { prompts } = req.body;
    await prisma.profilePrompt.deleteMany({ where: { userId: req.userId } });
    for (let i = 0; i < prompts.length; i++) {
      await prisma.profilePrompt.create({ data: { userId: req.userId!, question: prompts[i].question, answer: prompts[i].answer, position: i } });
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.put('/api/v1/profiles/me/interests', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { interests } = req.body;
    await prisma.profileInterest.deleteMany({ where: { userId: req.userId } });
    for (const name of interests) {
      await prisma.profileInterest.create({ data: { userId: req.userId!, name } });
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// ─── Settings Routes ─────────────────────────────────
app.get('/api/v1/settings', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { userId: req.userId } });
    const privacy = await prisma.privacySettings.findUnique({ where: { userId: req.userId } });
    res.json({ data: { settings, privacy } });
  } catch (e) { next(e); }
});

app.put('/api/v1/settings', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Map nested notifications object to flat fields
    const body = { ...req.body };
    if (body.notifications && typeof body.notifications === 'object') {
      const notifMap: Record<string, string> = { matches: 'notificationsEnabled', messages: 'messageNotifications', beats: 'beatReminders', stories: 'storyNotifications' };
      for (const [key, val] of Object.entries(body.notifications)) {
        if (notifMap[key]) (body as any)[notifMap[key]] = val;
      }
      delete body.notifications;
    }
    // Only allow valid Settings fields
    const validFields = ['theme','accentColor','reduceMotion','highContrast','readReceipts','typingIndicator','onlineStatus','lastActiveVisible','whoCanMessage','whoCanSendMedia','whoCanStartBeat','whoCanBroadcast','whoCanVoiceCall','whoCanVideoCall','storyVisibility','feedVisibility','videoVisibility','creativityVisibility','notificationsEnabled','beatReminders','messageNotifications','storyNotifications','privacyMode','invisibleMode','seriousModeEnabled','aiPersonalization'];
    const data: any = {};
    for (const key of validFields) { if (body[key] !== undefined) data[key] = body[key]; }
    const settings = await prisma.settings.update({ where: { userId: req.userId }, data });
    res.json({ data: settings });
  } catch (e) { next(e); }
});

app.put('/api/v1/settings/privacy', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    // Map frontend keys to correct model fields
    const privacyFieldMap: Record<string, string> = { searchByName: 'nameSearchable', searchByMiamoId: 'miamoIdSearchable', searchByCity: 'citySearchable' };
    const settingsFieldMap: Record<string, string> = { onlineStatus: 'onlineStatus', lastActive: 'lastActiveVisible', readReceipts: 'readReceipts', typingIndicator: 'typingIndicator', seriousMode: 'seriousModeEnabled', aiPersonalization: 'aiPersonalization' };
    const validPrivacyFields = ['profileVisible','searchable','miamoIdSearchable','nameSearchable','citySearchable','hideExactCity','showApproxCity','disableSearch'];

    const privacyData: any = {};
    const settingsData: any = {};
    for (const [key, val] of Object.entries(body)) {
      if (privacyFieldMap[key]) privacyData[privacyFieldMap[key]] = val;
      else if (settingsFieldMap[key]) settingsData[settingsFieldMap[key]] = val;
      else if (validPrivacyFields.includes(key)) privacyData[key] = val;
    }

    let privacy = null;
    if (Object.keys(privacyData).length > 0) {
      privacy = await prisma.privacySettings.update({ where: { userId: req.userId }, data: privacyData });
    }
    if (Object.keys(settingsData).length > 0) {
      await prisma.settings.update({ where: { userId: req.userId }, data: settingsData });
    }
    if (!privacy) privacy = await prisma.privacySettings.findUnique({ where: { userId: req.userId } });
    res.json({ data: privacy });
  } catch (e) { next(e); }
});

app.post('/api/v1/settings/deactivate', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({ where: { id: req.userId }, data: { deactivated: true } });
    await prisma.profile.update({ where: { userId: req.userId }, data: { online: false } });
    res.json({ data: { success: true, message: 'Account deactivated' } });
  } catch (e) { next(e); }
});

app.post('/api/v1/settings/reactivate', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({ where: { id: req.userId }, data: { deactivated: false } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.get('/api/v1/settings/export', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { profile: true, photos: true, prompts: true, interests: true, settings: true, privacySettings: true },
    });
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });
    const { passwordHash, ...data } = user;
    res.json({ data });
  } catch (e) { next(e); }
});

app.get('/api/v1/settings/blocks', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const blocks = await prisma.block.findMany({
      where: { blockerId: req.userId! },
      include: { blocked: { select: { id: true, displayName: true, username: true } } },
    });
    res.json({ data: blocks });
  } catch (e) { next(e); }
});

// ─── Search Routes ───────────────────────────────────
app.get('/api/v1/search', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q, type } = req.query;
    const userId = req.userId!;
    const query = (q as string || '').trim();
    if (!query) return res.json({ data: [] });

    const blocks = await prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
    const blockedIds = blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId);
    blockedIds.push(userId);

    const searchType = type as string || 'all';
    let results: any[] = [];

    if (searchType === 'all' || searchType === 'user') {
      const users = await prisma.user.findMany({
        where: {
          id: { notIn: blockedIds }, active: true,
          privacySettings: { disableSearch: false },
          OR: [
            { displayName: { contains: query, mode: 'insensitive' } },
            { username: { contains: query, mode: 'insensitive' } },
            { miamoId: { contains: query, mode: 'insensitive' } },
            { profile: { city: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } }, interests: true },
        take: 20,
      });
      results = users.map(u => { const { passwordHash, ...rest } = u; return { type: 'user', ...rest }; });
    }

    await prisma.searchLog.create({ data: { userId, query, type: searchType, results: results.length } });
    res.json({ data: results });
  } catch (e) { next(e); }
});

// ─── Error Handler ───────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ error: { message: err.message, code: err.code || 'INTERNAL_ERROR', statusCode } });
});

// ─── Start ───────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => { console.log(`\n⚡ Miamo User Service on port ${PORT}\n`); });
}
