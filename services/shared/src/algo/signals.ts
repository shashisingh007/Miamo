/**
 * SignalReader — the *only* legal way for v4 algorithms to read tracking
 * data. Backed by Prisma + Redis caches; fake implementations live in tests.
 *
 * Design rules (do not violate):
 *   - Every read is consent-aware (see consent.ts wrapper).
 *   - Every read has a sub-millisecond hot path via the in-memory LRU,
 *     and a sub-100ms cold path via PairCompatCache / FeatureSnapshot.
 *   - No algorithm may import Prisma directly. Period.
 */
import type { PrismaClient } from '@prisma/client';
import { hashUid } from './hash';
import { LRU } from './lru';

export type FeatureRow = {
  uidHash: string;
  chronotype: string | null;
  attentionProfile: string | null;
  rageClickRate: number | null;
  deadClickRate: number | null;
  swipeRightRatio: number | null;
  replyPersonaP50Ms: number | null;
  responseRate: number | null;
  interestVec: Float32Array | null;
  vibeEmb: Float32Array | null;
  behaviorEmb: Float32Array | null;
  peakHours: number[] | null;
  /** v4: 5-bucket dwell distribution from card.impression.100 dwellMs
   *  Buckets: <750ms, <2s, <5s, <10s, >=10s. Null if not yet computed. */
  dwellHistogram?: number[] | null;
  /** v4: median ms from card visible -> swipe.commit, last 14d. */
  hesitationP50Ms?: number | null;
  /** v4: fraction of commits undone within 3s. 0..1. */
  regretRate?: number | null;
  /** v4: fraction of card.impressions on candidates already passed-twice. 0..1. */
  repeatPassRate?: number | null;
};

export type PairRow = {
  aHash: string;
  bHash: string;
  interestCos: number;
  vibeCos: number;
  behaviorCos: number;
  magnetCos: number;
  chronoOverlap: number;
  cadenceOverlap: number;
  priorInteractionScore: number;
  finalScore: number;
  computedAt: Date;
};

export type EvtCount = { evt: string; count: number; days: number };

/** v4: per-pair behaviour signals consumed by forYou v5 + postImpressionRerank. */
export type PairBehavior = {
  /** undo events on this candidate in last N days */
  regrets: number;
  /** swipe.repeat_pass count: cand shown >=2x and passed in session */
  repeatPasses: number;
  /** intent.profile.settle count: returns to this profile within session */
  returns: number;
  /** longest single card.impression.100 dwell (ms) on this candidate */
  maxDwellMs: number;
};

/** v6: derived session-level rollup produced by tracking-worker at session.end. */
export type SessionSummaryRow = {
  uidHash: string;
  sessionId: string;
  startedAt: Date;
  endedAt: Date;
  durationMs: number;
  idleMs: number;
  routesVisited: string[];
  cardsViewed: number;
  swipesLeft: number;
  swipesRight: number;
  msgsSent: number;
  msgsRead: number;
  /** session was foreground >30s with zero swipes/msgs/clicks. */
  zeroActionSession: boolean;
  /** session opened, scrolled, closed without committing any swipe. */
  windowShopping: boolean;
  /** session opened with unread msgs, closed without sending. */
  ghostedSelf: boolean;
};

/** v6: per-(route, elementId) focus/dwell affinity for a user, last N days. */
export type FocusAffinityRow = {
  route: string;
  elementId: string;
  focusCount: number;
  dwellSumMs: number;
  lastSeenAt: Date;
};

export interface SignalReader {
  hashOf(userId: string): string;
  features(uidHash: string): Promise<FeatureRow | null>;
  /** Bulk pair lookup; returns map keyed by bHash. */
  pairCompat(aHash: string, bHashes: string[]): Promise<Map<string, PairRow>>;
  /** Aggregated evt counts for a uidHash over the last N days. */
  recentEvents(uidHash: string, evts: string[], days: number): Promise<EvtCount[]>;
  /** Prior-interaction counts: how many times aHash targeted each bHash. */
  priorTargets(aHash: string, bHashes: string[], days: number): Promise<Map<string, number>>;
  /** Per-candidate impression counts (discover.card_view → targets) over the last N days. */
  targetImpressions(aHash: string, bHashes: string[], days: number): Promise<Map<string, number>>;
  /** Daily AI Match pre-compute (FeatureSnapshot.raw->'dailyMatch'). */
  dailyMatch(uidHash: string): Promise<{ bHash: string; score: number; computedAt: string } | null>;
  /** v4: per-pair behaviour signals (regrets, repeat-passes, returns, dwell). */
  pairBehavior(aHash: string, bHashes: string[], days: number): Promise<Map<string, PairBehavior>>;
  /** v6: recent session rollups for a user (most-recent first). */
  sessionSummaries?(uidHash: string, days: number): Promise<SessionSummaryRow[]>;
  /** v6: per-element focus/dwell affinity for a user, last N days. */
  focusAffinity?(uidHash: string, days: number): Promise<FocusAffinityRow[]>;
}

