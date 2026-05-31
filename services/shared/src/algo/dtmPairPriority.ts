/**
 * dtmPairPriority \u2014 DTM Phase 17 pair-batch priority scorer.
 *
 * Given a (a, b) candidate pair the worker is about to score with
 * `dtmAffinityV6`, produce a priority in [0, 1] that the scheduler uses
 * to order the queue. Higher priority = compute sooner.
 *
 * Signals (all in [0, 1] after normalisation):
 *   recencyA / recencyB  exp(-ageHours / 48)
 *   confidenceGapA/B     1 - dtmConfidence (low-confidence pairs gain more
 *                        from a fresh recompute)
 *   coverageHarmonic     2*cA*cB / (cA+cB)   (penalises sparse pairs)
 *
 *   priority = 0.35 * recencyMin
 *            + 0.35 * confidenceGapMax
 *            + 0.30 * coverageHarmonic
 *
 * Pure & deterministic.
 */
export type DtmPairPriorityInputs = {
  lastActiveAtAMs: number;
  lastActiveAtBMs: number;
  confidenceA: number;   // 0..1
  confidenceB: number;   // 0..1
  coverageA: number;     // 0..1 (= coveredCount/16)
  coverageB: number;     // 0..1
  nowMs: number;
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

const RECENCY_HALFLIFE_HOURS = 48;

export function dtmPairPriority(inp: DtmPairPriorityInputs): number {
  const hoursA = Math.max(0, (inp.nowMs - inp.lastActiveAtAMs) / 3_600_000);
  const hoursB = Math.max(0, (inp.nowMs - inp.lastActiveAtBMs) / 3_600_000);
  const recencyA = Math.exp(-hoursA / RECENCY_HALFLIFE_HOURS);
  const recencyB = Math.exp(-hoursB / RECENCY_HALFLIFE_HOURS);
  const recencyMin = Math.min(recencyA, recencyB);

  const gapA = 1 - clamp01(inp.confidenceA);
  const gapB = 1 - clamp01(inp.confidenceB);
  const gapMax = Math.max(gapA, gapB);

  const cA = clamp01(inp.coverageA);
  const cB = clamp01(inp.coverageB);
  const harmonic = (cA + cB) > 0 ? (2 * cA * cB) / (cA + cB) : 0;

  return clamp01(0.35 * recencyMin + 0.35 * gapMax + 0.30 * harmonic);
}
