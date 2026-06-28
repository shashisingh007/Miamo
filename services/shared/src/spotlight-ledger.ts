// ─── Spotlight Minutes Ledger ────────────────────────
// Server-authoritative time-currency for the Creativity feature.
// Balance = SUM(delta) over SpotlightLedger rows for the user.
// Every grant and every spend is one append-only row — never overwritten.
//
// Earning rules (idempotent via SpotlightAward.unique[userId, kind]):
//   profile_100              +10  (one-time, on profile completionScore == 100)
//   matches_10/50/100/250    +10/+20/+30/+50  (cumulative-match milestones)
//   first_post_<category>    +5   (per category, once)
//   first_beat_sent          +5   (one-time, your first beat on someone's post)
//   first_comment_sent       +5   (one-time, your first comment on someone's post)
//   first_share_sent         +5   (one-time, your first share)
//   streak_3d                +5   (legacy 3-day Spotlight streak; ledger reason only)
//   streak_7d_creativity     +10  (one-time, 7 consecutive UTC days w/ any creativity action)
//   weekly_top_<cat>_rank<R>_<weekKey>  +20/+15/+10 (per category, per ISO week)
//   collab_credit            +5   (post you were tagged in trended)
//   daily_login              +1..+5 by streak length (capped 1/UTC day)
//   comment_left             +1   per comment, capped DAILY_CAP_COMMENTS/day
//   beat_received            +1   per inbound reaction, capped DAILY_CAP_REACTIONS_RECV/day
//   sympathy                 +1   (post burned with <3 beats)
//   refund_oops              +<post.minutesPaid>  (delete within 90s of upload)
//   purchase_<n>min          variable
//   admin_grant              variable
//
// All public functions are safe to call repeatedly — they're either idempotent
// by SpotlightAward guard or describe transient ledger writes (post_spend,
// refund_oops, daily_login, sympathy, collab_credit, purchase_*).
//
// THIS MODULE IS PURE BUSINESS RULES + DB I/O. No HTTP, no logging, no Redis.

