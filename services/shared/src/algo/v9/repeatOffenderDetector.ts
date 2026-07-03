/**
 * v9 — Repeat-offender pattern detector.
 *
 * Pure module. Given a user's match history (each entry tagged with one
 * feature label + a boolean "was later unmatched"), returns per-feature
 * regret patterns and a multiplicative dampener the ranker can apply to
 * the corresponding feature's weight in the multi-objective compose.
 *
 * Canonical use-case: Priya likes profiles tagged `archetype:wordsmith`
 * six times, unmatches five of them, keeps one. That's a 5/6 regret rate
 * — the ranker should stop feeding her wordsmiths at full weight even
 * though her explicit onboarding said she loves them. Same trick for
 * `attribute:smoker` unmatches or `height_bucket:tall` regrets.
 *
 * Design contract:
 *   - Purely deterministic, no I/O, no Date.now().
 *   - `minSampleThreshold` defaults to 5 so a single unmatched profile
 *     doesn't nuke a whole feature bucket.
 *   - Dampener is clipped to [0.5, 1.0] — even 100% regret leaves the
 *     feature at half weight so we don't fully censor a category the
 *     user might still change their mind about.
 *   - `confidence = 1 - 1/(matchCount + 1)` — asymptotic; 5 matches →
 *     0.833, 10 → 0.909, 20 → 0.952. Multiplied into the dampener so a
 *     small sample can't push the weight all the way to 0.5.
 *
 * File: services/shared/src/algo/v9/repeatOffenderDetector.ts
 * Flag: ALGO_V9_REPEAT_OFFENDER_ENABLED
 */
import { clip01 } from '../math';

/** One historical (like → match) event on the user's timeline. */
export interface MatchHistoryEntry {
  /** feature label, e.g. 'archetype:wordsmith' | 'attribute:smoker' | 'height_bucket:tall' */
  feature: string;
  /** true if the user later unmatched or the chat ghosted with 0 messages. */
  wasUnmatched: boolean;
}

/** One aggregated pattern per feature (only emitted above `minSampleThreshold`). */
export interface OffenderPattern {
  feature: string;
  matchCount: number;
  unmatchCount: number;
  /** unmatch / match, [0,1]. */
  regretRate: number;
  /** `1 - 1/(matchCount+1)` — asymptotes to 1 as matchCount grows. */
  confidence: number;
}

/**
 * Minimum matches on a feature before we emit a pattern. Below this a
 * single unmatch would produce a huge regret rate with no statistical
 * meaning. Default 5.
 */
export const DEFAULT_MIN_SAMPLE_THRESHOLD = 5;

/**
 * Floor for the dampener. Even a 100% regret feature stays at 0.5 weight
 * so the ranker retains one path to reintroduce the feature (users change
 * their minds; we don't want to permanently censor a bucket).
 */
export const DAMPENER_FLOOR = 0.5;

/**
 * Detect regret patterns per feature. Groups by `feature`, counts matches
 * and unmatches, and emits patterns only for features that clear the
 * sample threshold. Order is not guaranteed; callers should key by
 * `feature`.
 */
export function detectOffenderPatterns(
  matchHistory: readonly MatchHistoryEntry[],
  minSampleThreshold: number = DEFAULT_MIN_SAMPLE_THRESHOLD,
): OffenderPattern[] {
  const threshold = Math.max(1, Math.floor(minSampleThreshold));
  const counts = new Map<string, { matches: number; unmatches: number }>();
  for (const entry of matchHistory) {
    const bucket = counts.get(entry.feature) ?? { matches: 0, unmatches: 0 };
    bucket.matches += 1;
    if (entry.wasUnmatched) bucket.unmatches += 1;
    counts.set(entry.feature, bucket);
  }

  const out: OffenderPattern[] = [];
  for (const [feature, { matches, unmatches }] of counts.entries()) {
    if (matches < threshold) continue;
    const regretRate = clip01(unmatches / matches);
    const confidence = 1 - 1 / (matches + 1);
    out.push({ feature, matchCount: matches, unmatchCount: unmatches, regretRate, confidence });
  }
  return out;
}

/**
 * Map patterns → per-feature multiplicative dampener in [DAMPENER_FLOOR, 1.0].
 *
 * Formula:
 *   damp = 1 - (1 - DAMPENER_FLOOR) * regretRate * confidence
 *
 * Worked example (5/6 regret, confidence 6/7 ≈ 0.857):
 *   damp = 1 - 0.5 * (5/6) * (6/7) = 1 - 0.5 * 0.7143 = 0.643
 * → the ranker multiplies the `archetype:wordsmith` weight by 0.643.
 */
export function featureDampener(patterns: readonly OffenderPattern[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of patterns) {
    const damp = 1 - (1 - DAMPENER_FLOOR) * p.regretRate * p.confidence;
    out[p.feature] = damp < DAMPENER_FLOOR ? DAMPENER_FLOOR : damp > 1 ? 1 : damp;
  }
  return out;
}

/**
 * Convenience: run detection + dampener in one call. Returns the dampener
 * map only. Ranker code that doesn't need the raw counts uses this form.
 */
export function computeFeatureDampeners(
  matchHistory: readonly MatchHistoryEntry[],
  minSampleThreshold?: number,
): Record<string, number> {
  return featureDampener(detectOffenderPatterns(matchHistory, minSampleThreshold));
}
