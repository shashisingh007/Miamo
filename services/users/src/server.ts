// ─── Miamo User Service ──────────────────────────────
// Handles: Users, Profiles, Settings, Privacy, Search
import express, { Request, Response, NextFunction } from 'express';
import { scoreSearch } from '../../shared/algorithms';
import { logger } from '../../shared/src/logger';
import { sanitize, sanitizeObject } from '../../shared/src/sanitize';
import { auditLog } from '../../shared/src/audit';
import { createPrisma, applyBaseMiddleware, installHealthRoutes, createInternalAuthMiddleware } from '../../shared/src/service';

const prisma = createPrisma(10);
export const app = express();

const PORT = parseInt(process.env.PORT || '3202', 10);

applyBaseMiddleware(app, { jsonLimit: '10mb' });
interface AuthRequest extends Request { userId?: string }
const authMiddleware = createInternalAuthMiddleware();
installHealthRoutes(app, 'users', prisma);

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
    const sanitizedBody = sanitizeObject(req.body);
    const { age, gender, city, profession, bio, datingIntent, seriousMode, avatarGradient,
      height, sexuality, lookingFor, smoking, drinking, exercise, education,
      religion, zodiac, languages, pets, children, politicalViews, diet } = sanitizedBody;
    const data: any = {};
    if (age !== undefined) data.age = age;
    if (gender !== undefined) data.gender = gender;
    if (city !== undefined) data.city = city;
    if (profession !== undefined) data.profession = profession;
    if (bio !== undefined) data.bio = bio;
    if (datingIntent !== undefined) data.datingIntent = datingIntent;
    if (seriousMode !== undefined) data.seriousMode = seriousMode;
    if (avatarGradient !== undefined) data.avatarGradient = avatarGradient;
    if (height !== undefined) data.height = typeof height === 'string' ? parseInt(height) || null : height;
    if (sexuality !== undefined) data.sexuality = sexuality;
    if (lookingFor !== undefined) data.lookingFor = lookingFor;
    if (smoking !== undefined) data.smoking = smoking;
    if (drinking !== undefined) data.drinking = drinking;
    if (exercise !== undefined) data.exercise = exercise;
    if (education !== undefined) data.education = education;
    if (religion !== undefined) data.religion = religion;
    if (zodiac !== undefined) data.zodiac = zodiac;
    if (languages !== undefined) data.languages = languages;
    if (pets !== undefined) data.pets = pets;
    if (children !== undefined) data.children = children;
    if (politicalViews !== undefined) data.politicalViews = politicalViews;
    if (diet !== undefined) data.diet = diet;

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
    auditLog(prisma, req.userId!, 'profile_update', { fields: Object.keys(data) });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

app.put('/api/v1/profiles/me/prompts', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { prompts } = req.body;
    if (!Array.isArray(prompts)) return res.status(400).json({ error: { message: 'prompts must be an array', code: 'INVALID_BODY' } });
    if (prompts.length > 10) return res.status(400).json({ error: { message: 'Max 10 prompts allowed', code: 'TOO_MANY' } });
    await prisma.profilePrompt.deleteMany({ where: { userId: req.userId } });
    for (let i = 0; i < prompts.length; i++) {
      await prisma.profilePrompt.create({ data: { userId: req.userId!, question: sanitize(prompts[i].question || ''), answer: sanitize(prompts[i].answer || ''), position: i } });
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.put('/api/v1/profiles/me/interests', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { interests } = req.body;
    await prisma.profileInterest.deleteMany({ where: { userId: req.userId } });
    for (const name of interests) {
      await prisma.profileInterest.create({ data: { userId: req.userId!, name: sanitize(name) } });
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// ─── Photo Upload & Delete ───────────────────────────
app.post('/api/v1/profiles/me/photos', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    // Count existing photos
    const existing = await prisma.profilePhoto.count({ where: { userId } });
    if (existing >= 9) return res.status(400).json({ error: { message: 'Maximum 9 photos allowed' } });
    // In production this would save to object storage; here we store a placeholder URL
    const photo = await prisma.profilePhoto.create({
      data: { userId, url: `/uploads/photos/${userId}_${Date.now()}.jpg`, position: existing + 1 },
    });
    res.json({ data: photo });
  } catch (e) { next(e); }
});

app.delete('/api/v1/profiles/me/photos/:photoId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const photo = await prisma.profilePhoto.findFirst({ where: { id: req.params.photoId, userId: req.userId } });
    if (!photo) return res.status(404).json({ error: { message: 'Photo not found' } });
    await prisma.profilePhoto.delete({ where: { id: req.params.photoId } });
    // Reorder remaining photos
    const remaining = await prisma.profilePhoto.findMany({ where: { userId: req.userId }, orderBy: { position: 'asc' } });
    for (let i = 0; i < remaining.length; i++) {
      await prisma.profilePhoto.update({ where: { id: remaining[i].id }, data: { position: i + 1 } });
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
    auditLog(prisma, req.userId!, 'settings_update', { fields: Object.keys(data) });
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
    auditLog(prisma, req.userId!, 'account_deactivate');
    res.json({ data: { success: true, message: 'Account deactivated' } });
  } catch (e) { next(e); }
});

app.post('/api/v1/settings/reactivate', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({ where: { id: req.userId }, data: { deactivated: false } });
    auditLog(prisma, req.userId!, 'account_reactivate');
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

// ─── Account Deletion (GDPR right to erasure) ───────
app.delete('/api/v1/settings/delete', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    auditLog(prisma, userId, 'account_delete');
    // Cascade delete user data
    await prisma.profileInterest.deleteMany({ where: { userId } });
    await prisma.profilePrompt.deleteMany({ where: { userId } });
    await prisma.profilePhoto.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.profile.deleteMany({ where: { userId } });
    await prisma.settings.deleteMany({ where: { userId } });
    await prisma.privacySettings.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    res.json({ data: { success: true, message: 'Account permanently deleted' } });
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

    const searchType = (type as string || 'all');
    let results: any[] = [];

    if (['all', 'user', 'name', 'city', 'id'].includes(searchType)) {
      // Fetch a broader set of candidates for algorithm-based ranking
      const dbWhere: any = {
        id: { notIn: blockedIds }, active: true,
        privacySettings: { disableSearch: false },
      };
      // For city-specific search, narrow DB results
      if (searchType === 'city') {
        dbWhere.profile = { city: { contains: query, mode: 'insensitive' } };
      } else if (searchType === 'id') {
        dbWhere.OR = [
          { miamoId: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } },
        ];
      } else {
        // For 'all' / 'name' / 'user': broad text search
        dbWhere.OR = [
          { displayName: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } },
          { miamoId: { contains: query, mode: 'insensitive' } },
          { profile: { city: { contains: query, mode: 'insensitive' } } },
        ];
      }

      const users = await prisma.user.findMany({
        where: dbWhere,
        include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } }, interests: true },
        take: 50, // Fetch more candidates for algorithm ranking
      });

      // Score each result using the search algorithm engine
      const algoType = (searchType === 'user' ? 'all' : searchType) as 'name' | 'city' | 'id' | 'all';
      const scored = users.map(u => {
        const { passwordHash, ...rest } = u;
        const searchScore = scoreSearch(
          query,
          algoType,
          u.displayName,
          u.username,
          u.miamoId || undefined,
          u.profile?.city || undefined,
        );
        return { type: 'user', ...rest, searchScore };
      });

      // Sort by algorithm score descending, filter out zero-score results
      scored.sort((a, b) => b.searchScore - a.searchScore);
      results = scored.filter(r => r.searchScore > 0).slice(0, 20);
    }

    await prisma.searchLog.create({ data: { userId, query, type: searchType, results: results.length } });
    res.json({ data: results });
  } catch (e) { next(e); }
});

