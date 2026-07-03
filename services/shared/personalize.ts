// ─── Personalization Context Loader ────────────────────
// One-call helper that loads the v6.8 stack for any ranking surface:
// intent classification, negative-signal profile, prev-shown ids,
// novelty affinity, and session mood. Used by discover/dtm (already
// inlined) and by lighter surfaces (matches list, chats list, search,
// notifications, creativity feed) that need the same overlay without
// duplicating ~120 lines of setup.
//
// All DB I/O lives here; the modules in shared/intent-classifier.ts
// and shared/negative-signal-engine.ts stay pure.

import { classifyIntent, blendWeights, type IntentReport, type RevealedIntent } from './intent-classifier';
import { buildNegativeProfile, negativePenalty, type NegativeSignalProfile, type TraitSnapshot } from './negative-signal-engine';
import { diversify, type ScoredCandidate, type DiversifyOpts, type DiversifyResult } from './refresh-diversifier';

export type Surface = 'discover' | 'dtm' | 'matches' | 'chats' | 'search' | 'feed' | 'notifications' | 'suggestions';

export interface PersonalizationCtx {
  intent: IntentReport;
  negProfile: NegativeSignalProfile;
  prevShownIds: Set<string>;
  noveltyAffinity: number;
  sessionMood: 'exploring' | 'selective' | 'rush' | 'normal';
  surface: Surface;
}

const ACTION_FILTERS: Record<Surface, string[]> = {
  discover: ['like', 'pass', 'match', 'swipe', 'super_like'],
  dtm: ['like', 'pass', 'access_request', 'view_full'],
  matches: ['unmatch', 'match.hold', 'match.unhold'],
  chats: ['msg.send', 'chat.archive'],
  search: ['search.click', 'search.skip'],
  feed: ['feed.like', 'feed.skip', 'feed.share'],
  notifications: ['notif.open', 'notif.dismiss'],
  suggestions: ['suggest.accept', 'suggest.skip'],
};

const TARGET_TYPES: Partial<Record<Surface, string[]>> = {
  discover: ['profile'],
  dtm: ['dtm_profile'],
  matches: ['profile'],
  chats: ['chat'],
  search: ['profile'],
  feed: ['feed_item'],
  notifications: ['notification'],
};

