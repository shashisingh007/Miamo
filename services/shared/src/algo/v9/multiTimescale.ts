/**
 * v9 Temporal Learning — multi-timescale preference EMA writer.
 *
 * Pure module. No I/O, no Date.now(). The tracking-worker
 * `preferenceWindows.ts` loop pulls UserActivity rows, maps each event to a
 * (dimension, score, timestamp) triple, calls `updateAllWindows`, then
 * persists the resulting rows to `UserPreferenceHistory` via an upsert.
 *
 * The model tracks preference intensity for a *dimension* (a stable
 * namespaced string, e.g. `category:reels_spicy`, `hook:hiking`,
 * `archetype:wordsmith`) at five simultaneous timescales:
 *
 *   right_now  90-second EMA   — matches intentRightNow.ts window
 *   session    30-minute EMA   — one continuous session
 *   week       7-day EMA
 *   month      30-day EMA
 *   lifetime   365-day EMA     — cumulative with mild decay
 *
 * The event `score` is a caller-supplied [0,1] number indicating "how much
 * did this event indicate preference for this dimension":
 *   like on a spicy_reel        → score 1.0
 *   3s dwell on hiking post     → score ~0.6
 *   pass on wordsmith           → score 0.0
 *   skip / unmatch              → score 0.0
 *
 * Semantics per window (single event applied at time newTs):
 *   1. Decay the previous score toward zero by the elapsed time since the
 *      previous update, at that window's half-life. This is the "no
 *      activity means preference cools" side of the EMA.
 *   2. Blend the decayed prior score with the new event score using an
 *      event weight `alpha`. `alpha` is proportional to the fraction of
 *      the half-life the new event represents, so a single event never
 *      moves a well-observed row more than ~50% toward the event value.
 *
 * Every returned score is clipped to [0,1] and remains finite even under
 * degenerate inputs (halfLife=0, oldTs===newTs, empty prior rows). The
 * property-test suite in `__tests__/v9/multiTimescale.test.ts` locks
 * these invariants.
 */
import { clip01, expDecay } from '../math';

// ─── Type surface ────────────────────────────────────────────────────────────

/** Closed set of window names, matching UserPreferenceHistory.window. */
export type PreferenceWindow =
  | 'right_now'
  | 'session'
  | 'week'
  | 'month'
  | 'lifetime';

/** Canonical iteration order — used by tests, worker loop, snapshots. */
export const ALL_WINDOWS: readonly PreferenceWindow[] = [
  'right_now',
  'session',
  'week',
  'month',
  'lifetime',
] as const;

/**
 * Half-life for each window, in milliseconds. Score at t=halfLife decays
 * from oldScore to oldScore/2 with no new events. // because:
 *   right_now  90s   — matches INTENT_TTL_MS so drift signals align with
 *                      the existing rightNow window.
 *   session    30min — canonical "one continuous session" per §A.6.1.
 *   week       7d    — matches EventAggDaily rollup window.
 *   month      30d   — matches FeatureSnapshot compat lookback.
 *   lifetime   365d  — long tail; still decays so churned users don't
 *                      keep haunting the ranker forever.
 */
export const WINDOW_HALF_LIVES: Record<PreferenceWindow, number> = {
  right_now: 90 * 1000,
  session:   30 * 60 * 1000,
  week:       7 * 24 * 60 * 60 * 1000,
  month:     30 * 24 * 60 * 60 * 1000,
  lifetime: 365 * 24 * 60 * 60 * 1000,
};

/**
 * The persisted shape from `UserPreferenceHistory`. Mirrors the Prisma
 * model exactly. Callers may pass either Date or millis for computedAt;
 * the pure function normalises internally.
 */
export interface PreferenceRow {
  uidHash: string;
  dimension: string;
  window: PreferenceWindow;
  score: number;         // 0..1
  sampleCount: number;
  computedAt: Date;
}

// ─── Pure primitives ────────────────────────────────────────────────────────

