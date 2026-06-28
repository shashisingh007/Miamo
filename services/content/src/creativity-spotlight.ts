// ─── Creativity Spotlight Module ───────────────────────
// Adds time-based posts, beats-driven trending FIFO queue, and ledger-backed
// minute economy on top of the existing creativity routes. Designed to mount
// after the legacy creativity routes — new endpoints add functionality, while
// hooks (registered against existing routes via direct imports from server.ts)
// inject tracking + ledger side-effects.

import type { Express, Request, Response, NextFunction } from 'express';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../../shared/src/logger';
import {
  appendLedger, getBalance, getHistory, refund, spend,
  awardFirstPostInCategory, awardProfileComplete, awardMatchMilestones,
  awardDailyLogin, awardCommentLeft, awardReactionReceived,
  awardFirstAction, awardCreativityStreak7d, awardWeeklyTopCreator,
  listEarnOpportunities,
  isValidPostMinutes, MIN_MINUTES, MINUTES_STEP, MAX_MINUTES_PER_POST, REFUND_WINDOW_MS,
} from '../../shared/src/spotlight-ledger';
import { recordCreativityAction, propagateCreatorTraits } from '../../shared/src/creativity-track';
import { trackActivity } from '../../shared/src/audit';
import { renderMove, toneFromArchetype, type MoveTone } from '../../shared/src/algo/moveVoice';

interface AuthRequest extends Request { userId?: string }

// Algorithm constants — all magic numbers lifted here for tuning.
export const TREND_BEAT_THRESHOLD = 50;       // beats in 24h window to qualify
export const ALMOST_TRENDING_AT = 40;         // nudge creator at this many beats
export const TREND_DURATION_MS = 10 * 60_000; // 10-minute live slot
export const TREND_COOLDOWN_MS = 7 * 86_400_000; // 7-day re-trend cool-down
export const BEAT_RATE_LIMIT_PER_HOUR = 30;
export const TICK_INTERVAL_MS = 1_000;
export const SYMPATHY_MIN_BEATS = 3;          // expiring with < this earns sympathy minute (1/day)

// ─── Helpers ─────────────────────────────────────────

/** Count distinct beats (CreativityReaction rows) on an item in the last 24h. */
async function getBeats24h(prisma: PrismaClient, itemId: string): Promise<number> {
  const since = new Date(Date.now() - 86_400_000);
  return prisma.creativityReaction.count({
    where: { itemId, createdAt: { gte: since } },
  });
}

/** Read the creator's discoverable traits for trait propagation. */
async function loadCreatorTraitsForItem(
  prisma: PrismaClient,
  itemId: string,
): Promise<{ authorId: string; traits: { city?: string; intent?: string; age?: number; interests?: string[] } } | null> {
  const item = await prisma.creativityItem.findUnique({
    where: { id: itemId },
    select: {
      authorId: true,
      author: {
        select: {
          profile: { select: { city: true, age: true, datingIntent: true } },
          interests: { select: { name: true } },
        },
      },
    },
  });
  if (!item) return null;
  return {
    authorId: item.authorId,
    traits: {
      city: item.author.profile?.city,
      intent: item.author.profile?.datingIntent,
      age: item.author.profile?.age,
      interests: item.author.interests?.map((i: any) => i.name).slice(0, 8),
    },
  };
}

