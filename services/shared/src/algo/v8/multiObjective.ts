/**
 * v8 multi-objective Discover ranking — pure compose() wrapper.
 *
 * Combines five objectives (relevance, earnedVisibility, fairness,
 * recencyFreshness, intentFitRightNow) into a single 0..1 score for in-pool
 * ranking. Uses the canonical compose() from algo/math.ts so null signals
 * (e.g. cold-start intent) drop cleanly and remaining weights renormalise.
 *
 * Spec: DESIGN_SECTION_B_exposure_and_ranking.md §B.7.
 */

import { compose, clip01 } from '../math';

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
 * Score a candidate via the weighted compose. Returns 0..1.
 *
 * compose() handles a null intentFitRightNow by dropping its weight and
 * renormalising the remaining four — so a cold-start user with no intent
 * signal still gets a sensible score.
 */
export function scoreMultiObjective(input: MultiObjectiveInput): number {
  // Build the breakdown in the shape compose() expects (one entry per
  // weight key). Clip each non-null term to [0,1] so out-of-spec callers
  // don't smuggle values >1.
  const breakdown = {
    relevance: clip01(input.relevance),
    earnedVisibility: clip01(input.earnedVisibilityBoost),
    fairness: clip01(input.fairnessFloor),
    recencyFreshness: clip01(input.recencyFreshness),
    intentFitRightNow:
      input.intentFitRightNow == null ? null : clip01(input.intentFitRightNow),
  };
  // compose() returns [0,1]; multiply at the call site if a 0..100 surface is wanted.
  return compose(breakdown, MO_WEIGHTS as unknown as Record<string, number>);
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
