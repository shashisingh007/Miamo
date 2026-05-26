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

export interface SignalReader {
  hashOf(userId: string): string;
  features(uidHash: string): Promise<FeatureRow | null>;
  /** Bulk pair lookup; returns map keyed by bHash. */
  pairCompat(aHash: string, bHashes: string[]): Promise<Map<string, PairRow>>;
  /** Aggregated evt counts for a uidHash over the last N days. */
  recentEvents(uidHash: string, evts: string[], days: number): Promise<EvtCount[]>;
  /** Prior-interaction counts: how many times aHash targeted each bHash. */
  priorTargets(aHash: string, bHashes: string[], days: number): Promise<Map<string, number>>;
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
              ("raw"->'peakHours') AS "peakHours"
       FROM "FeatureSnapshot" WHERE "uidHash" = $1`,
      uidHash,
    )) as Array<FeatureRow & { interestVec: Buffer | null; vibeEmb: Buffer | null; behaviorEmb: Buffer | null; peakHours: unknown }>;
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
}