export async function loadPersonalizationCtx(
  prisma: any,
  userId: string,
  opts: { surface: Surface; prevWindowMin?: number } = { surface: 'discover' },
): Promise<PersonalizationCtx> {
  const surface = opts.surface;
  const win = (opts.prevWindowMin ?? 60) * 60_000;

  // Pull in parallel — none depend on each other.
  const [eventAggs, recentRouteRows, blocks, reports, mfb, prevRows, profile] = await Promise.all([
    prisma.eventAggDaily.findMany({
      where: { userId, day: { gte: new Date(Date.now() - 14 * 86400_000) } },
      select: { evt: true, day: true, count: true, durSum: true },
      take: 500,
    }).catch(() => []),
    prisma.userActivity.findMany({
      where: { userId, action: 'route', createdAt: { gte: new Date(Date.now() - 14 * 86400_000) } },
      select: { metadata: true, createdAt: true },
      take: 200,
    }).catch(() => []),
    prisma.block.findMany({
      where: { blockerId: userId, createdAt: { gte: new Date(Date.now() - 90 * 86400_000) } },
      select: { blockedId: true, reason: true, createdAt: true },
      take: 200,
    }).catch(() => []),
    prisma.report.findMany({
      where: { reporterId: userId, createdAt: { gte: new Date(Date.now() - 90 * 86400_000) } },
      select: { reportedId: true, reason: true, createdAt: true },
      take: 200,
    }).catch(() => []),
    (prisma as any).matchFeedback?.findMany?.({
      where: { userId, type: { in: ['unmatch', 'block', 'report', 'pass_reason'] }, createdAt: { gte: new Date(Date.now() - 90 * 86400_000) } },
      select: { targetUserId: true, type: true, reason: true, createdAt: true },
      take: 200,
    }).catch(() => []) ?? Promise.resolve([]),
    prisma.userActivity.findMany({
      where: {
        userId,
        action: { in: ACTION_FILTERS[surface] || [] },
        ...(TARGET_TYPES[surface] ? { targetType: { in: TARGET_TYPES[surface]! } } : {}),
        createdAt: { gte: new Date(Date.now() - win) },
      },
      select: { targetId: true },
      take: 200,
    }).catch(() => []),
    prisma.profile.findUnique({ where: { userId }, select: { datingIntent: true, seriousMode: true } }).catch(() => null),
  ]);

  // Hydrate offender traits — Profile lacks `verified`; that's on User.
  const offenderIds = Array.from(new Set([
    ...blocks.map((b: any) => b.blockedId),
    ...reports.map((r: any) => r.reportedId),
    ...mfb.map((f: any) => f.targetUserId).filter(Boolean),
  ]));
  const offenderUsers = offenderIds.length
    ? await prisma.user.findMany({
        where: { id: { in: offenderIds } },
        select: { id: true, verified: true, profile: { select: { city: true, age: true, smoking: true, drinking: true, religion: true, datingIntent: true, education: true } } },
      }).catch(() => [])
    : [];
  const traitsByUser = new Map<string, TraitSnapshot>();
  for (const u of offenderUsers) {
    const p = u.profile;
    traitsByUser.set(u.id, {
      city: p?.city ?? null,
      ageBucket: p?.age ? bucketAge(p.age) : null,
      smoking: p?.smoking ?? null,
      drinking: p?.drinking ?? null,
      religion: p?.religion ?? null,
      datingIntent: p?.datingIntent ?? null,
      education: p?.education ?? null,
      verified: u.verified ?? null,
    });
  }
  const mfbKind: Record<string, 'unmatch' | 'block' | 'report' | 'pass_feedback'> = {
    unmatch: 'unmatch', block: 'block', report: 'report', pass_reason: 'pass_feedback',
  };
  const negEvents: any[] = [
    ...blocks.map((b: any) => ({ kind: 'block', daysAgo: daysAgo(b.createdAt), reason: b.reason, targetTraits: traitsByUser.get(b.blockedId) || {} })),
    ...reports.map((r: any) => ({ kind: 'report', daysAgo: daysAgo(r.createdAt), reason: r.reason, targetTraits: traitsByUser.get(r.reportedId) || {} })),
    ...mfb.map((f: any) => ({ kind: mfbKind[f.type] || 'unmatch', daysAgo: daysAgo(f.createdAt), reason: f.reason, targetTraits: traitsByUser.get(f.targetUserId) || {} })),
  ];

  const recentRoutes = recentRouteRows.map((r: any) => {
    const meta = typeof r.metadata === 'string' ? safeJson(r.metadata) : (r.metadata || {});
    return { path: String(meta?.path || ''), daysAgo: daysAgo(r.createdAt) };
  }).filter((r: any) => r.path);

  const intent = classifyIntent({
    statedIntent: profile?.datingIntent,
    seriousMode: profile?.seriousMode,
    dailyEvents: eventAggs,
    recentRoutes,
  });
  const negProfile = buildNegativeProfile(negEvents);
  const prevShownIds = new Set<string>();
  for (const r of prevRows) if (r.targetId) prevShownIds.add(r.targetId);

  const noveltyAffinity = computeNoveltyAffinity(eventAggs);
  const sessionMood = inferSessionMood(eventAggs, intent);

  return { intent, negProfile, prevShownIds, noveltyAffinity, sessionMood, surface };
}

