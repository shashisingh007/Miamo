/**
 * v9 Temporal Learning — boredom predictor.
 *
 * Pure module. Given a trailing window of impression records (dwell time
 * and timestamp), fits a simple linear regression of `dwellMs` vs time
 * and returns:
 *
 *   - `slope`               — dwellMs per millisecond of elapsed time.
 *                             Negative means dwell is trending down.
 *   - `boredomProbability`  — [0,1]. Higher when the slope is negative
 *                             AND the fit is statistically meaningful
 *                             (approximate one-tailed t-test using R²).
 *   - `confidence`          — [0,1]. Low when < BOREDOM_MIN_SAMPLES;
 *                             scales with sample count and R² thereafter.
 *
 * Contract (per D.5 spec):
 *   - "Negative slope with p < 0.1 → boredom probability high."
 *   - "Below 20 samples → confidence = 0."
 *
 * Statistical primer:
 *   For a linear regression y = a + b·x with n observations,
 *   R² = SSR / SST (where SST is total sum of squares, SSR regression).
 *   A cheap-and-cheerful proxy for the one-tailed p-value of "b < 0" is:
 *     - t = b / se(b), where se(b) = sqrt((1-R²)*SST / ((n-2)*Sxx))
 *     - approximate p from t via a normal-tail expansion (n-2 large).
 *   We're not doing precise statistics — the ranker needs a monotone
 *   score in [0,1], and this delivers one that reacts sensibly to
 *   sample count, slope magnitude, and noise. Details in the tests.
 */
import { clip01 } from '../math';

export interface BoredomImpression {
  dwellMs: number;
  timestamp: Date;
}

export interface BoredomResult {
  boredomProbability: number;
  slope: number;                 // ms of dwell change per ms of time
  confidence: number;
}

/** Minimum sample count for a non-zero confidence. */
export const BOREDOM_MIN_SAMPLES = 20;

/**
 * Sample count for full confidence (assuming a decent R²). Below this,
 * confidence scales linearly from BOREDOM_MIN_SAMPLES.
 */
export const BOREDOM_CONFIDENCE_CAP = 40;

// ─── Pure implementation ────────────────────────────────────────────────────

/**
 * Approximate the two-tailed normal CDF for large-df t statistic.
 * Used to translate |t| → probability the slope is not zero.
 *
 * Abramowitz-Stegun 26.2.17. Accurate to ~7.5e-8 for |x| ≤ 3.
 */
function stdNormalCdf(x: number): number {
  // erfc-based rational approximation.
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

/**
 * Predict boredom from a trailing window of impressions.
 *
 * Empty / undersized windows: probability = 0.5 (uninformative), slope = 0,
 * confidence = 0. Callers should ignore signals with confidence == 0.
 *
 * Numeric guarantees:
 *   - All outputs finite.
 *   - `boredomProbability`, `confidence` ∈ [0,1].
 */
export function predictBoredom(impressions: readonly BoredomImpression[]): BoredomResult {
  const n = impressions.length;
  if (n < 2) {
    return { boredomProbability: 0.5, slope: 0, confidence: 0 };
  }
  // Rebase timestamps to milliseconds since the first observation for
  // numerical stability. Then use a simple OLS closed form.
  const t0 = impressions[0].timestamp.getTime();
  let sumX = 0, sumY = 0;
  for (const im of impressions) {
    sumX += im.timestamp.getTime() - t0;
    sumY += Number.isFinite(im.dwellMs) ? im.dwellMs : 0;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  let ssXX = 0, ssXY = 0, ssYY = 0;
  for (const im of impressions) {
    const dx = im.timestamp.getTime() - t0 - meanX;
    const dy = (Number.isFinite(im.dwellMs) ? im.dwellMs : 0) - meanY;
    ssXX += dx * dx;
    ssXY += dx * dy;
    ssYY += dy * dy;
  }
  if (ssXX === 0) {
    // All timestamps identical — no signal.
    return { boredomProbability: 0.5, slope: 0, confidence: 0 };
  }
  const slope = ssXY / ssXX;
  // R² = 1 - SSE/SST, where SSE = ssYY - slope*ssXY = ssYY - slope²*ssXX
  const sse = Math.max(0, ssYY - slope * ssXY);
  const r2 = ssYY > 0 ? Math.max(0, Math.min(1, 1 - sse / ssYY)) : 0;

  // Below the sample floor, confidence is zero — bail early, but still
  // return the fitted slope for observability.
  if (n < BOREDOM_MIN_SAMPLES) {
    return { boredomProbability: 0.5, slope, confidence: 0 };
  }

  // Approximate t statistic: t = slope / se(slope).
  // se(slope) = sqrt( sse / (n-2) / ssXX ). Guard against divide-by-zero.
  let boredomProbability: number;
  if (sse <= 0 || n <= 2) {
    // Perfectly linear fit or too few points → probability is entirely
    // determined by slope sign.
    boredomProbability = slope < 0 ? 1 : slope > 0 ? 0 : 0.5;
  } else {
    const se = Math.sqrt(sse / (n - 2) / ssXX);
    const t = se > 0 ? slope / se : 0;
    // One-tailed probability that slope < 0: P(T < t) under H0 slope=0.
    // With large n we approximate T ~ N(0,1). For negative t this is
    // small (< 0.5) meaning "unlikely slope is >= 0" → boredom.
    // We want a number in [0,1] where 1 = "definitely bored".
    // Translate:  boredom = 1 - stdNormalCdf(t)
    //   t << 0  → cdf ≈ 0 → boredom ≈ 1
    //   t == 0  → cdf = 0.5 → boredom = 0.5
    //   t >> 0  → cdf ≈ 1 → boredom ≈ 0
    boredomProbability = clip01(1 - stdNormalCdf(t));
  }

  const sampleFactor = Math.min(
    1,
    Math.max(0, (n - BOREDOM_MIN_SAMPLES + 1) / (BOREDOM_CONFIDENCE_CAP - BOREDOM_MIN_SAMPLES + 1)),
  );
  // Confidence is the product of sample factor and R² — you need
  // BOTH enough samples AND a decent fit to trust the signal.
  const confidence = clip01(sampleFactor * r2);

  return { boredomProbability, slope, confidence };
}
