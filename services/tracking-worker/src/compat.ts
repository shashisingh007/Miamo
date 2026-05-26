/**
 * Pair compatibility writer.
 *
 * For each "active" uidHash (any activity in last 24h), scores compatibility
 * against a bounded candidate pool (other active uidHashes) and writes the
 * top-K rows into PairCompatCache. The discover service consumes this cache
 * to bias the ranker without recomputing per-request.
 *
 * Scoring uses only what's already in FeatureSnapshot + EventAggDaily — no
 * ML embeddings yet (those land in Phase 3 with the embedding worker).
 *
 *  finalScore = w₁·chronoOverlap + w₂·behaviorSim + w₃·priorInteractionScore
 *
 * All weights are intentionally simple and tunable via env. The cache is a
 * hint, not authority — bad scores degrade ranking quality but never break
 * the product.
 */
import type { PrismaClient } from '@prisma/client';

const INTERVAL_MS = Number(process.env.COMPAT_INTERVAL_MS || 15 * 60 * 1000);
const ACTIVE_LIMIT = Number(process.env.COMPAT_ACTIVE_LIMIT || 200);
const CANDIDATES_PER_USER = Number(process.env.COMPAT_CANDIDATES || 50);
const TOP_K = Number(process.env.COMPAT_TOPK || 20);
const W_CHRONO = Number(process.env.COMPAT_W_CHRONO || 0.35);
const W_BEHAVIOR = Number(process.env.COMPAT_W_BEHAVIOR || 0.25);
const W_PRIOR = Number(process.env.COMPAT_W_PRIOR || 0.4);

type Snap = {
  uidHash: string;
  chronotype: string | null;
  attentionProfile: string | null;
  rageClickRate: number | null;
  deadClickRate: number | null;
};

/** 1.0 same chronotype, 0.6 either mixed, 0.2 disjoint. */
export function chronoOverlap(a: string | null, b: string | null): number {
  if (!a || !b) return 0.5;
  if (a === b) return 1.0;
  if (a === 'mixed' || b === 'mixed') return 0.6;
  return 0.2;
}

/**
 * Behavioral similarity from rage + dead click rates and attention profile.
 * Two calm readers ≈ 1.0; one calm + one ragey ≈ 0.4.
 */
export function behaviorSim(a: Snap, b: Snap): number {
  const ra = a.rageClickRate ?? 0;
  const rb = b.rageClickRate ?? 0;
  const da = a.deadClickRate ?? 0;
  const db = b.deadClickRate ?? 0;
  const rageDelta = Math.abs(ra - rb);
  const deadDelta = Math.abs(da - db);
  const attnBonus = a.attentionProfile && a.attentionProfile === b.attentionProfile ? 0.2 : 0;
  // Closer rates → higher sim. Both low → small bonus.
  const base = 1 - Math.min(1, rageDelta * 4 + deadDelta * 2);
  const calm = ra < 0.05 && rb < 0.05 ? 0.1 : 0;
  return Math.max(0, Math.min(1, base + attnBonus + calm));
}

/** Compose the final score with configured weights. */
export function compose(chrono: number, behavior: number, prior: number): number {
  const raw = W_CHRONO * chrono + W_BEHAVIOR * behavior + W_PRIOR * prior;
  return Math.round(raw * 1000) / 1000;
}

export class CompatWriter {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private prisma: PrismaClient) {}

  start(): void {
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[compat] tick error:', (e as Error).message);
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
      since, ACTIVE_LIMIT,
    )) as Array<{ uidHash: string }>;
    if (actives.length < 2) return 0;

    // Load snapshots for the active pool in one shot.
    const snaps = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash","chronotype","attentionProfile","rageClickRate","deadClickRate"
       FROM "FeatureSnapshot"
       WHERE "uidHash" = ANY($1::text[])`,
      actives.map((a) => a.uidHash),
    )) as Snap[];
    const byHash = new Map<string, Snap>();
    for (const s of snaps) byHash.set(s.uidHash, s);

    // Prior-interaction signal: pull meta.targets aggregates for the active pool
    // over the last 14 days. Result is a {aHash → {bHash → count}} nested map
    // populated only for aHash ∈ actives; missing entries score 0.
    const priorRows = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash", meta->'targets' AS targets
       FROM "EventAggDaily"
       WHERE "uidHash" = ANY($1::text[])
         AND "day" >= NOW() - INTERVAL '14 days'
         AND meta ? 'targets'`,
      actives.map((a) => a.uidHash),
    )) as Array<{ uidHash: string; targets: Record<string, number> | null }>;
    const priorByHash = new Map<string, Map<string, number>>();
    for (const row of priorRows) {
      if (!row.targets) continue;
      let m = priorByHash.get(row.uidHash);
      if (!m) { m = new Map(); priorByHash.set(row.uidHash, m); }
      for (const [bHash, c] of Object.entries(row.targets)) {
        m.set(bHash, (m.get(bHash) || 0) + Number(c));
      }
    }

    let written = 0;
    for (const { uidHash: aHash } of actives) {
      const a = byHash.get(aHash);
      if (!a) continue;
      // candidate pool: other active users, capped
      const pool = actives.filter((c) => c.uidHash !== aHash).slice(0, CANDIDATES_PER_USER);
      const scored: Array<{ bHash: string; chrono: number; behavior: number; prior: number; final: number }> = [];
      const myPrior = priorByHash.get(aHash);
      for (const { uidHash: bHash } of pool) {
        const b = byHash.get(bHash);
        if (!b) continue;
        const chrono = chronoOverlap(a.chronotype, b.chronotype);
        const behavior = behaviorSim(a, b);
        const priorCount = myPrior?.get(bHash) || 0;
        // log1p scaled: 0 interactions → 0, 10 → ~0.4, 100 → ~0.7, 1k → ~1.0
        const prior = priorCount > 0 ? Math.min(1, Math.log1p(priorCount) / Math.log(1000)) : 0;
        const final = compose(chrono, behavior, prior);
        scored.push({ bHash, chrono, behavior, prior, final });
      }
      scored.sort((x, y) => y.final - x.final);
      const top = scored.slice(0, TOP_K);
      for (const row of top) {
        try {
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO "PairCompatCache"
               ("aHash","bHash","computedAt","chronoOverlap","behaviorCos","priorInteractionScore","finalScore")
             VALUES ($1, $2, NOW(), $3, $4, $5, $6)
             ON CONFLICT ("aHash","bHash") DO UPDATE SET
               "computedAt"            = NOW(),
               "chronoOverlap"         = EXCLUDED."chronoOverlap",
               "behaviorCos"           = EXCLUDED."behaviorCos",
               "priorInteractionScore" = EXCLUDED."priorInteractionScore",
               "finalScore"            = EXCLUDED."finalScore"`,
            aHash, row.bHash, row.chrono, row.behavior, row.prior, row.final,
          );
          written += 1;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[compat] upsert failed:', (e as Error).message);
        }
      }
    }
    return written;
  }
}

export const _internals = { chronoOverlap, behaviorSim, compose };
