/**
 * Context-aware rewards — v6.7.
 *
 * Same proportional-credit shape as `learnerRewards.extractRewards()`, but
 * tagged with the surface (Discover / DTM / Matches / …) and hour-of-day
 * the impression occurred on. Lets the learner answer:
 *   "what does this user like RIGHT NOW on Discover at 11pm?"
 * without persisting raw events.
 *
 * Pure: no DB. Caller supplies the envelope `ctx` lifted off the event
 * that produced the outcome.
 */
import type { RewardSample, WeightKey } from './learner';
import type { Outcome, RewardObservation } from './learnerRewards';
import { extractRewards } from './learnerRewards';

export type SurfaceRewardKey = string; // `${surface}|${hourOfDay}`

export type ContextualRewardSample = RewardSample & {
  surface: string;     // sf — e.g. "discover", "dtm", "matches"; "" if unknown
  hourOfDay: number;   // 0..23; -1 if unknown
};

export type ContextualObservation = RewardObservation & {
  ctx?: {
    sf?: string;
    lh?: number;
  };
};

function bucketSurface(sf: string | undefined): string {
  if (!sf) return '';
  return sf.toLowerCase().slice(0, 32);
}
function bucketHour(lh: number | undefined): number {
  if (lh === undefined || lh === null) return -1;
  if (!Number.isFinite(lh)) return -1;
  const h = Math.floor(lh);
  if (h < 0 || h > 23) return -1;
  return h;
}

/** Tag every reward sample with its (surface, hourOfDay). */
export function extractContextualRewards(
  obs: ContextualObservation,
): ContextualRewardSample[] {
  const samples = extractRewards(obs);
  if (samples.length === 0) return [];
  const surface = bucketSurface(obs.ctx?.sf);
  const hourOfDay = bucketHour(obs.ctx?.lh);
  return samples.map((s) => ({ ...s, surface, hourOfDay }));
}

/**
 * Roll up a batch of contextual samples into per-(surface, hour) totals.
 * Output is a Map keyed by `${surface}|${hour}` → per-ingredient cumulative
 * reward + sample count. Suitable for persisting to a single JSON column
 * or a small key-value store — orders of magnitude smaller than raw events.
 */
export type SurfaceHourSummary = {
  surface: string;
  hourOfDay: number;
  byIngredient: Partial<Record<WeightKey, { reward: number; n: number }>>;
  totalReward: number;
  n: number;
};

export function rollupContextualRewards(
  samples: ContextualRewardSample[],
): Map<SurfaceRewardKey, SurfaceHourSummary> {
  const out = new Map<SurfaceRewardKey, SurfaceHourSummary>();
  for (const s of samples) {
    const key: SurfaceRewardKey = `${s.surface}|${s.hourOfDay}`;
    let row = out.get(key);
    if (!row) {
      row = { surface: s.surface, hourOfDay: s.hourOfDay, byIngredient: {}, totalReward: 0, n: 0 };
      out.set(key, row);
    }
    const cur = row.byIngredient[s.ingredient] ?? { reward: 0, n: 0 };
    cur.reward += s.reward;
    cur.n += 1;
    row.byIngredient[s.ingredient] = cur;
    row.totalReward += s.reward;
    row.n += 1;
  }
  return out;
}

/**
 * Pick the (surface, hour) bucket where the user has most net positive
 * reward. Useful for "best time to nudge on Discover" UI hints. Returns
 * null when no positive bucket exists.
 */
export function bestContextWindow(
  rollup: Map<SurfaceRewardKey, SurfaceHourSummary>,
): SurfaceHourSummary | null {
  let best: SurfaceHourSummary | null = null;
  for (const row of rollup.values()) {
    if (row.totalReward <= 0) continue;
    if (!best || row.totalReward > best.totalReward) best = row;
  }
  return best;
}

export type { Outcome };
