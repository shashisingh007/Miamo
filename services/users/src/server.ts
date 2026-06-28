// ─── Miamo User Service ──────────────────────────────
// Handles: Users, Profiles, Settings, Privacy, Search
import express, { Request, Response, NextFunction } from 'express';
import { scoreSearch } from '../../shared/algorithms';
import { logger } from '../../shared/src/logger';
import { errorHandler } from '../../shared/src/errorHandler';
import { validate } from '../../shared/src/validate';
import {
  updateProfileBodySchema,
  profilePromptsBodySchema,
  profileInterestsBodySchema,
  settingsUpdateBodySchema,
  privacyUpdateBodySchema,
} from '../../shared/src/schemas';
import { sanitize, sanitizeObject } from '../../shared/src/sanitize';
import { auditLog } from '../../shared/src/audit';
import { createPrisma, applyBaseMiddleware, installHealthRoutes, createInternalAuthMiddleware, installSentry } from '../../shared/src/service';
import { computeCompletionScore, recomputeAndPersistCompletion } from '../../shared/src/completion';
import { PrismaSignalReader } from '../../shared/src/algo/signals';
import { rerankSearch } from '../../shared/src/algo/searchAugment';
import { v4RankEnabled } from '../../shared/src/algo/flags';
import { loadPersonalizationCtx, applyPersonalization } from '../../shared/personalize';
import { searchCities, findNearestCity } from '../../shared/src/cities';
import { awardProfileComplete } from '../../shared/src/spotlight-ledger';
import { extractSenderVoice, type OutboundMessageSample } from '../../shared/src/algo/v8/moveV2/senderVoice';
import { hashUid } from '../../shared/src/track/hash';

// v3.6.0 — Voice Fingerprint reveal feature flag (default OFF — endpoint 404s)
function isVoiceFingerprintEnabled(): boolean { return process.env.FEATURE_VOICE_FINGERPRINT_ENABLED === '1'; }

const prisma = createPrisma(10);
export const app = express();

const PORT = parseInt(process.env.PORT || '3202', 10);

applyBaseMiddleware(app, { jsonLimit: '10mb', serviceName: 'users' });
// Sentry request handler — mounts after base middleware so requestId is in
// scope but before any route so every request lifecycle is captured. No-op
// when SENTRY_DSN is unset.
const sentry = installSentry({ serviceName: 'users' });
app.use(sentry.requestHandler);
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