// ─── Bookmarks ───────────────────────────────────────
app.get('/api/v1/bookmarks', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { target: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } } },
    });
    res.json({ data: bookmarks });
  } catch (e) { next(e); }
});

app.post('/api/v1/bookmarks', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { targetId, targetType = 'profile', note: rawNote = '' } = req.body;
    if (!targetId) return res.status(400).json({ error: { message: 'targetId is required' } });
    const note = sanitize(rawNote);

    const bookmark = await prisma.bookmark.upsert({
      where: { userId_targetId_targetType: { userId: req.userId!, targetId, targetType } },
      update: { note },
      create: { userId: req.userId!, targetId, targetType, note },
    });
    auditLog(prisma, req.userId!, 'bookmark_create', { targetId, targetType });
    res.status(201).json({ data: bookmark });
  } catch (e) { next(e); }
});

app.delete('/api/v1/bookmarks/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bookmark = await prisma.bookmark.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!bookmark) return res.status(404).json({ error: { message: 'Bookmark not found' } });
    await prisma.bookmark.delete({ where: { id: req.params.id } });
    auditLog(prisma, req.userId!, 'bookmark_delete', { targetId: bookmark.targetId });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// ─── User Data (Generic Feature Persistence) ─────────
app.get('/api/v1/user-data', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, limit: limitStr } = req.query as { type?: string; limit?: string };
    if (!type) return res.status(400).json({ error: { message: 'type query parameter is required' } });
    const limit = Math.min(parseInt(limitStr || '50', 10) || 50, 200);
    const items = await prisma.userData.findMany({
      where: { userId: req.userId!, type },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json({ data: items });
  } catch (e) { next(e); }
});

app.post('/api/v1/user-data', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, data } = req.body;
    if (!type) return res.status(400).json({ error: { message: 'type is required' } });
    const item = await prisma.userData.create({
      data: { userId: req.userId!, type, data: data || {} },
    });
    res.status(201).json({ data: item });
  } catch (e) { next(e); }
});

app.put('/api/v1/user-data/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.userData.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: { message: 'Not found' } });
    const updated = await prisma.userData.update({
      where: { id: req.params.id },
      data: { data: req.body.data || {} },
    });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

app.delete('/api/v1/user-data/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.userData.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: { message: 'Not found' } });
    await prisma.userData.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Upsert: save or update the latest record of a type (convenience)
app.put('/api/v1/user-data/upsert/:type', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    const { data } = req.body;
    if (!type) return res.status(400).json({ error: { message: 'type is required' } });
    // Find existing
    const existing = await prisma.userData.findFirst({
      where: { userId: req.userId!, type },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      const updated = await prisma.userData.update({ where: { id: existing.id }, data: { data: data || {} } });
      res.json({ data: updated });
    } else {
      const created = await prisma.userData.create({ data: { userId: req.userId!, type, data: data || {} } });
      res.status(201).json({ data: created });
    }
  } catch (e) { next(e); }
});

// ─── Error Handler ───────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const error = err as { statusCode?: number; message?: string; code?: string };
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (error.message || 'Internal server error');
  if (statusCode >= 500) logger.error('Unhandled error:', error.message);
  res.status(statusCode).json({ error: { message, code: error.code || 'INTERNAL_ERROR', statusCode } });
});

// ─── Start ───────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => { logger.info(`Miamo User Service on port ${PORT}`); });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down users service...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Users service stopped cleanly');
      process.exit(0);
    });
    setTimeout(() => { process.exit(1); }, 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
