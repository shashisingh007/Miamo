/**
 * dtmConfidenceCalibrator \u2014 DTM Phase 16 calibrated-confidence (pure).
 *
 * Combines three signals into a single 0..1 confidence:
 *   - sample size:    saturates at `targetAnswers` (default 12)
 *   - vector variance: lower = more peaked answers => higher confidence
 *   - recency:         decays linearly to half at `staleDays` (default 60)
 *
 * Different from `dtmConfidence.ts` (which weights raw counts only);
 * this helper outputs a *calibrated* value suitable for UI gating and
 * the cold-pair blender.
 */
export type DtmCalibrationInputs = {
  answeredCount: number;
  vectorVariance: number; // 0..1, higher = more inconsistent answers
  daysSinceLastAnswer: number;
  targetAnswers?: number;     // default 12
  staleDays?: number;         // default 60
};

export type DtmCalibrationResult = {
  confidence: number;          // 0..1
  components: { sampleSize: number; consistency: number; recency: number };
  tier: 'low' | 'medium' | 'high';
};

function clamp01(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 0;
  return x >= 1 ? 1 : x;
}

export function calibrateDtmConfidence(inp: DtmCalibrationInputs): DtmCalibrationResult {
  const target = Math.max(1, inp.targetAnswers ?? 12);
  const stale = Math.max(1, inp.staleDays ?? 60);

  const sampleSize = clamp01(Math.max(0, inp.answeredCount) / target);
  const consistency = clamp01(1 - Math.max(0, Math.min(1, inp.vectorVariance)));
  const days = Math.max(0, inp.daysSinceLastAnswer);
  const recency = clamp01(1 - 0.5 * (days / stale));

  // weighted geometric mean: a*b*c (penalises any single weak signal).
  const confidence = sampleSize * consistency * recency;
  const tier: 'low' | 'medium' | 'high' = confidence < 0.30 ? 'low' : confidence < 0.65 ? 'medium' : 'high';

  return {
    confidence,
    components: { sampleSize, consistency, recency },
    tier,
  };
}