app.put('/api/v1/profiles/me', authMiddleware, validate({ body: updateProfileBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sanitizedBody = sanitizeObject(req.body);
    const { age, gender, city, cityLat, cityLng, profession, bio, datingIntent, seriousMode, avatarGradient,
      height, sexuality, lookingFor, smoking, drinking, exercise, education,
      religion, zodiac, languages, pets, children, politicalViews, diet } = sanitizedBody;
    const data: any = {};
    if (age !== undefined) data.age = age;
    if (gender !== undefined) data.gender = gender;
    if (city !== undefined) data.city = city;
    if (cityLat !== undefined) data.cityLat = typeof cityLat === 'string' ? parseFloat(cityLat) : cityLat;
    if (cityLng !== undefined) data.cityLng = typeof cityLng === 'string' ? parseFloat(cityLng) : cityLng;
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
    // v3.2 — recompute onboarding completion (separate from legacy profileScore)
    await recomputeAndPersistCompletion(prisma, req.userId!).catch(() => {});
    // Spotlight: award one-time +10 minutes on first 100% completion (idempotent).
    if (score >= 100) {
      awardProfileComplete(prisma, req.userId!).catch((e) => logger.warn('awardProfileComplete failed', e));
    }
    auditLog(prisma, req.userId!, 'profile_update', { fields: Object.keys(data) });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

// v3.2 — onboarding completion endpoint used by gateway requireOnboarded
app.get('/api/v1/profiles/me/completion', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await computeCompletionScore(prisma, req.userId!);
    res.json({ data: result });
  } catch (e) { next(e); }
});

app.put('/api/v1/profiles/me/prompts', authMiddleware, validate({ body: profilePromptsBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { prompts } = req.body;
    await prisma.profilePrompt.deleteMany({ where: { userId: req.userId } });
    for (let i = 0; i < prompts.length; i++) {
      await prisma.profilePrompt.create({ data: { userId: req.userId!, question: sanitize(prompts[i].question || ''), answer: sanitize(prompts[i].answer || ''), position: i } });
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.put('/api/v1/profiles/me/interests', authMiddleware, validate({ body: profileInterestsBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

app.put('/api/v1/settings', authMiddleware, validate({ body: settingsUpdateBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
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
    // Only allow valid Settings fields. v3.6.0 consent toggles are appended
    // (additive — when callers omit them the update is byte-identical).
    const validFields = ['theme','accentColor','reduceMotion','highContrast','readReceipts','typingIndicator','onlineStatus','lastActiveVisible','whoCanMessage','whoCanSendMedia','whoCanStartBeat','whoCanBroadcast','whoCanVoiceCall','whoCanVideoCall','storyVisibility','feedVisibility','videoVisibility','creativityVisibility','notificationsEnabled','beatReminders','messageNotifications','storyNotifications','privacyMode','invisibleMode','seriousModeEnabled','aiPersonalization','moodInferenceEnabled','behavioralRankingEnabled','crossUserInferenceEnabled','algorithmicTransparency'];
    const data: any = {};
    for (const key of validFields) { if (body[key] !== undefined) data[key] = body[key]; }
    const settings = await prisma.settings.update({ where: { userId: req.userId }, data });
    auditLog(prisma, req.userId!, 'settings_update', { fields: Object.keys(data) });
    res.json({ data: settings });
  } catch (e) { next(e); }
});

app.put('/api/v1/settings/privacy', authMiddleware, validate({ body: privacyUpdateBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

      // v4 search augment: blend lexical score with forYou (personalisation).
      // Flag-gated; falls back silently to the lexical-only ranking above.
      if (v4RankEnabled('search') && results.length > 0) {
        try {
          const reader = new PrismaSignalReader(prisma);
          const myHash = reader.hashOf(userId);
          const me = await reader.features(myHash);
          const myInterests = await prisma.profileInterest.findMany({ where: { userId } });
          const myInterestNames = myInterests.map((i) => i.name);
          const myProfile = await prisma.profile.findUnique({ where: { userId } });
          const myIntent = (myProfile as { datingIntent?: string } | null)?.datingIntent ?? null;
          const myAge = (myProfile as { age?: number } | null)?.age ?? null;
          const maxLex = Math.max(...results.map((r: any) => r.searchScore), 1);
          const candHashes = results.map((r: any) => reader.hashOf(r.id));
          const pairMap = await reader.pairCompat(myHash, candHashes);
          const priorMap = await reader.priorTargets(myHash, candHashes, 14);
          const augmented: any[] = [];
          for (let i = 0; i < results.length; i++) {
            const r = results[i];
            const candFeat = await reader.features(candHashes[i]);
            const { score } = rerankSearch({
              me, cand: candFeat,
              myIntent, candIntent: (r.profile as { datingIntent?: string } | null)?.datingIntent ?? null,
              myAge, candAge: (r.profile as { age?: number } | null)?.age ?? null, cityKm: null,
              myInterests: myInterestNames, candInterests: (r.interests || []).map((i: { name: string }) => i.name),
              pair: pairMap.get(candHashes[i]),
              priorCount: priorMap.get(candHashes[i]) || 0,
              impressionsLast48h: 0,
              consent: 'full',
              textScore: r.searchScore / maxLex,
              candUpdatedAtMs: new Date(r.profile?.updatedAt ?? r.createdAt ?? Date.now()).getTime(),
            });
            augmented.push({ ...r, searchScore: score, algo: 'v4' });
          }
          augmented.sort((a, b) => b.searchScore - a.searchScore);
          results = augmented;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[search] v4 rerank failed, keeping lexical order:', (e as Error).message);
        }
      }
    }

    await prisma.searchLog.create({ data: { userId, query, type: searchType, results: results.length } });

    // v6.8 universal overlay: apply negative-trait penalty + diversification
    // to ALL search results regardless of v4 flag. Search must respect a
    // user's anti-preferences (people sharing traits with blocked users
    // sink) and shouldn't return three of the same city back-to-back.
    let pMeta: any = null;
    try {
      if (results.length > 1) {
        const ctx = await loadPersonalizationCtx(prisma, userId, { surface: 'search', prevWindowMin: 60 });
        const items = results.map((r: any) => ({
          id: r.id,
          baseScore: (r.searchScore || 1) * 100,
          city: r.profile?.city,
          ageBucket: r.profile?.age ? (r.profile.age < 26 ? '22-25' : r.profile.age < 31 ? '26-30' : '31+') : undefined,
          traits: { city: r.profile?.city, datingIntent: r.profile?.datingIntent, religion: r.profile?.religion, smoking: r.profile?.smoking, drinking: r.profile?.drinking, education: r.profile?.education, verified: r.verified },
          _row: r,
        }));
        const { ranked, diversifier } = applyPersonalization(ctx, items, { topN: items.length });
        const byId = new Map(items.map((it: any) => [it.id, it._row]));
        results = ranked.map((it: any) => byId.get(it.id)).filter(Boolean);
        pMeta = { intent: { stated: ctx.intent.stated, revealed: ctx.intent.revealed }, diversifier: { reasoning: diversifier.reasoning }, negativeSignals: { totalEvents: ctx.negProfile.totalEvents } };
      }
    } catch { /* fallback to lexical/v4 order */ }
    res.json({ data: results, meta: pMeta || undefined });
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

// ─── Cities Autocomplete ─────────────────────────────
// Public endpoint (no auth) so it works during onboarding before
// the user has a session for the city step. Cached at the edge layer
// is fine; the in-memory dataset answers in <2ms.
app.get('/api/v1/cities/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit || '12'), 10) || 12));
    if (q.length < 1) return res.json({ data: [] });
    const results = searchCities(q, limit);
    res.json({ data: results });
  } catch (e) { next(e); }
});

// Reverse-geocode: lat/lng -> nearest known city. Used by the "Detect my
// location" button in onboarding/profile so we can store a clean city name
// alongside the user's coordinates.
app.get('/api/v1/cities/nearest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lat = parseFloat(String(req.query.lat || ''));
    const lng = parseFloat(String(req.query.lng || ''));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: { message: 'lat and lng required' } });
    }
    const city = findNearestCity(lat, lng);
    if (!city) return res.status(404).json({ error: { message: 'no city found' } });
    res.json({ data: city });
  } catch (e) { next(e); }
});

// ─── Profile Verification (Selfie / ID) ──────────────
// User submits a selfie or ID document URL (already uploaded to the
// photo-host endpoint). We store the submission as `pending`. In dev,
// a 3s simulated review marks it approved; in prod, an admin reviews.
app.post('/api/v1/profiles/me/verify/submit', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { kind, photoUrl } = req.body || {};
    if (!kind || !photoUrl) return res.status(400).json({ error: { message: 'kind and photoUrl required' } });
    if (!['selfie', 'id_document', 'video_liveness'].includes(kind)) return res.status(400).json({ error: { message: 'invalid kind' } });
    const sub = await prisma.verificationSubmission.create({
      data: { userId: req.userId!, kind, photoUrl: sanitize(String(photoUrl)), status: 'pending' },
    });
    auditLog(prisma, req.userId!, 'verification_submit', { kind, submissionId: sub.id });

    // Dev auto-review: approve after a short delay so flows can be E2E-tested
    // without a moderator. In prod, only an admin endpoint flips status.
    if (process.env.NODE_ENV !== 'production' && process.env.AUTO_APPROVE_VERIFY !== '0') {
      setTimeout(async () => {
        try {
          await prisma.verificationSubmission.update({
            where: { id: sub.id },
            data: { status: 'approved', reviewedAt: new Date(), reviewerId: 'system:auto' },
          });
          // If both selfie + id approved (or selfie alone for casual users),
          // flip User.verified to true.
          const approved = await prisma.verificationSubmission.findMany({
            where: { userId: req.userId!, status: 'approved' },
            select: { kind: true },
          });
          const kinds = new Set(approved.map((s) => s.kind));
          const fullyVerified = kinds.has('selfie') && (kinds.has('id_document') || kinds.has('video_liveness'));
          if (fullyVerified || kinds.has('selfie')) {
            await prisma.user.update({ where: { id: req.userId! }, data: { verified: fullyVerified } });
          }
        } catch (e) { logger.warn('auto-approve verification failed', e); }
      }, 3000);
    }

    res.status(201).json({ data: { id: sub.id, kind: sub.kind, status: sub.status, submittedAt: sub.submittedAt } });
  } catch (e) { next(e); }
});

app.get('/api/v1/profiles/me/verify/status', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subs = await prisma.verificationSubmission.findMany({
      where: { userId: req.userId },
      orderBy: { submittedAt: 'desc' },
      select: { id: true, kind: true, status: true, reason: true, submittedAt: true, reviewedAt: true },
    });
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { verified: true, emailVerified: true, phoneVerified: true },
    });
    const approvedKinds = new Set(subs.filter((s) => s.status === 'approved').map((s) => s.kind));
    res.json({
      data: {
        user: user || { verified: false, emailVerified: false, phoneVerified: false },
        submissions: subs,
        badges: {
          email: !!user?.emailVerified,
          phone: !!user?.phoneVerified,
          selfie: approvedKinds.has('selfie'),
          id: approvedKinds.has('id_document'),
          fullyVerified: !!user?.verified,
        },
      },
    });
  } catch (e) { next(e); }
});

