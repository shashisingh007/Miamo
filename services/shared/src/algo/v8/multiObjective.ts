/**
 * v8 multi-objective Discover ranking — pure compose() wrapper.
 *
 * Combines five objectives (relevance, earnedVisibility, fairness,
 * recencyFreshness, intentFitRightNow) into a single 0..1 score for in-pool
 * ranking. Uses the canonical compose() from algo/math.ts so null signals
 * (e.g. cold-start intent) drop cleanly and remaining weights renormalise.
 *
 * Spec: DESIGN_SECTION_B_exposure_and_ranking.md §B.7.
 *
 * v3.7 Temporal Learning v2 — when the flag ALGO_V9_TEMPORAL_LEARNING_ENABLED
 * is on, callers may supply an additional `noveltyDemand` ingredient
 * (weight 0.05) and a `driftDampen` factor applied post-compose. Neither
 * changes the score when the flag is off. See docs/architecture/
 * v9-temporal-learning.md for the mechanism.
 */

import { compose, clip01 } from '../math';
import {
  v9TemporalLearningEnabled,
  v9ProfileHealthEnabled,
  v9RepeatOffenderEnabled,
} from '../flags';

/** Per-candidate objective payload. All terms ∈ [0,1] except intent which may be null. */
export interface MultiObjectiveInput {
  /** Normalised forYouV6 score; 0..1. */
  relevance: number;
  /** Additive earned-visibility boost from the exposure ledger. Convention: 0..0.2 — the §B.7.2 ev_norm. */
  earnedVisibilityBoost: number;
  /** Post-Singh-Joachims fairness floor; 0..1. 1.0 = "below fair share" → boost. */
  fairnessFloor: number;
  /** exp-decay of candidate-last-active; 0..1. */
  recencyFreshness: number;
  /** V7 right-now-intent signal; 0..1, or null if no signal. compose() drops it. */
  intentFitRightNow: number | null;
  /**
   * v9 novelty demand ingredient. When the temporal-learning flag is on and
   * this value is non-null, it participates in compose() with weight
   * V9_NOVELTY_WEIGHT. When the flag is off, the value is ignored — the
   * v8 weight simplex remains unchanged.
   */
  noveltyDemand?: number | null;
  /**
   * v9 drift-dampening factor for this candidate. In [0,1]. Applied as a
   * multiplicative post-compose factor:
   *   score * (1 - driftMagnitude * V9_DRIFT_DAMPEN_STRENGTH)
   * A cooling drift on this candidate's dimension yields a small
   * subtractive nudge — never more than V9_DRIFT_DAMPEN_STRENGTH × 1
   * = 15% of the pre-drift score.
   */
  driftDampen?: number | null;
  /**
   * v9 Phase E — per-candidate profile-health penalty ∈ [0, 0.3] from
   * `v9/profileHealth`. When `ALGO_V9_PROFILE_HEALTH_ENABLED=1` it
   * participates as a small negative ingredient (weight
   * V9_PROFILE_HEALTH_WEIGHT). When the flag is off, the value is
   * ignored and the ranker output is unchanged.
   */
  profileHealthPenalty?: number | null;
  /**
   * v9 Phase E — per-candidate multiplicative dampener from
   * `v9/repeatOffenderDetector` in [DAMPENER_FLOOR, 1.0]. Applied to the
   * final composed score AFTER driftDampen when
   * `ALGO_V9_REPEAT_OFFENDER_ENABLED=1`. When the flag is off, the value
   * is ignored.
   */
  repeatOffenderDampen?: number | null;
}

/** Discover-surface weights. Sum must equal 1.0 (asserted by unit test). */
export const MO_WEIGHTS = {
  relevance: 0.55,             // because [DESIGN §B.7.3 Discover row]: relevance dominates; other terms shape the tail. (Discover weights, not DTM.)
  earnedVisibility: 0.15,      // because [DESIGN §B.7.3]: earn-credit boost is meaningful but bounded — must not let exposure overwhelm match quality.
  fairness: 0.10,              // because [DESIGN §B.7.3 + SJ §5.2]: fairness is a floor, not a ceiling — the rerank is the primary corrective; this just keeps it in the score.
  recencyFreshness: 0.10,      // because [DESIGN §B.7.3]: stale candidates demoted gently; not zeroed out (dormant detection lives in eligibility filter, §B.6.4 #1).
  intentFitRightNow: 0.10,     // because [DESIGN §B.7.3]: real-time signal is additive, not dominant — the right-now bias must not overwhelm the long-term match.
} as const;

/**
 * v9 novelty-demand ingredient weight. When the flag is on, this weight
 * is added to the compose() basis and the other five are renormalised
 * to still sum to 1.0. When off, MO_WEIGHTS is used as-is.
 */
export const V9_NOVELTY_WEIGHT = 0.05;

/**
 * v9 drift-dampen strength. Applied as `score *= 1 - drift*strength`.
 * A drift magnitude of 1.0 with strength 0.15 removes 15% of the raw
 * score for that candidate — noticeable but small enough to be
 * over-ridden by a strong relevance / intent signal.
 */
export const V9_DRIFT_DAMPEN_STRENGTH = 0.15;