/** Try to enqueue a post for trending. Returns the queue row if newly enqueued. */
export async function tryEnqueueTrending(
  prisma: PrismaClient,
  itemId: string,
): Promise<{ enqueued: boolean; reason?: string }> {
  const item = await prisma.creativityItem.findUnique({
    where: { id: itemId },
    select: {
      id: true, status: true, authorId: true, lastTrendAt: true, expiresAt: true,
      category: { select: { name: true } },
    },
  });
  if (!item) return { enqueued: false, reason: 'not_found' };
  if (item.status !== 'live') return { enqueued: false, reason: `status_${item.status}` };
  if (item.expiresAt && item.expiresAt.getTime() <= Date.now()) {
    return { enqueued: false, reason: 'expired' };
  }
  if (item.lastTrendAt && Date.now() - item.lastTrendAt.getTime() < TREND_COOLDOWN_MS) {
    return { enqueued: false, reason: 'cooldown' };
  }
  const beats = await getBeats24h(prisma, itemId);
  if (beats < TREND_BEAT_THRESHOLD) return { enqueued: false, reason: 'below_threshold' };

  const existing = await prisma.trendQueue.findUnique({ where: { itemId } });
  if (existing && (existing.status === 'queued' || existing.status === 'live')) {
    return { enqueued: false, reason: 'already_queued' };
  }

  // Race-safe enqueue. Two paths:
  //   (1) No row exists → try create. Concurrent callers race: the @unique
  //       constraint on itemId means exactly one wins; the rest P2002 and
  //       fall through to (2) where the row is now 'queued' and they bail.
  //   (2) A previous trend left a 'done' or 'skipped' row → conditional
  //       updateMany flips it back to 'queued' only when status is still
  //       terminal. Concurrent updaters: at most one returns count=1.
  // Either way, only the winning caller proceeds to recordCreativityAction.
  if (!existing) {
    try {
      await prisma.trendQueue.create({
        data: { itemId, category: item.category.name, status: 'queued' },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return { enqueued: false, reason: 'already_queued' };
      }
      throw err;
    }
  } else {
    const flipped = await prisma.trendQueue.updateMany({
      where: { itemId, status: { in: ['done', 'skipped'] } },
      data: {
        status: 'queued',
        enqueuedAt: new Date(),
        startedAt: null,
        endedAt: null,
        category: item.category.name,
      },
    });
    if (flipped.count === 0) {
      return { enqueued: false, reason: 'already_queued' };
    }
  }
  recordCreativityAction(prisma, item.authorId, 'creativity.trend.queued', itemId, {
    category: item.category.name,
    beatCount: beats,
  });
  return { enqueued: true };
}

/** Fire one nudge per hour at the 40-beat threshold. */
async function maybeFireAlmostTrending(prisma: PrismaClient, itemId: string, beats: number) {
  if (beats !== ALMOST_TRENDING_AT) return;
  const item = await prisma.creativityItem.findUnique({
    where: { id: itemId },
    select: { authorId: true, title: true, category: { select: { name: true } } },
  });
  if (!item) return;
  await prisma.notification.create({
    data: {
      userId: item.authorId,
      type: 'creativity',
      title: '✨ Almost trending!',
      body: `Your "${item.title}" is at 40 Beats — 10 more and you'll be Trending.`,
      data: JSON.stringify({ itemId, category: item.category.name, beats }),
    },
  });
  recordCreativityAction(prisma, item.authorId, 'creativity.almost_trending', itemId, {
    category: item.category.name,
    beatCount: beats,
  });
}

// ─── Hooks (called from existing routes in server.ts) ─

/**
 * Hook called from POST /items/:id/react after a reaction is created.
 * - Increments aggregated beatCount
 * - Records creator-trait propagation for learning loop
 * - Fires almost-trending nudge at 40 beats
 * - Tries to enqueue at 50 beats
 */
export async function onBeatCreated(
  prisma: PrismaClient,
  viewerId: string,
  itemId: string,
): Promise<void> {
  // Update aggregate counter (best-effort).
  await prisma.creativityItem.update({
    where: { id: itemId },
    data: { beatCount: { increment: 1 } },
  }).catch(() => {});
  const beats24 = await getBeats24h(prisma, itemId);
  const creator = await loadCreatorTraitsForItem(prisma, itemId);
  if (creator) {
    propagateCreatorTraits(prisma, viewerId, creator.authorId, itemId, 'like', creator.traits);
  }
  await maybeFireAlmostTrending(prisma, itemId, beats24);
  if (beats24 >= TREND_BEAT_THRESHOLD) {
    await tryEnqueueTrending(prisma, itemId);
  }
}

/**
 * Hook called after a Move is created from a creativity post.
 * - Propagates creator traits as a 'super_like' on the author profile (strong signal).
 * - If a Match is now active, runs match-milestone awards for both users.
 */
export async function onMoveSent(
  prisma: PrismaClient,
  viewerId: string,
  itemId: string,
  matchCreated: boolean,
  authorId: string,
): Promise<void> {
  await prisma.creativityItem.update({
    where: { id: itemId },
    data: { moveCount: { increment: 1 } },
  }).catch(() => {});
  const creator = await loadCreatorTraitsForItem(prisma, itemId);
  if (creator) {
    propagateCreatorTraits(prisma, viewerId, creator.authorId, itemId, 'move', creator.traits);
  }
  if (matchCreated) {
    // Recompute lifetime active matches for both sides and grant tier rewards.
    const counts = await Promise.all([
      prisma.match.count({ where: { active: true, OR: [{ user1Id: viewerId }, { user2Id: viewerId }] } }),
      prisma.match.count({ where: { active: true, OR: [{ user1Id: authorId }, { user2Id: authorId }] } }),
    ]);
    await awardMatchMilestones(prisma, viewerId, counts[0]).catch((e) => logger.warn('match-milestone viewer', e));
    await awardMatchMilestones(prisma, authorId, counts[1]).catch((e) => logger.warn('match-milestone author', e));
  }
}

// ─── New routes ──────────────────────────────────────

export function mountCreativitySpotlight(
  app: Express,
  prisma: PrismaClient,
  authMiddleware: any,
) {
  // ─── Spotlight balance & history ───────────────────
  app.get('/api/v1/creativity/spotlight', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const [balance, history] = await Promise.all([
        getBalance(prisma, userId),
        getHistory(prisma, userId, 50),
      ]);
      // Surface next milestone hint for UI.
      const matchCount = await prisma.match.count({
        where: { active: true, OR: [{ user1Id: userId }, { user2Id: userId }] },
      });
      const tiers = [10, 50, 100, 250];
      const nextMilestone = tiers.find((t) => matchCount < t) ?? null;
      res.json({
        data: {
          balance,
          history,
          matchCount,
          nextMilestone,
          rules: { MIN_MINUTES, MINUTES_STEP, MAX_MINUTES_PER_POST, REFUND_WINDOW_MS },
        },
      });
    } catch (e) { next(e); }
  });

  // Premium / sandbox purchase. In dev we just credit immediately; production
  // would gate behind a verified Stripe / IAP receipt.
  app.post('/api/v1/creativity/spotlight/purchase', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const minutes = Number(req.body?.minutes);
      const PURCHASES = new Map<number, number>([[10, 99], [30, 249], [60, 449], [180, 999]]);  // value in cents
      if (!PURCHASES.has(minutes)) return res.status(400).json({ error: { message: 'Invalid bundle' } });
      const cents = PURCHASES.get(minutes)!;
      const r = await appendLedger(prisma, req.userId!, minutes, `purchase_${minutes}min`, null, { cents });
      recordCreativityAction(prisma, req.userId!, 'spotlight.purchased', null, { delta: minutes, cents });
      res.json({ data: { balanceAfter: r.balanceAfter, granted: minutes } });
    } catch (e) { next(e); }
  });

  // ─── Vault: my expired/deleted posts (private) ─────
  app.get('/api/v1/creativity/vault', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const rows = await prisma.creativityItem.findMany({
        where: { authorId: userId, status: { in: ['expired', 'deleted'] } },
        include: { category: true, _count: { select: { reactions: true, comments: true, viewRecords: true, saves: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });
      res.json({
        data: rows.map((r: any) => ({
          ...r,
          beatCount: r._count.reactions,
          commentCount: r._count.comments,
          viewCount: r._count.viewRecords,
          saveCount: r._count.saves,
        })),
      });
    } catch (e) { next(e); }
  });

  // ─── Live trending state ───────────────────────────
  app.get('/api/v1/creativity/trending/live', authMiddleware, async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const liveRows = await prisma.trendQueue.findMany({
        where: { status: 'live' },
        orderBy: { startedAt: 'asc' },
      });
      const queuedRows = await prisma.trendQueue.findMany({
        where: { status: 'queued' },
        orderBy: { enqueuedAt: 'asc' },
        take: 30,
      });
      const allIds = [...liveRows, ...queuedRows].map((r: any) => r.itemId);
      const items = allIds.length > 0 ? await prisma.creativityItem.findMany({
        where: { id: { in: allIds } },
        include: {
          category: true,
          author: { select: { id: true, displayName: true, username: true, verified: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        },
      }) : [];
      const byId = new Map(items.map((i: any) => [i.id, i]));
      const live = liveRows.map((r: any) => ({
        ...byId.get(r.itemId),
        category: r.category,
        startedAt: r.startedAt,
        endsAt: r.startedAt ? new Date(r.startedAt.getTime() + TREND_DURATION_MS) : null,
      }));
      const queued = queuedRows.map((r: any, idx: number) => ({
        ...byId.get(r.itemId),
        category: r.category,
        position: idx + 1,
        enqueuedAt: r.enqueuedAt,
      }));
      res.json({ data: { live, queued } });
    } catch (e) { next(e); }
  });

  // ─── Save / unsave ────────────────────────────────
  app.post('/api/v1/creativity/items/:id/save', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const itemId = req.params.id;
      const userId = req.userId!;
      const item = await prisma.creativityItem.findUnique({
        where: { id: itemId },
        select: { authorId: true, category: { select: { name: true } } },
      });
      if (!item) return res.status(404).json({ error: { message: 'Item not found' } });

      const existing = await prisma.creativitySave.findUnique({
        where: { itemId_userId: { itemId, userId } },
      });
      if (existing) {
        await prisma.creativitySave.delete({ where: { id: existing.id } });
        await prisma.creativityItem.update({
          where: { id: itemId },
          data: { saveCount: { decrement: 1 } },
        }).catch(() => {});
        recordCreativityAction(prisma, userId, 'unsave', itemId, { category: item.category.name, authorId: item.authorId });
        return res.json({ data: { saved: false } });
      }
      await prisma.creativitySave.create({ data: { itemId, userId } });
      await prisma.creativityItem.update({
        where: { id: itemId },
        data: { saveCount: { increment: 1 } },
      }).catch(() => {});
      recordCreativityAction(prisma, userId, 'save', itemId, { category: item.category.name, authorId: item.authorId });
      const creator = await loadCreatorTraitsForItem(prisma, itemId);
      if (creator) propagateCreatorTraits(prisma, userId, creator.authorId, itemId, 'save', creator.traits);
      res.json({ data: { saved: true } });
    } catch (e) { next(e); }
  });

  // ─── Delete a post (oops-refund inside 90s, otherwise forfeit) ─
  app.delete('/api/v1/creativity/items/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const itemId = req.params.id;
      const userId = req.userId!;
      const item = await prisma.creativityItem.findUnique({
        where: { id: itemId },
        select: { id: true, authorId: true, createdAt: true, status: true, minutesPaid: true, category: { select: { name: true } } },
      });
      if (!item) return res.status(404).json({ error: { message: 'Item not found' } });
      if (item.authorId !== userId) return res.status(403).json({ error: { message: 'Not your post' } });
      if (item.status === 'deleted') return res.status(400).json({ error: { message: 'Already deleted' } });

      const ageMs = Date.now() - new Date(item.createdAt).getTime();
      const refundEligible = ageMs <= REFUND_WINDOW_MS && item.minutesPaid > 0;

      await prisma.$transaction(async (tx) => {
        await tx.creativityItem.update({
          where: { id: itemId },
          data: { status: 'deleted', deletedAt: new Date() },
        });
        // Withdraw from trend queue if still pending.
        await tx.trendQueue.updateMany({
          where: { itemId, status: { in: ['queued', 'live'] } },
          data: { status: 'skipped', endedAt: new Date() },
        });
      });

      if (refundEligible) {
        await refund(prisma, userId, item.minutesPaid, 'refund_oops', itemId, { ageMs, ofMinutes: item.minutesPaid });
        recordCreativityAction(prisma, userId, 'spotlight.refunded', itemId, { delta: item.minutesPaid, reason: 'oops' });
      }
      recordCreativityAction(prisma, userId, 'creativity.delete', itemId, {
        category: item.category.name,
        ageMs,
        refunded: refundEligible,
        forfeitedMinutes: refundEligible ? 0 : item.minutesPaid,
      });
      res.json({ data: { deleted: true, refunded: refundEligible, refundedMinutes: refundEligible ? item.minutesPaid : 0 } });
    } catch (e) { next(e); }
  });

  // ═══ v3.5 — REELS + NEGATIVE-FEEDBACK + EARN PATHS ═════════════════════
  //
  // Goal: drive engagement via a one-card-at-a-time reels surface, capture
  // explicit negative feedback (dislike / not-interested / report / hide-author)
  // and feed it through the ranker, and expand the Spotlight earn economy so
  // active users compound minutes through daily activity, not just purchases.

  // ─── Reels feed: one card at a time, category-filtered ───
  app.get('/api/v1/creativity/reels', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
      const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit ?? '5'), 10) || 5));

      // First-of-day daily-login award (fire-and-forget; never blocks feed).
      awardDailyLogin(prisma, userId).catch((e) => logger.warn('awardDailyLogin failed', e));

      // Suppression sets: authors + categories the user told us to hide.
      const [suppressedAuthorRows, suppressedCategoryRows, dislikedItemRows] = await Promise.all([
        prisma.userActivity.findMany({
          where: { userId, action: { in: ['creativity.hide_author', 'creativity.report'] } },
          select: { metadata: true, targetId: true },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
        prisma.userActivity.findMany({
          where: { userId, action: 'creativity.not_interested' },
          select: { metadata: true },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
        prisma.userActivity.findMany({
          where: { userId, action: { in: ['creativity.dislike', 'creativity.pass', 'creativity.not_interested'] } },
          select: { targetId: true },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      ]);
      const parseMeta = (s: string | null): any => { if (!s) return null; try { return JSON.parse(s); } catch { return null; } };
      const suppressedAuthorIds = new Set<string>();
      for (const r of suppressedAuthorRows) {
        const m = parseMeta(r.metadata);
        if (m?.authorId) suppressedAuthorIds.add(m.authorId);
      }
      const suppressedCategories = new Set<string>();
      for (const r of suppressedCategoryRows) {
        const m = parseMeta(r.metadata);
        if (m?.category) suppressedCategories.add(String(m.category).toLowerCase());
      }
      const dislikedItemIds = new Set<string>(dislikedItemRows.map((r) => r.targetId).filter((x): x is string => !!x));

      const where: any = { visibility: 'everyone', status: { in: ['live', 'trending'] }, authorId: { not: userId } };
      if (category && category !== 'all' && category !== 'general' && !suppressedCategories.has(category.toLowerCase())) {
        const cat = await prisma.creativityCategory.findUnique({ where: { name: category } });
        if (cat) where.categoryId = cat.id;
      }
      if (suppressedAuthorIds.size > 0) where.authorId = { not: userId, notIn: Array.from(suppressedAuthorIds) };
      if (dislikedItemIds.size > 0) where.id = { notIn: Array.from(dislikedItemIds) };

      // Rank by trend score then recency; pull 3x the limit to allow suppression filtering.
      const pool = await prisma.creativityItem.findMany({
        where,
        include: {
          author: { include: { profile: true, photos: { take: 3, orderBy: { position: 'asc' } } } },
          category: true,
          _count: { select: { reactions: true, comments: true, viewRecords: true, saves: true } },
        },
        orderBy: [{ trendScore: 'desc' }, { createdAt: 'desc' }],
        take: limit * 3,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      // Skip categories suppressed even when no category filter is set.
      const filtered = pool.filter((it: any) => !suppressedCategories.has(String(it.category?.name ?? '').toLowerCase())).slice(0, limit);

      // Viewer's existing reactions / saves on this slice.
      const ids = filtered.map((i: any) => i.id);
      const [myReacts, mySaves, myMoves] = ids.length > 0 ? await Promise.all([
        prisma.creativityReaction.findMany({ where: { userId, itemId: { in: ids } }, select: { itemId: true } }),
        prisma.creativitySave.findMany({ where: { userId, itemId: { in: ids } }, select: { itemId: true } }),
        prisma.matchRequest.findMany({ where: { fromUserId: userId, targetType: 'creativity', targetId: { in: ids } }, select: { targetId: true } }),
      ]) : [[], [], []];
      const likedSet = new Set((myReacts as any[]).map((r) => r.itemId));
      const savedSet = new Set((mySaves as any[]).map((r) => r.itemId));
      const movedSet = new Set((myMoves as any[]).map((r) => r.targetId));

      const items = filtered.map((it: any) => {
        const { passwordHash, ...author } = it.author;
        return {
          id: it.id,
          title: it.title,
          content: it.content,
          mediaType: it.mediaType ?? it.type,
          mediaUrl: it.mediaUrl,
          thumbnailUrl: it.thumbnailUrl,
          durationSec: it.durationSec,
          minutesPaid: it.minutesPaid,
          expiresAt: it.expiresAt,
          status: it.status,
          createdAt: it.createdAt,
          trendScore: it.trendScore,
          category: it.category?.name ?? null,
          author,
          counts: {
            beats: it._count.reactions,
            comments: it._count.comments,
            views: it._count.viewRecords,
            saves: it._count.saves,
          },
          viewer: {
            liked: likedSet.has(it.id),
            saved: savedSet.has(it.id),
            moved: movedSet.has(it.id),
          },
        };
      });

      res.json({
        data: items,
        cursor: filtered[filtered.length - 1]?.id ?? null,
        meta: {
          suppressedAuthors: suppressedAuthorIds.size,
          suppressedCategories: Array.from(suppressedCategories),
        },
      });
    } catch (e) { next(e); }
  });

  // ─── Explicit dislike (thumbs-down) ─────────────────
  app.post('/api/v1/creativity/items/:id/dislike', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const itemId = req.params.id;
      const userId = req.userId!;
      const item = await prisma.creativityItem.findUnique({
        where: { id: itemId },
        select: { authorId: true, category: { select: { name: true } } },
      });
      if (!item) return res.status(404).json({ error: { message: 'Item not found' } });
      // Treat as a strong-negative engagement: passes through creativity-track,
      // which the analyzer reads as a category/author penalty. Reason captured
      // for downstream negative-signal-engine consumption.
      recordCreativityAction(prisma, userId, 'creativity.pass' as any, itemId, {
        category: item.category?.name,
        authorId: item.authorId,
        reason: 'dislike',
      });
      // Also write a discoverable 'creativity.dislike' row so the reels-suppress
      // query can find it (filter is action-name based).
      trackActivity(prisma, userId, 'creativity.dislike', 'creativity', itemId, {
        category: item.category?.name,
        authorId: item.authorId,
      });
      res.json({ data: { disliked: true } });
    } catch (e) { next(e); }
  });

  // ─── "Don't see like this" (heavier suppression on author + category) ──
  app.post('/api/v1/creativity/items/:id/not-interested', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const itemId = req.params.id;
      const userId = req.userId!;
      const reason = typeof req.body?.reason === 'string' ? String(req.body.reason).slice(0, 120) : null;
      const item = await prisma.creativityItem.findUnique({
        where: { id: itemId },
        select: { authorId: true, category: { select: { name: true } } },
      });
      if (!item) return res.status(404).json({ error: { message: 'Item not found' } });
      trackActivity(prisma, userId, 'creativity.not_interested', 'creativity', itemId, {
        category: item.category?.name,
        authorId: item.authorId,
        reason,
      });
      // Also surface as a pass-feedback row for the discover negative-signal-engine.
      trackActivity(prisma, userId, 'pass_feedback', 'profile', item.authorId, {
        via: 'creativity',
        reason: reason ?? 'not_interested',
        sourceItemId: itemId,
        category: item.category?.name,
      });
      res.json({ data: { suppressed: true, scope: 'author+category' } });
    } catch (e) { next(e); }
  });

  // ─── Report (content/abuse) ────────────────────────
  app.post('/api/v1/creativity/items/:id/report', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const itemId = req.params.id;
      const userId = req.userId!;
      const reason = typeof req.body?.reason === 'string' ? String(req.body.reason).slice(0, 200) : 'unspecified';
      const item = await prisma.creativityItem.findUnique({
        where: { id: itemId },
        select: { authorId: true, category: { select: { name: true } } },
      });
      if (!item) return res.status(404).json({ error: { message: 'Item not found' } });
      trackActivity(prisma, userId, 'creativity.report', 'creativity', itemId, {
        category: item.category?.name,
        authorId: item.authorId,
        reason,
      });
      // Auto-flag at 3+ reports in last 24h.
      const since = new Date(Date.now() - 86_400_000);
      const recentReports = await prisma.userActivity.count({
        where: { action: 'creativity.report', targetType: 'creativity', targetId: itemId, createdAt: { gte: since } },
      });
      if (recentReports >= 3) {
        await prisma.creativityItem.update({ where: { id: itemId }, data: { featured: false } }).catch(() => {});
      }
      res.json({ data: { reported: true, recentReports } });
    } catch (e) { next(e); }
  });

  // ─── Hide-this-author (suppress all of this author's reels for me) ──
  app.post('/api/v1/creativity/items/:id/hide-author', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const itemId = req.params.id;
      const userId = req.userId!;
      const item = await prisma.creativityItem.findUnique({
        where: { id: itemId },
        select: { authorId: true, category: { select: { name: true } } },
      });
      if (!item) return res.status(404).json({ error: { message: 'Item not found' } });
      trackActivity(prisma, userId, 'creativity.hide_author', 'creativity', itemId, {
        category: item.category?.name,
        authorId: item.authorId,
      });
      res.json({ data: { hidden: true, authorId: item.authorId } });
    } catch (e) { next(e); }
  });

  // ─── AI Move suggestions (Miamo M button on creativity card) ─
  app.get('/api/v1/creativity/items/:id/move-suggestions', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const itemId = req.params.id;
      const userId = req.userId!;
      const n = Math.min(5, Math.max(1, parseInt(String(req.query.n ?? '3'), 10) || 3));
      const item = await prisma.creativityItem.findUnique({
        where: { id: itemId },
        include: {
          author: { select: { id: true, displayName: true, profile: { select: { city: true, age: true } }, interests: { select: { name: true }, take: 8 } } },
          category: true,
        },
      });
      if (!item) return res.status(404).json({ error: { message: 'Item not found' } });
      if (item.authorId === userId) {
        return res.json({ data: { suggestions: [], reason: 'self' } });
      }
      const tones: MoveTone[] = ['reflective', 'casual', 'tactile', 'quick'];
      const seedBase = (userId + ':' + itemId).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
      const interestHooks = item.author.interests?.map((i: any) => i.name).filter(Boolean) ?? [];
      const hookPool: string[] = [
        ...(item.title ? [item.title.toLowerCase().slice(0, 30)] : []),
        ...(item.category?.name ? [item.category.name.toLowerCase()] : []),
        ...interestHooks.slice(0, 4),
      ].filter((h) => h && h.length >= 2);
      const suggestions: Array<{ tone: MoveTone; line: string }> = [];
      const seen = new Set<string>();
      for (let i = 0; i < n * 2 && suggestions.length < n; i++) {
        const tone = tones[(seedBase + i) % tones.length];
        const hook = hookPool[(seedBase + i) % Math.max(1, hookPool.length)] || (item.category?.name?.toLowerCase() ?? 'this');
        const hook2 = hookPool[(seedBase + i + 1) % Math.max(1, hookPool.length)] || hook;
        const r = renderMove({ tone, ctx: { name: item.author.displayName, hook, hook2 }, seed: seedBase + i * 17 });
        if (r.ok && !seen.has(r.line)) {
          seen.add(r.line);
          suggestions.push({ tone, line: r.line });
        }
      }
      res.json({ data: { suggestions, postTitle: item.title, authorName: item.author.displayName } });
    } catch (e) { next(e); }
  });

  // ─── Earn-opportunities catalog (for the Earn drawer in the UI) ──
  app.get('/api/v1/creativity/spotlight/earn-opportunities', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const opportunities = await listEarnOpportunities(prisma, userId);
      res.json({ data: { opportunities } });
    } catch (e) { next(e); }
  });

  // ─── Claim 7-day creativity streak (one-shot detector) ──
  app.post('/api/v1/creativity/spotlight/claim-streak', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const r = await awardCreativityStreak7d(prisma, userId);
      res.json({ data: r });
    } catch (e) { next(e); }
  });
}