// Admin approve/reject (internal-only).
app.post('/api/v1/profiles/verify/:id/decide', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.headers['x-internal-key'] !== process.env.INTERNAL_SERVICE_KEY) {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }
    const { status, reason } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: { message: 'status must be approved|rejected' } });
    const sub = await prisma.verificationSubmission.update({
      where: { id: req.params.id },
      data: { status, reason: reason || null, reviewedAt: new Date(), reviewerId: req.userId || 'admin' },
    });
    if (status === 'approved') {
      const approved = await prisma.verificationSubmission.findMany({
        where: { userId: sub.userId, status: 'approved' },
        select: { kind: true },
      });
      const kinds = new Set(approved.map((s) => s.kind));
      const fullyVerified = kinds.has('selfie') && (kinds.has('id_document') || kinds.has('video_liveness'));
      if (fullyVerified) await prisma.user.update({ where: { id: sub.userId }, data: { verified: true } });
    }
    res.json({ data: sub });
  } catch (e) { next(e); }
});

// ═══ v3.6.0 — Voice Fingerprint reveal ═════════════════════════
// Returns the signed-in user's sender voice vector (extracted from their
// last 50 outbound text messages) along with their cluster archetype, if
// known. Gated behind FEATURE_VOICE_FINGERPRINT_ENABLED — default OFF.
app.get('/api/v1/users/me/voice-fingerprint', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!isVoiceFingerprintEnabled()) {
    return res.status(404).json({ error: { message: 'Not found', code: 'NOT_FOUND' } });
  }
  try {
    const userId = req.userId!;
    // Pull the last 50 outbound text messages — caller orders DESC, voice extractor
    // expects most-recent first.
    const recent = await prisma.message.findMany({
      where: { senderId: userId, type: 'text' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { content: true, createdAt: true },
    }).catch(() => [] as Array<{ content: string; createdAt: Date }>);
    // Lifetime sent count is used by the UI to decide whether to show the
    // 50-message gate — cap with the same { senderId, type } predicate as the
    // sample query so the two figures are consistent.
    const sentMessageCount = await prisma.message.count({
      where: { senderId: userId, type: 'text' },
    }).catch(() => 0);
    const samples: OutboundMessageSample[] = recent.map((m) => ({ content: m.content, createdAtMs: m.createdAt.getTime() }));
    const voice = extractSenderVoice(samples);

    // Archetype lookup is best-effort — the v6 KMeans worker may not have run
    // for new accounts. Falls back to null without erroring the response.
    let archetype: string | null = null;
    try {
      const uidHash = hashUid(userId);
      const move = await prisma.userMoveProfile.findUnique({ where: { uidHash }, select: { archetype: true } });
      if (move?.archetype) archetype = move.archetype;
    } catch { /* ignore */ }

    res.json({ data: { voice, archetype, sentMessageCount } });
  } catch (e) { next(e); }
});

// ─── Error Handler ───────────────────────────────────
// Sentry's error handler reports the error before Miamo's handler converts
// it to the v3.0 envelope. No-op when SENTRY_DSN is unset.
app.use(sentry.errorHandler);
app.use(errorHandler);

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
