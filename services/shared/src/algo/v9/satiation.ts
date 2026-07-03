/**
 * v9 Temporal Learning — satiation / novelty / boredom curves.
 *
 * Pure module. Tracks per-user per-category `consecutiveImpressions` and
 * derives a `noveltyDemand` score in [0,1]. Higher demand = the user has
 * seen too much of this category recently and the ranker should inject
 * variety.
 *
 * Model:
 *   - Each category has a **satiation half-life**: the impression count
 *     at which novelty demand crosses 0.5.
 *   - `noveltyDemand(state) = 1 - 2^(-consecutive/halfLife)`
 *     which is 0 at 0 impressions, 0.5 at halfLife, and asymptotes to 1.
 *   - After a category is **skipped 5x in a row** the counter resets to
 *     0 — the user is clearly no longer engaged with it, so treating it
 *     as fresh again next time is the right prior.
 *   - `needsNoveltyInjection` returns true when any category's demand
 *     exceeds `NOVELTY_INJECTION_THRESHOLD` (0.7 by default).
 *
 * Half-lives are calibrated per the D.3 spec:
 *   - reels_spicy    15 impressions
 *   - photography    40 impressions
 *   - wholesome     100 impressions
 *   - meme           20 impressions
 *   - news           30 impressions
 *   - default        25 impressions (any unlisted category)
 *
 * Contract:
 *   - Pure. `updateSatiation` returns a new state; never mutates input.
 *   - `state.lastResetAt` is a Date supplied by the caller; use `now` for
 *     wall-clock resets. The pure module does not read Date.now().
 *   - No I/O. The caller (preferenceWindows.ts) persists into
 *     `FeatureSnapshot.raw.satiation`.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Impressions at which noveltyDemand = 0.5 for each category. Lower =
 * boredom onset happens faster. // because [D.3 spec]:
 *   - spicy reels burn out fast (15 impressions before boredom onset)
 *   - photography sustains longer (40)
 *   - wholesome content is nearly inexhaustible (100)
 *   - memes are somewhere in the middle-fast (20)
 *   - news is middle-slow (30) — informational content isn't as
 *     immediately-satiating as emotional/attention-grabbing content
 */
export const CATEGORY_SATIATION_HALF_LIVES: Record<string, number> = {
  reels_spicy: 15,
  photography: 40,
  wholesome:  100,
  meme:        20,
  news:        30,
  default:     25,
};

/**
 * Consecutive skips required to reset the counter. Once the user has
 * scrolled past a category five times in a row, they've clearly
 * disengaged, so we let the "next" impression be treated as fresh
 * rather than compounding boredom on top of disinterest.
 */
export const SKIP_RESET_THRESHOLD = 5;

/**
 * `noveltyDemand` above this value triggers injection recommendations.
 * // because: at 0.7 the user is roughly at 1.7× half-life — well past
 * the "getting bored" onset, still short of "already tuned out". This
 * is where a novelty injection has the biggest impact.
 */
export const NOVELTY_INJECTION_THRESHOLD = 0.7;

// ─── Type surface ────────────────────────────────────────────────────────────

export interface SatiationState {
  dimension: string;
  /** Impressions in the current run — reset after SKIP_RESET_THRESHOLD skips. */
  consecutiveImpressions: number;
  /** Consecutive skips since the last impression — tracked to fire the reset. */
  consecutiveSkips: number;
  /** Wall-clock of the last reset. Emitted for observability; not used in scoring. */
  lastResetAt: Date;
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

/** Look up half-life for a category, defaulting to 25 impressions. */
export function halfLifeFor(dimension: string): number {
  // The dimension may be namespaced ("category:reels_spicy"); strip the
  // prefix so callers can pass either form.
  const key = dimension.includes(':') ? dimension.split(':', 2)[1] : dimension;
  return CATEGORY_SATIATION_HALF_LIVES[key] ?? CATEGORY_SATIATION_HALF_LIVES.default;
}

/**
 * Advance the satiation state by one observed event.
 *
 * `wasSkipped=false` → count as an impression, reset consecutiveSkips.
 * `wasSkipped=true`  → count as a skip; when SKIP_RESET_THRESHOLD is
 *                      reached, zero the consecutiveImpressions counter
 *                      and stamp lastResetAt (caller supplies now).
 *
 * Pure. Never mutates input.
 */
export function updateSatiation(
  state: SatiationState,
  wasSkipped: boolean,
  now: Date = state.lastResetAt,
): SatiationState {
  if (!wasSkipped) {
    return {
      ...state,
      consecutiveImpressions: state.consecutiveImpressions + 1,
      consecutiveSkips: 0,
    };
  }
  const nextSkips = state.consecutiveSkips + 1;
  if (nextSkips >= SKIP_RESET_THRESHOLD) {
    return {
      ...state,
      consecutiveImpressions: 0,
      consecutiveSkips: 0,
      lastResetAt: now,
    };
  }
  return {
    ...state,
    consecutiveSkips: nextSkips,
  };
}

/**
 * Compute noveltyDemand ∈ [0,1] for one satiation state.
 *
 * Formula: `1 - 2^(-consecutive / halfLife)`
 *   - consecutive=0     → 0.0
 *   - consecutive=hl    → 0.5
 *   - consecutive=2*hl  → 0.75
 *   - consecutive→∞     → 1.0
 */
export function noveltyDemand(state: SatiationState): number {
  const hl = halfLifeFor(state.dimension);
  if (hl <= 0 || state.consecutiveImpressions <= 0) return 0;
  const decay = Math.pow(2, -state.consecutiveImpressions / hl);
  const demand = 1 - decay;
  return demand < 0 ? 0 : demand > 1 ? 1 : demand;
}

/**
 * True when any category's novelty demand exceeds the injection
 * threshold. When true, the ranker should mix ~20% of a different
 * category into the next batch — the standard "novelty injection"
 * recipe from the spec.
 */
export function needsNoveltyInjection(
  states: readonly SatiationState[],
  threshold: number = NOVELTY_INJECTION_THRESHOLD,
): boolean {
  for (const s of states) {
    if (noveltyDemand(s) >= threshold) return true;
  }
  return false;
}

/**
 * Initialise a fresh SatiationState for a dimension. Convenience for
 * callers dealing with cold-start.
 */
export function initSatiation(dimension: string, now: Date = new Date(0)): SatiationState {
  return {
    dimension,
    consecutiveImpressions: 0,
    consecutiveSkips: 0,
    lastResetAt: now,
  };
}
