/**
 * v9 Temporal Learning — preference drift detector.
 *
 * Pure module. Given a user's `UserPreferenceHistory` rows for one or more
 * dimensions, returns one DriftSignal per dimension that has at least two
 * comparable windows. The signal captures:
 *
 *   - `driftMagnitude` — how far short-term diverges from long-term, [0,1].
 *   - `driftDirection` — 'cooling' | 'warming' | 'stable'.
 *   - `confidence`     — how much to trust the signal, from sample counts.
 *
 * The canonical use case (per the design brief) is Priya, whose spicy-reels
 * score is 0.85 for the month, 0.60 last week, 0.15 in this session, and
 * 0.10 right now. Long-term she loves them; short-term she's been passing.
 * The month-vs-session comparison yields |0.85 - 0.15| = 0.70 (cooling,
 * high magnitude). The ranker should dampen the category **before she
 * consciously notices** — that's what "temporal learning" means here.
 *
 * Contract (matches the design brief D.3):
 *   - short-term < long-term by >0.3 → 'cooling'
 *   - short-term > long-term by >0.3 → 'warming'
 *   - otherwise                      → 'stable'
 *   - `confidence` reflects sample counts across windows: below 10 total
 *     events for the dimension, the caller should ignore the signal.
 *     (The caller — the ranker — chooses the threshold; we surface a
 *     confidence in [0,1] and let downstream code decide.)
 *
 * The magnitude uses the **max** of two comparisons:
 *   max(|month - session|, |week - rightNow|)
 * so a fast cool-off shows up even when the month/week windows are still
 * warm. Missing windows drop out of their pair silently — a user with no
 * `right_now` row is still eligible for month-vs-session drift detection.
 */
import { clip01 } from '../math';
import type { PreferenceRow, PreferenceWindow } from './multiTimescale';

// ─── Type surface ────────────────────────────────────────────────────────────

export type DriftDirection = 'cooling' | 'warming' | 'stable';

export interface DriftSignal {
  dimension: string;
  monthScore: number;
  weekScore: number;
  sessionScore: number;
  rightNowScore: number;
  /** max(|month - session|, |week - rightNow|), clipped [0,1]. */
  driftMagnitude: number;
  driftDirection: DriftDirection;
  /** min(totalSampleCount / DRIFT_CONFIDENCE_CAP, 1). */
  confidence: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Absolute delta above which a drift is called (not 'stable'). */
export const DRIFT_THRESHOLD = 0.3;

/**
 * Sample count required across the compared windows for full confidence.
 * Below this the signal is available but the returned `confidence` scales
 * linearly to 0. // because: with only a handful of events the observed
 * window score is noisy; the ranker should weight the drift less.
 */
export const DRIFT_CONFIDENCE_CAP = 20;

/**
 * Minimum sample count across all windows to emit any signal. // because:
 * below 10 events total we don't have enough data to distinguish drift
 * from noise; return confidence=0 and let the caller ignore it.
 */
export const DRIFT_MIN_SAMPLES = 10;

// ─── Pure implementation ────────────────────────────────────────────────────

/**
 * Bucket rows by dimension, then by window. Returns a Map keyed by
 * dimension, value = partial record of window → score / sampleCount.
 */
function bucketByDimension(
  history: readonly PreferenceRow[],
): Map<string, Partial<Record<PreferenceWindow, PreferenceRow>>> {
  const out = new Map<string, Partial<Record<PreferenceWindow, PreferenceRow>>>();
  for (const row of history) {
    const entry = out.get(row.dimension) ?? {};
    entry[row.window] = row;
    out.set(row.dimension, entry);
  }
  return out;
}

/** Direction from a signed short-term − long-term delta. */
export function directionFromDelta(delta: number): DriftDirection {
  if (delta < -DRIFT_THRESHOLD) return 'cooling';
  if (delta >  DRIFT_THRESHOLD) return 'warming';
  return 'stable';
}

/**
 * Compute one DriftSignal for a bucketed dimension. Returns null when
 * neither comparison pair is available (i.e. we only have one window).
 */
export function signalForDimension(
  dimension: string,
  windows: Partial<Record<PreferenceWindow, PreferenceRow>>,
): DriftSignal | null {
  const month     = windows.month;
  const week      = windows.week;
  const session   = windows.session;
  const rightNow  = windows.right_now;

  // Score defaults: 0 when a window row is absent. That's the "no
  // observed preference" baseline — the same default the ranker uses
  // for a cold-start dimension.
  const monthScore    = month?.score ?? 0;
  const weekScore     = week?.score ?? 0;
  const sessionScore  = session?.score ?? 0;
  const rightNowScore = rightNow?.score ?? 0;

  // Only compare pairs where BOTH sides have observed data. Otherwise
  // a missing window would falsely be treated as a preference of 0.
  const monthVsSession = (month && session)
    ? sessionScore - monthScore
    : null;
  const weekVsRightNow = (week && rightNow)
    ? rightNowScore - weekScore
    : null;

  if (monthVsSession === null && weekVsRightNow === null) return null;

  const candidates: number[] = [];
  if (monthVsSession !== null) candidates.push(monthVsSession);
  if (weekVsRightNow !== null) candidates.push(weekVsRightNow);

  // Signed delta with the largest magnitude — direction is determined
  // by its sign, magnitude by its absolute value.
  let signedDelta = candidates[0];
  for (const c of candidates) if (Math.abs(c) > Math.abs(signedDelta)) signedDelta = c;
  const driftMagnitude = clip01(Math.abs(signedDelta));
  const driftDirection = directionFromDelta(signedDelta);

  // Confidence: sum sampleCounts across the windows involved, scale to
  // DRIFT_CONFIDENCE_CAP, then clip to [0,1]. Below DRIFT_MIN_SAMPLES,
  // clamp to zero.
  const totalSamples =
    (month?.sampleCount ?? 0) +
    (week?.sampleCount ?? 0) +
    (session?.sampleCount ?? 0) +
    (rightNow?.sampleCount ?? 0);
  const confidence = totalSamples < DRIFT_MIN_SAMPLES
    ? 0
    : Math.min(1, totalSamples / DRIFT_CONFIDENCE_CAP);

  return {
    dimension,
    monthScore,
    weekScore,
    sessionScore,
    rightNowScore,
    driftMagnitude,
    driftDirection,
    confidence,
  };
}

/**
 * Detect drift across every dimension present in `history`. Rows may
 * belong to any number of dimensions and windows — this function does
 * the bucketing and returns one signal per dimension for which we can
 * form at least one comparison pair.
 *
 * The result order is not guaranteed; callers should key by
 * `dimension` when consuming.
 */
export function detectDrift(history: readonly PreferenceRow[]): DriftSignal[] {
  const buckets = bucketByDimension(history);
  const out: DriftSignal[] = [];
  for (const [dim, windows] of buckets.entries()) {
    const sig = signalForDimension(dim, windows);
    if (sig !== null) out.push(sig);
  }
  return out;
}
