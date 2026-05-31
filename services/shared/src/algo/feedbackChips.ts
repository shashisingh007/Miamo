/**
 * v6 feedback chips → learner rewards — Phase 16 explicit feedback.
 *
 * Companion to `learnerRewards.ts`: where that module derives rewards from
 * observed outcomes, this one derives them from explicit user feedback
 * chips ("more like this", "less of this", "great match", "boring") on a
 * specific impression. Both feed `updateProfile()`.
 *
 * Chip → base reward:
 *   great_match     +0.8
 *   more_like_this  +0.5
 *   not_for_me      -0.5
 *   boring          -0.8
 *
 * Reward is split proportionally across the top-3 ingredients by absolute
 * contribution in the impression's explain breakdown. Cap at 3 so we don't
 * dilute the bandit signal across 11 nearly-equal ingredients.
 */
import type { RewardSample, WeightKey } from './learner';
import type { ExplainReport, ExplainRow } from './explain';

export type FeedbackChip = 'great_match' | 'more_like_this' | 'not_for_me' | 'boring';

const CHIP_REWARDS: Record<FeedbackChip, number> = {
  great_match:     0.8,
  more_like_this:  0.5,
  not_for_me:     -0.5,
  boring:         -0.8,
};

const KNOWN_INGREDIENTS = new Set<WeightKey>([
  'interestsOverlap', 'vibeAlignment', 'behaviouralTwinIndex',
  'reciprocalIntentScore', 'attentionFit', 'hesitationFit',
  'chronotypeOverlap', 'ageSimilarity', 'distanceFit',
  'communicationCadenceFit', 'moveStyleCompat',
]);

const TOP_K = 3;

export function chipRewards(chip: FeedbackChip, explain: ExplainReport): RewardSample[] {
  const base = CHIP_REWARDS[chip];
  if (base === 0) return [];

  const rows = explain.rows
    .filter((r): r is ExplainRow & { key: WeightKey } =>
      r.kind === 'ingredient' && KNOWN_INGREDIENTS.has(r.key as WeightKey),
    )
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, TOP_K);

  const total = rows.reduce((s, r) => s + Math.max(0, r.contribution), 0);
  if (total <= 0) return [];

  return rows.map((r) => ({
    ingredient: r.key as WeightKey,
    reward: base * (Math.max(0, r.contribution) / total),
  }));
}
