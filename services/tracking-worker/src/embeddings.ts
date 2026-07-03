/**
 * Embedding worker.
 *
 * Computes three dense feature vectors per active uidHash and writes them to
 * FeatureSnapshot.{interestVec, vibeEmb, behaviorEmb}. We use deterministic
 * hashed-feature vectors (no external model) so this runs entirely inside
 * the cluster with no API key or GPU dependency:
 *
 *   - interestVec (32 dims) — hashed bag-of-evts weighted by log(count) over
 *     the last 30 days. Captures "what kinds of things this user does".
 *
 *   - vibeEmb (64 dims) — hashed bag-of-evts at finer granularity over the
 *     last 14 days, weighted by recency (linear decay).
 *
 *   - behaviorEmb (64 dims) — engineered feature vector from the scalar
 *     FeatureSnapshot fields: chronotype one-hot, rage/dead click rates,
 *     attention profile one-hot, swipe ratio, etc. Padded with hash buckets
 *     from evt counts to fill 64 dims.
 *
 * All vectors L2-normalised so cosine = dot product. Stored as Float32 LE
 * buffers (schema comment said f16 — we chose f32 for JS simplicity; the
 * column is Bytes? so the storage shape isn't a breaking change).
 */
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

const INTERVAL_MS = Number(process.env.EMBED_INTERVAL_MS || 30 * 60 * 1000);
const BATCH = Number(process.env.EMBED_BATCH || 200);
const INTEREST_DIMS = 32;
const VIBE_DIMS = 64;
const BEHAVIOR_DIMS = 64;

function bucket(s: string, dims: number, seed = 0): number {
  const h = createHash('sha256').update(`${seed}|${s}`).digest();
  // Use first 4 bytes as uint32, mod dims.
  return ((h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3]) >>> 0 ? (((h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3]) >>> 0) % dims : 0;
}

export function l2Normalize(v: Float32Array): Float32Array {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const norm = Math.sqrt(sum);
  if (norm === 0) return v;
  const inv = 1 / norm;
  for (let i = 0; i < v.length; i++) v[i] *= inv;
  return v;
}

export function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export function toBuffer(v: Float32Array): Buffer {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
}

export function fromBuffer(b: Buffer, dims: number): Float32Array {
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + dims * 4));
}

type DayRow = { evt: string; count: number; ageDays: number };
type Snap = {
  uidHash: string;
  chronotype: string | null;
  attentionProfile: string | null;
  rageClickRate: number | null;
  deadClickRate: number | null;
  swipeRightRatio: number | null;
};

const CHRONOTYPES = ['morning', 'day', 'evening', 'night', 'mixed'];
const PROFILES = ['reader', 'scanner', 'voice-first', 'visual'];

/** Bag-of-evts vector with log(1+count) weighting. */
export function interestVecFrom(rows: DayRow[]): Float32Array {
  const v = new Float32Array(INTEREST_DIMS);
  for (const r of rows) {
    const b = bucket(r.evt, INTEREST_DIMS, 1);
    v[b] += Math.log1p(r.count);
  }
  return l2Normalize(v);
}

/** Bag-of-evts vector with recency-weighted counts (last 14d, linear decay). */
export function vibeEmbFrom(rows: DayRow[]): Float32Array {
  const v = new Float32Array(VIBE_DIMS);
  for (const r of rows) {
    if (r.ageDays > 14) continue;
    const decay = Math.max(0, 1 - r.ageDays / 14);
    const b = bucket(r.evt, VIBE_DIMS, 2);
    v[b] += Math.log1p(r.count) * decay;
  }
  return l2Normalize(v);
}

/** Engineered features + hashed evt tail to fill 64 dims. */
export function behaviorEmbFrom(snap: Snap, rows: DayRow[]): Float32Array {
  const v = new Float32Array(BEHAVIOR_DIMS);
  // Dims 0..4 — chronotype one-hot.
  if (snap.chronotype) {
    const idx = CHRONOTYPES.indexOf(snap.chronotype);
    if (idx >= 0) v[idx] = 1;
  }
  // Dims 5..8 — attention profile one-hot.
  if (snap.attentionProfile) {
    const idx = PROFILES.indexOf(snap.attentionProfile);
    if (idx >= 0) v[5 + idx] = 1;
  }
  // Dims 9..12 — scalar behaviors (clip 0..1).
  v[9] = Math.min(1, snap.rageClickRate ?? 0);
  v[10] = Math.min(1, snap.deadClickRate ?? 0);
  v[11] = Math.min(1, snap.swipeRightRatio ?? 0);
  v[12] = snap.rageClickRate != null && snap.rageClickRate < 0.05 ? 1 : 0; // "calm" flag
  // Dims 13..63 — hashed evt counts (51 buckets) over last 30 days.
  for (const r of rows) {
    const b = 13 + (bucket(r.evt, BEHAVIOR_DIMS - 13, 3));
    v[b] += Math.log1p(r.count);
  }
  return l2Normalize(v);
}

export class EmbeddingWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private prisma: PrismaClient) {}

  start(): void {
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[embed] tick error:', (e as Error).message);
      });
    }, INTERVAL_MS);
  }
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const actives = (await this.prisma.$queryRawUnsafe(
      `SELECT DISTINCT "uidHash" FROM "EventAggDaily" WHERE "day" >= $1 LIMIT $2`,
      since, BATCH,
    )) as Array<{ uidHash: string }>;
    let written = 0;
    for (const { uidHash } of actives) {
      try {
        const rows = (await this.prisma.$queryRawUnsafe(
          `SELECT "evt", SUM("count")::int AS count,
            EXTRACT(EPOCH FROM (NOW() - "day")) / 86400.0 AS "ageDays"
           FROM "EventAggDaily"
           WHERE "uidHash" = $1 AND "day" >= NOW() - INTERVAL '30 days'
           GROUP BY "evt", "day"`,
          uidHash,
        )) as DayRow[];
        const snapRows = (await this.prisma.$queryRawUnsafe(
          `SELECT "uidHash","chronotype","attentionProfile","rageClickRate","deadClickRate","swipeRightRatio"
           FROM "FeatureSnapshot" WHERE "uidHash" = $1`,
          uidHash,
        )) as Snap[];
        const snap = snapRows[0] || {
          uidHash, chronotype: null, attentionProfile: null,
          rageClickRate: null, deadClickRate: null, swipeRightRatio: null,
        };
        const iv = interestVecFrom(rows);
        const vb = vibeEmbFrom(rows);
        const be = behaviorEmbFrom(snap, rows);
        await this.prisma.$executeRawUnsafe(
          `UPDATE "FeatureSnapshot"
             SET "interestVec" = $2, "vibeEmb" = $3, "behaviorEmb" = $4, "computedAt" = NOW()
           WHERE "uidHash" = $1`,
          uidHash, toBuffer(iv), toBuffer(vb), toBuffer(be),
        );
        written += 1;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[embed] upsert failed:', (e as Error).message);
      }
    }
    return written;
  }
}

export const _internals = { interestVecFrom, vibeEmbFrom, behaviorEmbFrom, cosine, l2Normalize, toBuffer, fromBuffer };