/**
 * v9 Phase E — profile-health penalty weight. When
 * `ALGO_V9_PROFILE_HEALTH_ENABLED=1`, this weight is added to the compose
 * basis as a negative-valued ingredient (contribution = 1 - penalty so
 * higher-health profiles contribute more to the score). Off by default;
 * ranker output is unchanged when the flag is off.
 */
export const V9_PROFILE_HEALTH_WEIGHT = 0.05;

/**
 * Score a candidate via the weighted compose. Returns 0..1.
 *
 * compose() handles a null intentFitRightNow by dropping its weight and
 * renormalising the remaining four — so a cold-start user with no intent
 * signal still gets a sensible score.
 *
 * When the v9 flag is ON, `noveltyDemand` (if non-null) is added to the
 * basis with weight V9_NOVELTY_WEIGHT and the other weights are shrunk
 * uniformly so the simplex still sums to 1.0. `driftDampen` (if non-null)
 * is applied as a post-compose multiplicative factor.
 */
export function scoreMultiObjective(input: MultiObjectiveInput): number {
  const v9 = v9TemporalLearningEnabled();
  const v9ProfileHealth = v9ProfileHealthEnabled();
  const v9RepeatOffender = v9RepeatOffenderEnabled();

  // Build the breakdown in the shape compose() expects (one entry per
  // weight key). Clip each non-null term to [0,1] so out-of-spec callers
  // don't smuggle values >1.
  const breakdown: Record<string, number | null> = {
    relevance: clip01(input.relevance),
    earnedVisibility: clip01(input.earnedVisibilityBoost),
    fairness: clip01(input.fairnessFloor),
    recencyFreshness: clip01(input.recencyFreshness),
    intentFitRightNow:
      input.intentFitRightNow == null ? null : clip01(input.intentFitRightNow),
  };

  let weights: Record<string, number> = MO_WEIGHTS as unknown as Record<string, number>;

  if (v9) {
    // Add noveltyDemand to the basis. The pattern: shrink the existing
    // weights by (1 - V9_NOVELTY_WEIGHT) so the total across the six
    // ingredients still sums to 1.0.
    const shrink = 1 - V9_NOVELTY_WEIGHT;
    weights = {
      relevance:         MO_WEIGHTS.relevance         * shrink,
      earnedVisibility:  MO_WEIGHTS.earnedVisibility  * shrink,
      fairness:          MO_WEIGHTS.fairness          * shrink,
      recencyFreshness:  MO_WEIGHTS.recencyFreshness  * shrink,
      intentFitRightNow: MO_WEIGHTS.intentFitRightNow * shrink,
      noveltyDemand:     V9_NOVELTY_WEIGHT,
    };
    breakdown.noveltyDemand =
      input.noveltyDemand == null ? null : clip01(input.noveltyDemand);
  }

  // v9 Phase E — profileHealth ingredient. Same shrink pattern as noveltyDemand
  // so the total weight simplex still sums to 1.0. Only fires when the flag is
  // ON AND the caller supplied a non-null penalty. When off (default), the
  // shape of `weights` is untouched — bit-identical to prior version.
  if (v9ProfileHealth && input.profileHealthPenalty != null) {
    const shrink = 1 - V9_PROFILE_HEALTH_WEIGHT;
    const shrunk: Record<string, number> = {};
    for (const [k, w] of Object.entries(weights)) shrunk[k] = w * shrink;
    shrunk.profileHealth = V9_PROFILE_HEALTH_WEIGHT;
    weights = shrunk;
    // Contribution: penalty is in [0, 0.3]; the ingredient contribution is
    // `1 - penalty/0.3` so a "perfect" profile contributes 1 and the worst
    // contributes 0. // because: keeps the ingredient in the standard [0,1]
    // basis the compose() helper expects.
    const p = clip01(input.profileHealthPenalty / 0.3);
    breakdown.profileHealth = clip01(1 - p);
  }

  // compose() returns [0,1]; multiply at the call site if a 0..100 surface is wanted.
  let raw = compose(breakdown, weights);

  if (v9 && input.driftDampen != null) {
    // Multiplicative drift dampener; clip to [0,1]. See V9_DRIFT_DAMPEN_STRENGTH.
    const dampen = 1 - clip01(input.driftDampen) * V9_DRIFT_DAMPEN_STRENGTH;
    raw = clip01(raw * dampen);
  }

  // v9 Phase E — repeat-offender multiplicative dampener. Applied AFTER
  // drift-dampen so the two effects compose commutatively. Flag-gated and
  // no-op when the caller passes null.
  if (v9RepeatOffender && input.repeatOffenderDampen != null) {
    // repeatOffenderDampen is already ∈ [DAMPENER_FLOOR, 1.0] by contract
    // but defensively clip anyway.
    const damp = clip01(input.repeatOffenderDampen);
    raw = clip01(raw * damp);
  }

  return raw;
}

/**
 * Sum of all weights. Exposed for the unit test that asserts the weights are
 * a valid probability simplex (sum == 1.0 within float epsilon).
 */
export function weightsSum(): number {
  let s = 0;
  for (const v of Object.values(MO_WEIGHTS)) s += v;
  return s;
}
