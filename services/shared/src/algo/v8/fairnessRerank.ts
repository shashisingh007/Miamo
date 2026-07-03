/**
 * v8 Singh-Joachims fairness rerank — post-hoc adjacent-swap.
 *
 * Singh, A. & Joachims, T. (2018). "Fairness of Exposure in Rankings." KDD 2018,
 * arxiv:1802.07281. §5.2 post-hoc rerank simplification: given a top-N list
 * from the primary ranker, swap adjacent pairs greedily as long as each swap
 * (a) does not reduce relevance below a margin δ and (b) reduces cumulative
 * exposure disparity. We bound iterations and use a Gini-coefficient target as
 * the disparity measure (gender-conditional, per [MARKET_SCAN §5 India]).
 *
 * Pure module — caller passes in candidates with their forward score and
 * trailing-7d exposure count. Deterministic.
 *
 * Spec: DESIGN_SECTION_B_exposure_and_ranking.md §B.8.
 */

/** Per-candidate fairness payload the rerank operates on. */
export interface FairnessCandidate {
  /** Stable hashed user id. */
  targetHash: string;
  /** Primary-ranker forward score; relative magnitude matters, absolute units do not. */
  score: number;
  /** Trailing-7d impressions count on the surface being reranked. */
  exposureCountLast7d: number;
  /** Self-declared gender bucket for the gender-conditional Gini split. */
  gender?: 'm' | 'f' | 'o' | null;
}

/** Tunable knobs for the rerank. Constants below carry the rationale. */
export interface FairnessConfig {
  /** Gini target per gender bucket (m/f). 0..1 — lower = more equal. */
  giniTargetPerGender: number;
  /** Gini target for the 'other' bucket. Looser because the population is smaller and the estimator noisier. */
  giniTargetOther: number;
  /** How many top candidates to rerank. The rest pass through unchanged. */
  topN: number;
  /** Max relative score drop allowed for an adjacent swap. */
  swapDelta: number;
  /** Hard iteration cap so the loop is bounded even on degenerate inputs. */
  maxIterations: number;
}

export const DEFAULT_FAIRNESS_CONFIG: FairnessConfig = {
  giniTargetPerGender: 0.40,         // because [DESIGN §B.8.3]: gender-conditional Gini ≤ 0.40 per gender (m/f).
  giniTargetOther: 0.45,             // because [DESIGN §B.8.3]: the 'other' bucket is smaller, so its Gini estimator is noisier; 0.45 is the looser threshold.
  topN: 50,                          // because [DESIGN §B.8.2, SJ §6]: rerank cost O(N²); 50 is the elbow on the utility-vs-fairness curve in the SJ experiments.
  swapDelta: 0.05,                   // because [DESIGN §B.8.2]: never swap two candidates whose scores differ by more than 5% — protects against fairness washing out the relevance signal.
  maxIterations: 100,                // because [DESIGN §B.8.2]: practical convergence is ≤3 passes; 100 is the hard safety bound to ensure determinism on pathological inputs.
};

/**
 * Standard Gini coefficient on a non-empty array of non-negative values.
 *
 * Definition: G = (Σ_i Σ_j |x_i - x_j|) / (2 n Σ_i x_i). Equivalent (and
 * numerically simpler) sort-based form is used here: with the values sorted
 * ascending, G = (Σ_i (2i - n - 1) x_i) / (n Σ_i x_i), where i is 1-indexed.
 *
 * Returns 0 for an empty array, an all-zeros array, or a single-value array
 * (perfect equality has no meaning with n<2; we return 0 by convention).
 */
