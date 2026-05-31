/**
 * dtmConfidence \u2014 DTM Phase 13 vector-confidence scalar.
 *
 * One number in [0, 1] expressing how much downstream consumers should
 * trust this user's DTM vector. Composed multiplicatively from three
 * cheap signals:
 *
 *   coverage  = coveredCount / 16                                  (linear)
 *   freshness = exp(-ageDays / 14)                                 (decay)
 *   stability = 1 - clamp01(driftScore)                            (drift)
 *
 *   confidence = coverage^0.5 * freshness * stability
 *
 * Square-root on coverage softens the slope so 8/16 still yields a useful
 * 0.71 weight, while 1/16 stays meaningfully low at 0.25.
 *
 * Pure, deterministic, no IO.
 */
export type DtmConfidenceInputs = {
  coveredCount: number;        // 0..16
  ageDays: number;             // days since last vector update
  driftScore: number;          // 0..1 from dtmDrift
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

const COVERAGE_MAX = 16;
const FRESHNESS_HALFLIFE_DAYS = 14;

export function dtmConfidence(inp: DtmConfidenceInputs): number {
  const coverage = clamp01(inp.coveredCount / COVERAGE_MAX);
  const ageDays = Math.max(0, Number.isFinite(inp.ageDays) ? inp.ageDays : 0);
  const freshness = Math.exp(-ageDays / FRESHNESS_HALFLIFE_DAYS);
  const stability = 1 - clamp01(inp.driftScore);
  const c = Math.sqrt(coverage) * freshness * stability;
  return clamp01(c);
}

/** Coarse tier label for UI / logging. */
export type DtmConfidenceTier = 'low' | 'medium' | 'high';

export function dtmConfidenceTier(c: number): DtmConfidenceTier {
  if (c >= 0.70) return 'high';
  if (c >= 0.40) return 'medium';
  return 'low';
}
