/**
 * Phase 16 — outcome aggregator.
 *
 * Folds a stream of raw observations (impression + outcome) into the
 * `RewardSample[]` batch consumed by `updateProfile`. Caller fetches
 * observations from the events stream once per learner tick; this module
 * does the proportional credit math and outcome de-duplication.
 */
import type { RewardSample, WeightKey } from './learner';
import { extractRewards, type Outcome, type RewardObservation } from './learnerRewards';

/** Observation enriched with an impressionId so we can de-duplicate replays. */
export type ImpressionObs = RewardObservation & { impressionId: string };

export type AggregatedRewards = {
  samples: RewardSample[];
  outcomeCounts: Record<Outcome, number>;
  totalReward: number;
  impressionsConsidered: number;
};

/**
 * Deduplicate by impressionId (keep first occurrence — server-side ordering
 * is monotonic so the first arrival is the canonical one), drop unresolved
 * impressions (`no_decision`), and compute proportional rewards per ingredient.
 */
export function aggregateOutcomes(obs: ImpressionObs[]): AggregatedRewards {
  const seen = new Set<string>();
  const samples: RewardSample[] = [];
  const counts: Record<Outcome, number> = {
    mutual_quality_chat: 0, match: 0, repeat_pass: 0, regret: 0, no_decision: 0,
  };
  let total = 0;
  let considered = 0;

  for (const o of obs) {
    if (seen.has(o.impressionId)) continue;
    seen.add(o.impressionId);
    counts[o.outcome] = (counts[o.outcome] ?? 0) + 1;
    if (o.outcome === 'no_decision') continue;
    considered += 1;
    const rs = extractRewards(o);
    for (const s of rs) {
      samples.push(s);
      total += s.reward;
    }
  }

  return { samples, outcomeCounts: counts, totalReward: total, impressionsConsidered: considered };
}

/**
 * Per-ingredient summary: net reward and sample count. Useful for diagnostics
 * dashboards ("which ingredient is moving learner weights the most this hour?").
 */
export function summariseByIngredient(samples: RewardSample[]): Record<WeightKey, { count: number; net: number }> {
  const out: Partial<Record<WeightKey, { count: number; net: number }>> = {};
  for (const s of samples) {
    const cur = out[s.ingredient] ?? { count: 0, net: 0 };
    cur.count += 1;
    cur.net += s.reward;
    out[s.ingredient] = cur;
  }
  return out as Record<WeightKey, { count: number; net: number }>;
}