const FEATURES_TTL_MS = 60_000;
const PAIR_TTL_MS = 30_000;

function bufToF32(b: Buffer | null | undefined): Float32Array | null {
  if (!b) return null;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}

export class PrismaSignalReader implements SignalReader {
  private featuresCache = new LRU<string, FeatureRow | null>(2048);
  private pairCache = new LRU<string, PairRow>(8192);

  constructor(private prisma: PrismaClient) {}

  hashOf(userId: string): string {
    return hashUid(userId);
  }

  async features(uidHash: string): Promise<FeatureRow | null> {
    const cached = this.featuresCache.get(uidHash);
    if (cached !== undefined) return cached;
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash","chronotype","attentionProfile","rageClickRate","deadClickRate",
              "swipeRightRatio","replyPersonaP50Ms","responseRate",
              "interestVec","vibeEmb","behaviorEmb",
              ("raw"->'peakHours') AS "peakHours",
              ("raw"->'dwellHistogram') AS "dwellHistogram",
              ("raw"->>'hesitationP50Ms')::float AS "hesitationP50Ms",
              ("raw"->>'regretRate')::float AS "regretRate",
              ("raw"->>'repeatPassRate')::float AS "repeatPassRate"
       FROM "FeatureSnapshot" WHERE "uidHash" = $1`,
      uidHash,
    )) as Array<FeatureRow & { interestVec: Buffer | null; vibeEmb: Buffer | null; behaviorEmb: Buffer | null; peakHours: unknown; dwellHistogram: unknown }>;
    if (rows.length === 0) {
      this.featuresCache.set(uidHash, null, FEATURES_TTL_MS);
      return null;
    }
    const r = rows[0];
    const out: FeatureRow = {
      ...r,
      interestVec: bufToF32(r.interestVec as unknown as Buffer | null),
      vibeEmb: bufToF32(r.vibeEmb as unknown as Buffer | null),
      behaviorEmb: bufToF32(r.behaviorEmb as unknown as Buffer | null),
      peakHours: Array.isArray(r.peakHours) ? (r.peakHours as number[]) : null,
      dwellHistogram: Array.isArray(r.dwellHistogram) ? (r.dwellHistogram as number[]) : null,
      hesitationP50Ms: typeof r.hesitationP50Ms === 'number' ? r.hesitationP50Ms : null,
      regretRate: typeof r.regretRate === 'number' ? r.regretRate : null,
      repeatPassRate: typeof r.repeatPassRate === 'number' ? r.repeatPassRate : null,
    };
    this.featuresCache.set(uidHash, out, FEATURES_TTL_MS);
    return out;
  }

  async pairCompat(aHash: string, bHashes: string[]): Promise<Map<string, PairRow>> {
    const result = new Map<string, PairRow>();
    const need: string[] = [];
    for (const b of bHashes) {
      const k = `${aHash}|${b}`;
      const hit = this.pairCache.get(k);
      if (hit) result.set(b, hit);
      else need.push(b);
    }
    if (need.length === 0) return result;
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "aHash","bHash","interestCos","vibeCos","behaviorCos","magnetCos",
              "chronoOverlap","cadenceOverlap","priorInteractionScore","finalScore","computedAt"
       FROM "PairCompatCache"
       WHERE "aHash" = $1 AND "bHash" = ANY($2::text[])`,
      aHash, need,
    )) as PairRow[];
    for (const r of rows) {
      this.pairCache.set(`${aHash}|${r.bHash}`, r, PAIR_TTL_MS);
      result.set(r.bHash, r);
    }
    return result;
  }

  async recentEvents(uidHash: string, evts: string[], days: number): Promise<EvtCount[]> {
    if (evts.length === 0) return [];
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "evt", SUM("count")::int AS count
       FROM "EventAggDaily"
       WHERE "uidHash" = $1 AND "evt" = ANY($2::text[]) AND "day" >= NOW() - ($3 || ' days')::interval
       GROUP BY "evt"`,
      uidHash, evts, String(days),
    )) as Array<{ evt: string; count: number }>;
    return rows.map((r) => ({ evt: r.evt, count: Number(r.count), days }));
  }

  async priorTargets(aHash: string, bHashes: string[], days: number): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (bHashes.length === 0) return out;
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT meta->'targets' AS targets
       FROM "EventAggDaily"
       WHERE "uidHash" = $1 AND "day" >= NOW() - ($2 || ' days')::interval
         AND meta ? 'targets'`,
      aHash, String(days),
    )) as Array<{ targets: Record<string, number> | null }>;
    const bSet = new Set(bHashes);
    for (const r of rows) {
      if (!r.targets) continue;
      for (const [b, c] of Object.entries(r.targets)) {
        if (bSet.has(b)) out.set(b, (out.get(b) || 0) + Number(c));
      }
    }
    return out;
  }

  async targetImpressions(aHash: string, bHashes: string[], days: number): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (bHashes.length === 0) return out;
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT meta->'targets' AS targets
       FROM "EventAggDaily"
       WHERE "uidHash" = $1
         AND "evt" = 'discover.card_view'
         AND "day" >= NOW() - ($2 || ' days')::interval
         AND meta ? 'targets'`,
      aHash, String(days),
    )) as Array<{ targets: Record<string, number> | null }>;
    const bSet = new Set(bHashes);
    for (const r of rows) {
      if (!r.targets) continue;
      for (const [b, c] of Object.entries(r.targets)) {
        if (bSet.has(b)) out.set(b, (out.get(b) || 0) + Number(c));
      }
    }
    return out;
  }

  async dailyMatch(uidHash: string): Promise<{ bHash: string; score: number; computedAt: string } | null> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "raw"->'dailyMatch' AS dm
       FROM "FeatureSnapshot" WHERE "uidHash" = $1`,
      uidHash,
    )) as Array<{ dm: { bHash?: string; score?: number; computedAt?: string } | null }>;
    const dm = rows[0]?.dm;
    if (!dm || typeof dm.bHash !== 'string' || typeof dm.score !== 'number') return null;
    return { bHash: dm.bHash, score: dm.score, computedAt: dm.computedAt ?? '' };
  }

  async pairBehavior(aHash: string, bHashes: string[], days: number): Promise<Map<string, PairBehavior>> {
    const out = new Map<string, PairBehavior>();
    if (bHashes.length === 0) return out;
    // Read per-target counts for the four v4 swipe/return events from EventAggDaily.meta.targets.
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "evt", meta->'targets' AS targets, meta->>'maxDwellMs' AS "maxDwellMs"
       FROM "EventAggDaily"
       WHERE "uidHash" = $1
         AND "day" >= NOW() - ($2 || ' days')::interval
         AND "evt" IN ('swipe.regret','swipe.repeat_pass','intent.profile.settle','card.impression.100')
         AND meta ? 'targets'`,
      aHash, String(days),
    )) as Array<{ evt: string; targets: Record<string, number> | null; maxDwellMs: string | null }>;
    const bSet = new Set(bHashes);
    const ensure = (b: string): PairBehavior => {
      let cur = out.get(b);
      if (!cur) { cur = { regrets: 0, repeatPasses: 0, returns: 0, maxDwellMs: 0 }; out.set(b, cur); }
      return cur;
    };
    for (const r of rows) {
      if (!r.targets) continue;
      for (const [b, c] of Object.entries(r.targets)) {
        if (!bSet.has(b)) continue;
        const pb = ensure(b);
        const n = Number(c);
        if (r.evt === 'swipe.regret') pb.regrets += n;
        else if (r.evt === 'swipe.repeat_pass') pb.repeatPasses += n;
        else if (r.evt === 'intent.profile.settle') pb.returns += n;
        else if (r.evt === 'card.impression.100') {
          const dwell = Number(r.maxDwellMs || 0);
          if (dwell > pb.maxDwellMs) pb.maxDwellMs = dwell;
        }
      }
    }
    return out;
  }
}