import type { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export type AwardKind =
  | 'profile_100'
  | 'matches_10'
  | 'matches_50'
  | 'matches_100'
  | 'matches_250'
  | 'streak_7d_creativity'
  | 'first_beat_sent'
  | 'first_comment_sent'
  | 'first_share_sent'
  | `first_post_${string}`
  // weekly_top_<category>_rank<1|2|3>_<ISOweek-key like 2026W03>
  | `weekly_top_${string}`;

export type LedgerReason =
  | 'profile_100'
  | 'matches_10'
  | 'matches_50'
  | 'matches_100'
  | 'matches_250'
  | 'first_post'
  | 'streak_3d'
  | 'streak_7d_creativity'
  | 'collab_credit'
  | 'daily_login'
  | 'comment_left'
  | 'beat_received'
  | 'first_beat_sent'
  | 'first_comment_sent'
  | 'first_share_sent'
  | 'weekly_top_creator'
  | 'sympathy'
  | 'post_spend'
  | 'refund_oops'
  | 'admin_grant'
  | `purchase_${number}min`;

// Daily caps — soft floors per UTC day per user.
export const DAILY_CAP_COMMENTS = 5;        // earn +1 per up to 5 comments left
export const DAILY_CAP_REACTIONS_RECV = 20; // earn +1 per up to 20 reactions received

// Daily login streak tiers (UTC day):
//   day 1   → +1
//   days 2–3 → +2
//   days 4–6 → +3
//   day 7+  → +5
export function dailyLoginDelta(streakDays: number): number {
  if (streakDays <= 1) return 1;
  if (streakDays <= 3) return 2;
  if (streakDays <= 6) return 3;
  return 5;
}

// ISO week key like "2026W03" — used for weekly_top_<cat>_<rank>_<weekKey>.
export function isoWeekKey(d: Date = new Date()): string {
  // Algorithm: copy date → set to nearest Thursday → year of that = ISO year;
  // week = floor((thursday - Jan4) / 7d) + 1.
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}W${String(weekNo).padStart(2, '0')}`;
}

export interface LedgerEntry {
  id: string;
  delta: number;
  reason: string;
  refId: string | null;
  meta: string | null;
  createdAt: Date;
}

// ─── Read APIs ───────────────────────────────────────

/** Current balance in minutes (sum of all ledger deltas). Always non-negative; if negative is detected we clamp and log. */
export async function getBalance(prisma: PrismaClient, userId: string): Promise<number> {
  const agg = await prisma.spotlightLedger.aggregate({
    where: { userId },
    _sum: { delta: true },
  });
  const v = agg._sum.delta ?? 0;
  if (v < 0) {
    logger.warn(`spotlight: negative balance detected for user ${userId} (${v}). Clamping to 0.`);
    return 0;
  }
  return v;
}

/** Last N ledger rows, newest first. */
export async function getHistory(
  prisma: PrismaClient,
  userId: string,
  take = 50,
): Promise<LedgerEntry[]> {
  const rows = await prisma.spotlightLedger.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
  });
  return rows.map((r: any) => ({
    id: r.id,
    delta: r.delta,
    reason: r.reason,
    refId: r.refId,
    meta: r.meta,
    createdAt: r.createdAt,
  }));
}

// ─── Write APIs ──────────────────────────────────────

/**
 * Append a raw ledger row. Caller is responsible for any idempotency (use
 * `awardOnce` for milestone bonuses). Returns the new row.
 */
export async function appendLedger(
  prisma: PrismaClient,
  userId: string,
  delta: number,
  reason: string,
  refId?: string | null,
  meta?: Record<string, unknown> | null,
): Promise<{ id: string; balanceAfter: number }> {
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error(`appendLedger: invalid delta ${delta}`);
  }
  const row = await prisma.spotlightLedger.create({
    data: {
      userId,
      delta: Math.trunc(delta),
      reason,
      refId: refId ?? null,
      ...(meta ? { meta: meta as any } : {}),
    },
    select: { id: true },
  });
  const balanceAfter = await getBalance(prisma, userId);
  return { id: row.id, balanceAfter };
}

/**
 * Idempotent one-time award. Inserts a SpotlightAward row guarded by
 * @@unique[userId,kind]; on conflict we no-op and return { granted: false }.
 * If the award is fresh, we ALSO append the ledger entry in the same
 * transaction so the two stay consistent.
 */
export async function awardOnce(
  prisma: PrismaClient,
  userId: string,
  kind: AwardKind,
  delta: number,
  meta?: Record<string, unknown> | null,
  itemId?: string | null,
): Promise<{ granted: boolean; balanceAfter: number }> {
  // Try insert-if-not-exists pattern via try/catch on unique violation.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.spotlightAward.create({
        data: { userId, kind, itemId: itemId ?? null },
      });
      await tx.spotlightLedger.create({
        data: {
          userId,
          delta,
          reason: kind,
          refId: itemId ?? null,
          ...(meta ? { meta: meta as any } : {}),
        },
      });
    });
    const balanceAfter = await getBalance(prisma, userId);
    return { granted: true, balanceAfter };
  } catch (err: any) {
    // P2002 = unique constraint violation → already awarded, no-op.
    if (err?.code === 'P2002') {
      const balanceAfter = await getBalance(prisma, userId);
      return { granted: false, balanceAfter };
    }
    throw err;
  }
}

/**
 * Atomically debit minutes for a post spend. Throws if balance < amount.
 * Uses serializable isolation to prevent two concurrent uploads from
 * over-spending a balance that only covers one.
 */
export async function spend(
  prisma: PrismaClient,
  userId: string,
  amount: number,
  reason: LedgerReason | string,
  refId?: string | null,
  meta?: Record<string, unknown> | null,
): Promise<{ balanceAfter: number }> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`spend: amount must be positive integer (got ${amount})`);
  }
  return await prisma.$transaction(async (tx) => {
    const agg = await tx.spotlightLedger.aggregate({
      where: { userId },
      _sum: { delta: true },
    });
    const balance = agg._sum.delta ?? 0;
    if (balance < amount) {
      throw Object.assign(new Error('insufficient_balance'), { code: 'INSUFFICIENT_BALANCE', balance });
    }
    await tx.spotlightLedger.create({
      data: {
        userId,
        delta: -amount,
        reason,
        refId: refId ?? null,
        ...(meta ? { meta: meta as any } : {}),
      },
    });
    return { balanceAfter: balance - amount };
  }, { isolationLevel: 'Serializable' });
}

/** Refund minutes (e.g. oops-delete inside 90s, moderation reject). */
export async function refund(
  prisma: PrismaClient,
  userId: string,
  amount: number,
  reason: LedgerReason | string,
  refId?: string | null,
  meta?: Record<string, unknown> | null,
): Promise<{ balanceAfter: number }> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`refund: amount must be positive integer (got ${amount})`);
  }
  return appendLedger(prisma, userId, amount, reason, refId, meta).then((r) => ({ balanceAfter: r.balanceAfter }));
}

// ─── Earning-rule triggers ───────────────────────────

/** Match-milestone rewards. Returns the kinds that fired. */
export async function awardMatchMilestones(
  prisma: PrismaClient,
  userId: string,
  matchCount: number,
): Promise<{ awarded: AwardKind[]; balanceAfter: number }> {
  const awarded: AwardKind[] = [];
  const tiers: Array<{ at: number; kind: AwardKind; delta: number }> = [
    { at: 10, kind: 'matches_10', delta: 10 },
    { at: 50, kind: 'matches_50', delta: 20 },
    { at: 100, kind: 'matches_100', delta: 30 },
    { at: 250, kind: 'matches_250', delta: 50 },
  ];
  let lastBalance = -1;
  for (const t of tiers) {
    if (matchCount >= t.at) {
      const r = await awardOnce(prisma, userId, t.kind, t.delta, { matchCount });
      if (r.granted) awarded.push(t.kind);
      lastBalance = r.balanceAfter;
    }
  }
  return {
    awarded,
    balanceAfter: lastBalance >= 0 ? lastBalance : await getBalance(prisma, userId),
  };
}

/** Profile-100% bonus. Idempotent. */
export async function awardProfileComplete(
  prisma: PrismaClient,
  userId: string,
): Promise<{ granted: boolean; balanceAfter: number }> {
  return awardOnce(prisma, userId, 'profile_100', 10, { milestone: 'profile_complete' });
}

/** First post in a category. Returns granted=false if user already posted in that category before. */
export async function awardFirstPostInCategory(
  prisma: PrismaClient,
  userId: string,
  categoryName: string,
): Promise<{ granted: boolean; balanceAfter: number }> {
  const kind = `first_post_${categoryName.toLowerCase()}` as AwardKind;
  return awardOnce(prisma, userId, kind, 5, { category: categoryName });
}

// ─── Validation helpers ──────────────────────────────

export const MIN_MINUTES = 5;
export const MINUTES_STEP = 5;
export const MAX_MINUTES_PER_POST = 60;       // hard cap so a single post can't burn an hour
export const REFUND_WINDOW_MS = 90_000;       // 90 seconds free oops-delete

export function isValidPostMinutes(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_MINUTES && n <= MAX_MINUTES_PER_POST && n % MINUTES_STEP === 0;
}

// ─── Recurring earn-path helpers ─────────────────────

/** UTC day window [start,end) bracketing the given Date. */
function utcDayWindow(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end };
}

/**
 * Daily login bonus. One award per UTC day; delta scales with consecutive-day
 * streak (computed by walking backwards through prior daily_login rows).
 * Returns { granted: false } if already claimed today.
 */
export async function awardDailyLogin(
  prisma: PrismaClient,
  userId: string,
): Promise<{ granted: boolean; delta: number; streakDays: number; balanceAfter: number }> {
  const now = new Date();
  const { start: todayStart } = utcDayWindow(now);
  const claimedToday = await prisma.spotlightLedger.findFirst({
    where: { userId, reason: 'daily_login', createdAt: { gte: todayStart } },
    select: { id: true },
  });
  if (claimedToday) {
    return { granted: false, delta: 0, streakDays: 0, balanceAfter: await getBalance(prisma, userId) };
  }
  // Compute streak: walk previous 30 days, count consecutive UTC days with a daily_login row.
  const lookback = new Date(todayStart.getTime() - 30 * 86_400_000);
  const prior = await prisma.spotlightLedger.findMany({
    where: { userId, reason: 'daily_login', createdAt: { gte: lookback, lt: todayStart } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  // Build set of UTC date keys (yyyy-mm-dd) the user claimed.
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const claimedDays = new Set(prior.map((r) => dayKey(r.createdAt)));
  let streak = 1; // today counts
  for (let i = 1; i <= 30; i++) {
    const probe = new Date(todayStart.getTime() - i * 86_400_000);
    if (claimedDays.has(dayKey(probe))) streak++;
    else break;
  }
  const delta = dailyLoginDelta(streak);
  const row = await appendLedger(prisma, userId, delta, 'daily_login', null, { streakDays: streak });
  return { granted: true, delta, streakDays: streak, balanceAfter: row.balanceAfter };
}

/**
 * Award +1 per comment left, up to DAILY_CAP_COMMENTS/UTC day.
 * Idempotency: callers may invoke once per real comment; if today's count is
 * already at cap we return granted=false.
 */
export async function awardCommentLeft(
  prisma: PrismaClient,
  userId: string,
  itemId: string,
): Promise<{ granted: boolean; balanceAfter: number; usedToday: number }> {
  const { start } = utcDayWindow();
  const usedToday = await prisma.spotlightLedger.count({
    where: { userId, reason: 'comment_left', createdAt: { gte: start } },
  });
  if (usedToday >= DAILY_CAP_COMMENTS) {
    return { granted: false, balanceAfter: await getBalance(prisma, userId), usedToday };
  }
  const row = await appendLedger(prisma, userId, 1, 'comment_left', itemId, { usedToday: usedToday + 1, cap: DAILY_CAP_COMMENTS });
  return { granted: true, balanceAfter: row.balanceAfter, usedToday: usedToday + 1 };
}

/**
 * Award +1 to the AUTHOR per inbound reaction, capped at DAILY_CAP_REACTIONS_RECV/UTC day.
 * Skip if reactor === author. Pass reactorId for traceability.
 */
export async function awardReactionReceived(
  prisma: PrismaClient,
  authorId: string,
  itemId: string,
  reactorId: string,
): Promise<{ granted: boolean; balanceAfter: number; usedToday: number }> {
  if (authorId === reactorId) {
    return { granted: false, balanceAfter: await getBalance(prisma, authorId), usedToday: 0 };
  }
  const { start } = utcDayWindow();
  const usedToday = await prisma.spotlightLedger.count({
    where: { userId: authorId, reason: 'beat_received', createdAt: { gte: start } },
  });
  if (usedToday >= DAILY_CAP_REACTIONS_RECV) {
    return { granted: false, balanceAfter: await getBalance(prisma, authorId), usedToday };
  }
  const row = await appendLedger(prisma, authorId, 1, 'beat_received', itemId, { reactorId, usedToday: usedToday + 1, cap: DAILY_CAP_REACTIONS_RECV });
  return { granted: true, balanceAfter: row.balanceAfter, usedToday: usedToday + 1 };
}

/** One-time first-X awards: +5 each, lifetime per user. */
export async function awardFirstAction(
  prisma: PrismaClient,
  userId: string,
  action: 'beat_sent' | 'comment_sent' | 'share_sent',
): Promise<{ granted: boolean; balanceAfter: number }> {
  const kind = `first_${action}` as AwardKind;
  return awardOnce(prisma, userId, kind, 5, { firstAction: action });
}

/**
 * 7-day creativity streak (+10, lifetime-once per user). Granted when the
 * user has performed any of view/like/comment/share/move/upload on at least
 * 7 distinct UTC days within the trailing 14-day window.
 */
export async function awardCreativityStreak7d(
  prisma: PrismaClient,
  userId: string,
): Promise<{ granted: boolean; balanceAfter: number; activeDays: number }> {
  const since = new Date(Date.now() - 14 * 86_400_000);
  const rows = await prisma.userActivity.findMany({
    where: {
      userId,
      targetType: 'creativity',
      action: { in: ['view', 'creativity.view', 'like', 'creativity.like', 'comment', 'creativity.comment', 'share', 'creativity.share', 'move', 'creativity.move', 'creativity.upload', 'save', 'creativity.save'] },
      createdAt: { gte: since },
    },
    select: { createdAt: true },
  });
  const days = new Set(rows.map((r) => r.createdAt.toISOString().slice(0, 10)));
  const activeDays = days.size;
  if (activeDays < 7) return { granted: false, balanceAfter: await getBalance(prisma, userId), activeDays };
  const r = await awardOnce(prisma, userId, 'streak_7d_creativity', 10, { activeDays, window: '14d' });
  return { granted: r.granted, balanceAfter: r.balanceAfter, activeDays };
}

/**
 * Weekly top-creator placement (+20/+15/+10 for ranks 1/2/3). Idempotent
 * per category + ISO week.
 */
export async function awardWeeklyTopCreator(
  prisma: PrismaClient,
  userId: string,
  category: string,
  rank: 1 | 2 | 3,
  weekKey: string = isoWeekKey(),
): Promise<{ granted: boolean; balanceAfter: number }> {
  const delta = rank === 1 ? 20 : rank === 2 ? 15 : 10;
  const kindCat = category.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const kind = `weekly_top_${kindCat}_rank${rank}_${weekKey}` as AwardKind;
  return awardOnce(prisma, userId, kind, delta, { category, rank, weekKey, reason: 'weekly_top_creator' });
}

// ─── Earn-opportunity introspection ──────────────────

export interface EarnOpportunity {
  kind: string;
  label: string;
  delta: number | string;          // "+1..+5" or 10
  status: 'available' | 'claimed_today' | 'completed' | 'progress';
  progress?: { used: number; cap: number };
  hint?: string;
}

/**
 * Snapshot of all earn opportunities for a user — used by the UI's Earn
 * drawer. Pure DB read (no writes). Safe to call frequently.
 */
export async function listEarnOpportunities(
  prisma: PrismaClient,
  userId: string,
): Promise<EarnOpportunity[]> {
  const { start: todayStart } = utcDayWindow();
  const [dailyClaim, commentsToday, reactionsToday, profileAward, streakAward, firstBeat, firstComment, firstShare] = await Promise.all([
    prisma.spotlightLedger.findFirst({ where: { userId, reason: 'daily_login', createdAt: { gte: todayStart } }, select: { meta: true } }),
    prisma.spotlightLedger.count({ where: { userId, reason: 'comment_left', createdAt: { gte: todayStart } } }),
    prisma.spotlightLedger.count({ where: { userId, reason: 'beat_received', createdAt: { gte: todayStart } } }),
    prisma.spotlightAward.findUnique({ where: { userId_kind: { userId, kind: 'profile_100' } } }).catch(() => null),
    prisma.spotlightAward.findUnique({ where: { userId_kind: { userId, kind: 'streak_7d_creativity' } } }).catch(() => null),
    prisma.spotlightAward.findUnique({ where: { userId_kind: { userId, kind: 'first_beat_sent' } } }).catch(() => null),
    prisma.spotlightAward.findUnique({ where: { userId_kind: { userId, kind: 'first_comment_sent' } } }).catch(() => null),
    prisma.spotlightAward.findUnique({ where: { userId_kind: { userId, kind: 'first_share_sent' } } }).catch(() => null),
  ]);
  const opps: EarnOpportunity[] = [];
  opps.push({
    kind: 'daily_login', label: 'Open Creativity today', delta: '+1..+5 by streak',
    status: dailyClaim ? 'claimed_today' : 'available',
    hint: dailyClaim ? `Already claimed (streak ${(dailyClaim.meta as any)?.streakDays ?? 1}d)` : 'Tier rises every consecutive day',
  });
  opps.push({
    kind: 'comment_left', label: 'Comment on others\u2019 posts', delta: '+1 each (cap 5/day)',
    status: commentsToday >= DAILY_CAP_COMMENTS ? 'claimed_today' : 'progress',
    progress: { used: commentsToday, cap: DAILY_CAP_COMMENTS },
  });
  opps.push({
    kind: 'beat_received', label: 'Get beats on your posts', delta: '+1 each (cap 20/day)',
    status: reactionsToday >= DAILY_CAP_REACTIONS_RECV ? 'claimed_today' : 'progress',
    progress: { used: reactionsToday, cap: DAILY_CAP_REACTIONS_RECV },
  });
  opps.push({
    kind: 'profile_100', label: 'Complete your profile', delta: 10,
    status: profileAward ? 'completed' : 'available',
  });
  opps.push({
    kind: 'streak_7d_creativity', label: '7-day creativity streak', delta: 10,
    status: streakAward ? 'completed' : 'available',
  });
  opps.push({
    kind: 'first_beat_sent', label: 'Send your first beat', delta: 5,
    status: firstBeat ? 'completed' : 'available',
  });
  opps.push({
    kind: 'first_comment_sent', label: 'Leave your first comment', delta: 5,
    status: firstComment ? 'completed' : 'available',
  });
  opps.push({
    kind: 'first_share_sent', label: 'Share your first post', delta: 5,
    status: firstShare ? 'completed' : 'available',
  });
  opps.push({
    kind: 'matches_10', label: 'Match milestones', delta: '+10/+20/+30/+50',
    status: 'progress', hint: 'Tiers at 10, 50, 100, 250 active matches',
  });
  opps.push({
    kind: 'weekly_top_creator', label: 'Weekly top-3 creator in any category', delta: '+20/+15/+10',
    status: 'progress', hint: 'Score by beats received + saves + shares',
  });
  return opps;
}
