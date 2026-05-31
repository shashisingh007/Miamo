/**
 * Learner loop — v6.5.
 *
 * Periodically reads recent reward signals per (uidHash, surface) and
 * runs `learner.updateProfile()` to update each user's
 * `UserWeightProfile` row. Pure update logic lives in
 * `services/shared/src/algo/learner.ts`; this file is the I/O wrapper.
 *
 * Reward mapping (current scope: `discover` surface only):
 *   +0.30  swipe.right    -> attribute reward to interestsOverlap (proxy)
 *   +1.00  match.created  -> reward across all ingredients
 *   -0.50  swipe.repeat_pass -> negative reward
 *   -1.00  swipe.regret   -> strong negative reward
 *   -1.00  safety.block / safety.report -> hard negative
 *
 * The mapping is intentionally simple for v6.5: real per-ingredient
 * attribution requires the v6 ranker to log which ingredients
 * contributed most to each impression, which is a separate v7 piece.
 *
 * Default-OFF: set LEARNER_LOOP_ENABLED=1 to start the loop. Caps at
 * `LEARNER_LOOP_BATCH` users per tick to bound DB load.
 */
import type { PrismaClient } from '@prisma/client';
import {
  defaultProfile,
  updateProfile,
  type UserWeightProfile,
  type RewardSample,
  type WeightKey,
} from '../../shared/src/algo/learner';

const INTERVAL_MS = Number(process.env.LEARNER_LOOP_INTERVAL_MS || 10 * 60 * 1000);
const LOOKBACK_DAYS = Number(process.env.LEARNER_LOOP_LOOKBACK_DAYS || 1);
const BATCH = Number(process.env.LEARNER_LOOP_BATCH || 500);
const SURFACE = process.env.LEARNER_LOOP_SURFACE || 'discover';
const ENABLED = process.env.LEARNER_LOOP_ENABLED === '1';

const REWARD_MAP: Record<string, { reward: number; ingredient: WeightKey }> = {
  'swipe.right':       { reward:  0.30, ingredient: 'interestsOverlap'      },
  'match.created':     { reward:  1.00, ingredient: 'reciprocalIntentScore' },
  'swipe.repeat_pass': { reward: -0.50, ingredient: 'repeatPassRate' as WeightKey }, // mapped below
  'swipe.regret':      { reward: -1.00, ingredient: 'hesitationFit'         },
  'safety.block':      { reward: -1.00, ingredient: 'behaviouralTwinIndex'  },
  'safety.report':     { reward: -1.00, ingredient: 'behaviouralTwinIndex'  },
};

// `repeatPassRate` is not a WeightKey — re-map to the closest valid key.
REWARD_MAP['swipe.repeat_pass'].ingredient = 'interestsOverlap';

export type RewardEventRow = {
  uidHash: string;
  evt: string;
  count: number;
};

/** Pure helper: turn a list of (evt, count) rows into RewardSamples per
 *  uidHash. Each row produces `count` samples of the same kind, capped
 *  per-event at 200 to bound bandit posterior shift per tick. */
export function foldRewardSamples(
  rows: RewardEventRow[],
  capPerEvent = 200,
): Map<string, RewardSample[]> {
  const out = new Map<string, RewardSample[]>();
  for (const r of rows) {
    const m = REWARD_MAP[r.evt];
    if (!m) continue;
    const n = Math.min(r.count, capPerEvent);
    const arr = out.get(r.uidHash) || [];
    for (let i = 0; i < n; i += 1) arr.push({ ingredient: m.ingredient, reward: m.reward });
    out.set(r.uidHash, arr);
  }
  return out;
}

type RawProfileRow = {
  uidHash: string;
  surface: string;
  weights: Record<string, number> | null;
  noveltyBoost: number | null;
  diversityBoost: number | null;
  explorationRate: number | null;
  banditAlpha: Record<string, number> | null;
  banditBeta: Record<string, number> | null;
};

/** Coerce a raw DB row into a UserWeightProfile, falling back to
 *  `defaultProfile()` for any missing field. Pure. */
export function profileFromRow(row: RawProfileRow | null): UserWeightProfile {
  const def = defaultProfile();
  if (!row) return def;
  const merged: UserWeightProfile = {
    weights:         { ...def.weights,      ...((row.weights || {}) as Record<WeightKey, number>) },
    noveltyBoost:    row.noveltyBoost    ?? def.noveltyBoost,
    diversityBoost:  row.diversityBoost  ?? def.diversityBoost,
    explorationRate: row.explorationRate ?? def.explorationRate,
    banditAlpha:     { ...def.banditAlpha,  ...((row.banditAlpha || {}) as Record<WeightKey, number>) },
    banditBeta:      { ...def.banditBeta,   ...((row.banditBeta  || {}) as Record<WeightKey, number>) },
  };
  return merged;
}

export class LearnerLoop {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private prisma: PrismaClient) {}

  start(): void {
    if (!ENABLED) return;
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[learner-loop] tick error:', (e as Error).message);
      });
    }, INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<number> {
    // Pull recent reward events.
    const evtNames = Object.keys(REWARD_MAP);
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash","evt", SUM("count")::int AS "count"
       FROM "EventAggDaily"
       WHERE "evt" = ANY($1::text[])
         AND "day" >= NOW() - ($2 || ' days')::interval
       GROUP BY "uidHash","evt"
       LIMIT $3`,
      evtNames, String(LOOKBACK_DAYS), BATCH * evtNames.length,
    )) as RewardEventRow[];

    const samplesByUser = foldRewardSamples(rows);
    if (samplesByUser.size === 0) return 0;

    const uidHashes = [...samplesByUser.keys()].slice(0, BATCH);
    const existing = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash","surface","weights","noveltyBoost","diversityBoost",
              "explorationRate","banditAlpha","banditBeta"
       FROM "UserWeightProfile"
       WHERE "uidHash" = ANY($1::text[]) AND "surface" = $2`,
      uidHashes, SURFACE,
    )) as RawProfileRow[];
    const byKey = new Map<string, RawProfileRow>();
    for (const r of existing) byKey.set(r.uidHash, r);

    let written = 0;
    for (const uidHash of uidHashes) {
      const samples = samplesByUser.get(uidHash) || [];
      if (samples.length === 0) continue;
      const prev = profileFromRow(byKey.get(uidHash) ?? null);
      const next = updateProfile(prev, samples);
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "UserWeightProfile"
           ("uidHash","surface","weights","noveltyBoost","diversityBoost",
            "explorationRate","banditAlpha","banditBeta","schemaVersion","lastUpdatedAt")
         VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7::jsonb,$8::jsonb,1, NOW())
         ON CONFLICT ("uidHash","surface") DO UPDATE SET
           "weights"         = EXCLUDED."weights",
           "noveltyBoost"    = EXCLUDED."noveltyBoost",
           "diversityBoost"  = EXCLUDED."diversityBoost",
           "explorationRate" = EXCLUDED."explorationRate",
           "banditAlpha"     = EXCLUDED."banditAlpha",
           "banditBeta"      = EXCLUDED."banditBeta",
           "lastUpdatedAt"   = NOW()`,
        uidHash, SURFACE,
        JSON.stringify(next.weights), next.noveltyBoost, next.diversityBoost,
        next.explorationRate,
        JSON.stringify(next.banditAlpha), JSON.stringify(next.banditBeta),
      );
      written += 1;
    }
    return written;
  }
}

export const _internals = { foldRewardSamples, profileFromRow, REWARD_MAP };