function daysAgo(d: Date | string): number {
  const t = typeof d === 'string' ? Date.parse(d) : d.getTime();
  return Math.max(0, (Date.now() - t) / 86400_000);
}
function bucketAge(a: number): string {
  if (a < 22) return '18-21';
  if (a < 26) return '22-25';
  if (a < 31) return '26-30';
  if (a < 36) return '31-35';
  if (a < 41) return '36-40';
  return '41+';
}
function safeJson(s: string): any { try { return JSON.parse(s); } catch { return {}; } }

function computeNoveltyAffinity(rows: Array<{ evt: string; count: number }>): number {
  let novel = 0, total = 0;
  for (const r of rows) {
    if (r.evt === 'card.dwell.long' || r.evt === 'profile.depth_score') novel += r.count;
    if (r.evt === 'discover.swipe' || r.evt === 'card.impression.50') total += r.count;
  }
  if (total < 5) return 0.5;
  return Math.max(0, Math.min(1, novel / total));
}

function inferSessionMood(rows: Array<{ evt: string; count: number }>, intent: IntentReport): 'exploring' | 'selective' | 'rush' | 'normal' {
  let bounce = 0, dwellLong = 0, swipes = 0, abandon = 0;
  for (const r of rows) {
    if (r.evt === 'feed.bounce') bounce += r.count;
    if (r.evt === 'card.dwell.long') dwellLong += r.count;
    if (r.evt === 'discover.swipe') swipes += r.count;
    if (r.evt === 'session.abandon') abandon += r.count;
  }
  if (intent.revealed === 'serious' || intent.revealed === 'dtm' || dwellLong > swipes * 0.3) return 'selective';
  if (swipes > 30 && bounce >= 2) return 'rush';
  if (intent.revealed === 'exploring' || abandon > 0) return 'exploring';
  return 'normal';
}

// ─── Lightweight scoring overlay for non-card surfaces ──
// Takes a flat list of items with traits & a base score; returns
// items sorted with negative penalty applied + diversification.
export interface PersonalizableItem {
  id: string;
  baseScore: number;
  traits?: TraitSnapshot;
  isNew?: boolean;
  city?: string;
  ageBucket?: string;
}

export function applyPersonalization<T extends PersonalizableItem>(
  ctx: PersonalizationCtx,
  items: T[],
  opts: { topN?: number; refreshIndex?: number; respectIntent?: boolean } = {},
): { ranked: T[]; diversifier: DiversifyResult<T> } {
  const topN = opts.topN ?? Math.min(items.length, 50);
  const refreshIndex = opts.refreshIndex ?? 0;

  const scored: ScoredCandidate<T>[] = items.map(it => {
    const np = it.traits ? negativePenalty(ctx.negProfile, it.traits) : { penalty: 0, matchedTraits: [] };
    let score = it.baseScore - np.penalty;
    if (opts.respectIntent !== false) {
      // Boost items with traits matching revealed intent (e.g. serious-tagged
      // matches/chats float for users whose revealed intent is serious/dtm).
      const r: RevealedIntent = ctx.intent.revealed;
      if ((r === 'serious' || r === 'dtm') && it.traits?.datingIntent && /serious|marriage|matrimon|long/i.test(it.traits.datingIntent)) {
        score += 5 * ctx.intent.confidence;
      }
    }
    return { user: it, score, isNew: it.isNew, city: it.city, ageBucket: it.ageBucket };
  });

  const divOpts: DiversifyOpts = {
    refreshIndex,
    prevShownIds: ctx.prevShownIds,
    noveltyAffinity: ctx.noveltyAffinity,
    sessionMood: ctx.sessionMood,
    topN,
    intent: ctx.intent.revealed,
  };
  const div = diversify(scored, divOpts);
  return { ranked: div.ranked.map(c => c.user), diversifier: div };
}

// Convenience re-exports
export { classifyIntent, blendWeights, buildNegativeProfile, negativePenalty, diversify };
export type { IntentReport, NegativeSignalProfile, TraitSnapshot, DiversifyResult };