// ─── In-process trending worker ──────────────────────
// Runs every TICK_INTERVAL_MS in the same process as the content service.
// Two responsibilities:
//   1. Promote queued posts → live slot when a category's slot is free.
//   2. Expire posts whose expiresAt has passed (auto-burn) and award sympathy.
// Both are idempotent and safe to run on multiple replicas because the
// state machine transitions are guarded by status filters at update time.

let workerHandle: NodeJS.Timeout | null = null;

export function startTrendingWorker(prisma: PrismaClient): void {
  if (workerHandle) return;
  workerHandle = setInterval(() => { tickWorker(prisma).catch((e) => logger.warn('trending tick error', e)); }, TICK_INTERVAL_MS);
  if (typeof workerHandle.unref === 'function') workerHandle.unref();
  logger.info(`creativity: trending worker started (tick=${TICK_INTERVAL_MS}ms)`);
}

async function tickWorker(prisma: PrismaClient): Promise<void> {
  const now = new Date();

  // 1. End live slots that are over duration.
  const liveExpired = await prisma.trendQueue.findMany({
    where: { status: 'live', startedAt: { lt: new Date(now.getTime() - TREND_DURATION_MS) } },
    select: { id: true, itemId: true, category: true },
  });
  for (const slot of liveExpired) {
    // Two updates done back-to-back (not atomic — but each one is small and
    // failure of the second still leaves the queue in a recoverable shape).
    await prisma.trendQueue.update({ where: { id: slot.id }, data: { status: 'done', endedAt: now } });
    await prisma.creativityItem.update({
      where: { id: slot.itemId },
      data: { status: 'live', trendEndedAt: now, lastTrendAt: now },
    }).catch(async () => {
      // Fall back: the item may already be expired/deleted; still record trend end markers.
      await prisma.creativityItem.update({
        where: { id: slot.itemId },
        data: { trendEndedAt: now, lastTrendAt: now },
      }).catch(() => {});
    });
    const item = await prisma.creativityItem.findUnique({
      where: { id: slot.itemId },
      select: { authorId: true, category: { select: { name: true } } },
    });
    if (item) {
      recordCreativityAction(prisma, item.authorId, 'creativity.trend.end', slot.itemId, { category: item.category.name });
    }
  }

  // 2. Promote next queued per category whose live slot is empty.
  const queuedByCategory = await prisma.trendQueue.findMany({
    where: { status: 'queued' },
    orderBy: { enqueuedAt: 'asc' },
  });
  const liveCategories = new Set(
    (await prisma.trendQueue.findMany({ where: { status: 'live' }, select: { category: true } }))
      .map((r: any) => r.category),
  );
  const seen = new Set<string>();
  for (const q of queuedByCategory) {
    if (liveCategories.has(q.category)) continue;
    if (seen.has(q.category)) continue;
    seen.add(q.category);

    const promoted = await prisma.trendQueue.update({
      where: { id: q.id },
      data: { status: 'live', startedAt: now },
    }).catch(() => null);
    if (!promoted) continue;
    await prisma.creativityItem.update({
      where: { id: q.itemId },
      data: { status: 'trending', trendStartedAt: now },
    }).catch(() => {});
    const item = await prisma.creativityItem.findUnique({
      where: { id: q.itemId },
      select: { authorId: true, title: true, category: { select: { name: true } } },
    });
    if (item) {
      recordCreativityAction(prisma, item.authorId, 'creativity.trend.start', q.itemId, { category: item.category.name });
      await prisma.notification.create({
        data: {
          userId: item.authorId,
          type: 'creativity',
          title: '🔥 You\'re Trending!',
          body: `"${item.title}" is live in ${item.category.name} for the next 10 minutes.`,
          data: JSON.stringify({ itemId: q.itemId, category: item.category.name }),
        },
      }).catch(() => {});
    }
    liveCategories.add(q.category);
  }

  // 3. Expire posts past expiresAt → auto-burn.
  const expired = await prisma.creativityItem.findMany({
    where: { status: { in: ['live', 'trending'] }, expiresAt: { lt: now } },
    select: {
      id: true, authorId: true, beatCount: true, category: { select: { name: true } },
    },
    take: 100,
  });
  for (const item of expired) {
    await prisma.creativityItem.update({
      where: { id: item.id },
      data: { status: 'expired', trendEndedAt: now },
    });
    await prisma.trendQueue.updateMany({
      where: { itemId: item.id, status: { in: ['queued', 'live'] } },
      data: { status: 'skipped', endedAt: now },
    });
    recordCreativityAction(prisma, item.authorId, 'creativity.expire', item.id, {
      category: item.category.name,
      beatCount: item.beatCount,
    });
    // Sympathy bonus: under-engaged posts earn a small consolation if user
    // hasn't claimed one today already (rate-limited via SpotlightLedger reason).
    if (item.beatCount < SYMPATHY_MIN_BEATS) {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const claimed = await prisma.spotlightLedger.count({
        where: { userId: item.authorId, reason: 'sympathy', createdAt: { gte: todayStart } },
      });
      if (claimed === 0) {
        await appendLedger(prisma, item.authorId, 1, 'sympathy', item.id, { reason: 'low_beats', beats: item.beatCount }).catch(() => {});
        recordCreativityAction(prisma, item.authorId, 'spotlight.granted', item.id, { delta: 1, reason: 'sympathy' });
      }
    }
  }
}

// ─── Public re-exports for server.ts integration ──────
export { awardFirstPostInCategory, awardProfileComplete, awardMatchMilestones, isValidPostMinutes, spend, getBalance };
export { awardDailyLogin, awardCommentLeft, awardReactionReceived, awardFirstAction, awardCreativityStreak7d, awardWeeklyTopCreator };
export { recordCreativityAction, propagateCreatorTraits };