/**
 * Apply one EMA step. Given a previous score computed at `oldTs`, and a
 * new event value observed at `newTs`, return the updated score.
 *
 * Canonical exponentially-weighted moving average with time-based alpha:
 *   survival = 2^(-elapsed / halfLife)   // 1 at elapsed=0, 0.5 at halfLife
 *   score    = prev * survival + newValue * (1 - survival)
 *
 * Interpretation:
 *   - elapsed = 0 → score = prev (no change, out-of-order safe).
 *   - elapsed ≫ halfLife → score ≈ newValue (old data forgotten).
 *   - Under repeated newValue = X, score converges monotonically to X.
 *   - Under newValue = 0 with no new events (each call arrives further
 *     from oldTs), score decays to zero at the specified half-life.
 *
 * Under degenerate `halfLife <= 0`, treat the score as fully replaced
 * by the new value (no memory).
 *
 * Returns a clipped [0,1] number. Never NaN.
 */
export function applyEma(
  oldScore: number,
  newValue: number,
  oldTs: number,
  newTs: number,
  halfLifeMs: number,
): number {
  const v = clip01(Number.isFinite(newValue) ? newValue : 0);
  if (halfLifeMs <= 0) return v;
  const prev = clip01(Number.isFinite(oldScore) ? oldScore : 0);
  const elapsed = Math.max(0, newTs - oldTs);
  // expDecay: 1 at elapsed=0, 0.5 at elapsed=halfLife, tends to 0.
  const survival = expDecay(elapsed, halfLifeMs);
  return clip01(prev * survival + v * (1 - survival));
}

/**
 * Compute the updated row for a single window given an event.
 *
 * `prevRow === null` is the cold-start case: initialise the row with
 * the event's score, sampleCount=1, computedAt=newTs.
 *
 * Otherwise: apply the EMA, increment sampleCount, advance computedAt.
 * Never mutates `prevRow`.
 */
export function updatePreference(
  prevRow: PreferenceRow | null,
  window: PreferenceWindow,
  uidHash: string,
  dimension: string,
  eventScore: number,
  eventTs: Date | number,
): PreferenceRow {
  const newTs = typeof eventTs === 'number' ? eventTs : eventTs.getTime();
  const halfLife = WINDOW_HALF_LIVES[window];
  if (prevRow == null) {
    return {
      uidHash,
      dimension,
      window,
      score: clip01(Number.isFinite(eventScore) ? eventScore : 0),
      sampleCount: 1,
      computedAt: new Date(newTs),
    };
  }
  const oldTs = prevRow.computedAt.getTime();
  const newScore = applyEma(prevRow.score, eventScore, oldTs, newTs, halfLife);
  return {
    uidHash: prevRow.uidHash,
    dimension: prevRow.dimension,
    window,
    score: newScore,
    sampleCount: prevRow.sampleCount + 1,
    // Monotonic computedAt — never rewind if events arrive out of order.
    computedAt: new Date(Math.max(oldTs, newTs)),
  };
}

/**
 * Walk all five windows, producing one updated row each.
 *
 * `prevRows` may contain any subset of the five windows for the
 * (uidHash, dimension) pair; missing windows are cold-started. Any
 * row whose window is not in ALL_WINDOWS is ignored (defensive; the DB
 * unique constraint should already prevent this).
 *
 * Returns the five updated rows in ALL_WINDOWS order — deterministic
 * for callers that batch upserts.
 */
export function updateAllWindows(
  prevRows: readonly PreferenceRow[],
  uidHash: string,
  dimension: string,
  eventScore: number,
  eventTs: Date | number,
): PreferenceRow[] {
  const byWindow = new Map<PreferenceWindow, PreferenceRow>();
  for (const r of prevRows) {
    if ((ALL_WINDOWS as readonly string[]).includes(r.window)) {
      byWindow.set(r.window, r);
    }
  }
  const out: PreferenceRow[] = [];
  for (const w of ALL_WINDOWS) {
    out.push(updatePreference(byWindow.get(w) ?? null, w, uidHash, dimension, eventScore, eventTs));
  }
  return out;
}
