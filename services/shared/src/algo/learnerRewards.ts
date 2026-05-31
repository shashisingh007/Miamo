/**
 * v6 reward extractor — Phase 16 learner companion.
 *
 * Turns observed pair outcomes into `RewardSample`s the `updateProfile()`
 * bandit consumes. Pure: no DB. Caller supplies the observation, this
 * function returns a list of `(ingredient, reward)` pairs derived from the
 * v6 score breakdown of the impression that led to the outcome.
 *
 * Outcome → base reward:
 *   mutual_quality_chat   +1.0   (>=10 msgs over >=2d both ways)
 *   match                 +0.3   (swipe.commit_right + reciprocal)
 *   repeat_pass           -0.5   (candidate previously passed, shown again, passed again)
 *   regret                -1.0   (swipe.commit + swipe.undo within 3s)
 *   no_decision            0.0   (no signal yet — produces no samples)
 *
 * Each ingredient is credited proportionally to its weighted contribution
 * to the original score. This way the bandit learns "which ingredients
 * mattered for the good/bad outcome", not just "the user converted".
 */
import type { RewardSample, WeightKey } from './learner';
import type { ExplainReport, ExplainRow } from './explain';

export type Outcome =
  | 'mutual_quality_chat'
  | 'match'
  | 'repeat_pass'
  | 'regret'
  | 'no_decision';

export type RewardObservation = {
  outcome: Outcome;
  explain: ExplainReport;
};

const OUTCOME_REWARDS: Record<Outcome, number> = {
  mutual_quality_chat:  1.0,
  match:                0.3,
  repeat_pass:         -0.5,
  regret:              -1.0,
  no_decision:          0.0,
};

const KNOWN_INGREDIENTS = new Set<WeightKey>([
  'interestsOverlap', 'vibeAlignment', 'behaviouralTwinIndex',
  'reciprocalIntentScore', 'attentionFit', 'hesitationFit',
  'chronotypeOverlap', 'ageSimilarity', 'distanceFit',
  'communicationCadenceFit', 'moveStyleCompat',
]);

/** Extract a list of per-ingredient reward samples for one observation. */
export function extractRewards(obs: RewardObservation): RewardSample[] {
  const base = OUTCOME_REWARDS[obs.outcome];
  if (base === 0) return [];

  const ingredientRows = obs.explain.rows.filter(
    (r): r is ExplainRow & { key: WeightKey } =>
      r.kind === 'ingredient' && KNOWN_INGREDIENTS.has(r.key as WeightKey),
  );

  // Total positive contribution (denominator for proportional credit).
  const totalContrib = ingredientRows.reduce((s, r) => s + Math.max(0, r.contribution), 0);
  if (totalContrib <= 0) return [];

  return ingredientRows.map((r) => ({
    ingredient: r.key as WeightKey,
    reward: base * (Math.max(0, r.contribution) / totalContrib),
  }));
}

/** Convenience: extract + aggregate across many observations into one
 *  cumulative sample list (same ingredient may appear multiple times,
 *  which is what `updateProfile()` expects). */
export function extractBatch(obs: RewardObservation[]): RewardSample[] {
  const out: RewardSample[] = [];
  for (const o of obs) out.push(...extractRewards(o));
  return out;
}