export function computeGini(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let sum = 0;
  for (const v of values) {
    if (v < 0) return 0; // because [DESIGN §B.8]: Gini is defined on non-negative values; defensive fallback rather than NaN propagation.
    sum += v;
  }
  if (sum === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  let weighted = 0;
  for (let i = 0; i < n; i++) {
    // i is 0-indexed; the formula's i is 1-indexed → (2*(i+1) - n - 1) = (2i + 1 - n).
    weighted += (2 * i + 1 - n) * sorted[i];
  }
  return weighted / (n * sum);
}

/**
 * Compute the gender-conditional Gini for trailing-7d exposure across the
 * input candidate set. Buckets with fewer than 2 candidates return 0.
 */
export function genderConditionalGini(
  candidates: readonly FairnessCandidate[],
): { m: number; f: number; o: number } {
  const m: number[] = [];
  const f: number[] = [];
  const o: number[] = [];
  for (const c of candidates) {
    if (c.gender === 'm') m.push(c.exposureCountLast7d);
    else if (c.gender === 'f') f.push(c.exposureCountLast7d);
    else if (c.gender === 'o') o.push(c.exposureCountLast7d);
    // null/undefined gender is excluded from the per-gender stat by design —
    // the audit job tracks the unknown-gender bucket separately.
  }
  return {
    m: computeGini(m),
    f: computeGini(f),
    o: computeGini(o),
  };
}

/**
 * Adjacent-swap fairness rerank over the top-N of `candidates`.
 *
 * Algorithm (Singh-Joachims 2018 §5.2 with Gini disparity):
 *   1. Slice the top-N candidates; tail passes through unchanged.
 *   2. Repeat until no swap improves disparity (or maxIterations):
 *      For each adjacent pair (i, i+1) in the top-N:
 *        Compute the gender-conditional Gini *before* and *after* swapping.
 *        Compute the relative score loss of demoting the higher-score candidate.
 *        Swap iff: after-Gini < before-Gini  AND  relative score loss ≤ swapDelta.
 *   3. Return the (possibly reordered) top-N concatenated with the unchanged tail.
 *
 * The function never mutates the input array. It is deterministic: ties in
 * Gini-improvement-ties resolve by *not* swapping (preserves stability).
 */
export function fairnessRerank(
  candidates: readonly FairnessCandidate[],
  config: FairnessConfig = DEFAULT_FAIRNESS_CONFIG,
): FairnessCandidate[] {
  if (candidates.length === 0) return [];
  const n = Math.min(config.topN, candidates.length);
  const top = candidates.slice(0, n);
  const tail = candidates.slice(n);

  // Pre-compute the "before" Gini once per pass; recompute only after a swap.
  let improved = true;
  let iter = 0;
  while (improved && iter < config.maxIterations) {
    improved = false;
    iter += 1;
    for (let i = 0; i < top.length - 1; i++) {
      const a = top[i];
      const b = top[i + 1];
      // Same-gender swap can't change the gender-conditional Gini → skip the
      // expensive recomputation. (a is always the higher-score side in score-
      // sorted input; we don't assume the input is sorted, only that we may
      // demote it.)
      if ((a.gender ?? null) === (b.gender ?? null)) continue;

      // Compute relative score loss of pushing a down by one position.
      // Use abs(a.score) + ε in the denominator so a zero-score primary
      // ranker doesn't blow up.
      const denom = Math.max(Math.abs(a.score), 1e-9);
      const relLoss = (a.score - b.score) / denom;
      if (relLoss > config.swapDelta) continue;

      const beforeG = genderConditionalGini(top);
      // Swap in-place, measure, swap back if not helpful. Cheaper than copying.
      [top[i], top[i + 1]] = [top[i + 1], top[i]];
      const afterG = genderConditionalGini(top);

      // Aggregate over gender buckets that exceed their target — fairness
      // wins only if the total over-target distance shrinks.
      const beforeOver = overTarget(beforeG, config);
      const afterOver = overTarget(afterG, config);

      if (afterOver < beforeOver) {
        improved = true;
        // keep the swap
      } else {
        // Revert.
        [top[i], top[i + 1]] = [top[i + 1], top[i]];
      }
    }
  }
  return top.concat(tail);
}

/**
 * Sum the per-gender Gini-over-target distance. Returns 0 if every bucket is
 * at-or-below its target. Used as the swap-acceptance objective.
 */
function overTarget(g: { m: number; f: number; o: number }, config: FairnessConfig): number {
  return (
    Math.max(0, g.m - config.giniTargetPerGender) +
    Math.max(0, g.f - config.giniTargetPerGender) +
    Math.max(0, g.o - config.giniTargetOther)
  );
}
