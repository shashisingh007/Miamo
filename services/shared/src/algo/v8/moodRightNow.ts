/**
 * v8 mood vector — pure module, no I/O.
 *
 * Five-dimension mood vector per DESIGN_SECTION_A §A.2. Each dimension is
 * independently in [0, 1] — this is NOT a probability vector. A user can be
 * simultaneously rage-and-fatigued, or calm-and-curious.
 *
 * Contract:
 *   - Pure. No Date.now(). All time-sensitive inputs flow through `nowMs`
 *     and `localHour`.
 *   - No env reads. Caller enforces the moodInferenceEnabled consent gate
 *     (special-category data per GDPR Art 9 / DPDP) — when off, this module
 *     is never called.
 *
 * Formulas (per §A.2.1, formulas 9-13):
 *   9.  rage      = clip01( 0.7·rageClickRate + 0.3·recentRegretCount/10 )
 *   10. calm      = expDecay(dwellVariance, 1000)
 *   11. curious   = clip01( recentReturnCount/5 + bioExpandRate )
 *   12. receptive = 1 − rage
 *   13. fatigued  = clip01( recentRegretCount/10 + lateNightBias )
 */
import { clip01, expDecay } from '../math';
import { registerAlgo } from '../registry';

// ─── Type surface ────────────────────────────────────────────────────────────

export type MoodVector = {
  rage:      number;
  calm:      number;
  curious:   number;
  receptive: number;
  fatigued:  number;
};

/**
 * Neutral mood — every dimension at 0.5. Returned on all-null input and used
 * by callers as the consent-suppressed fallback. // because: a user with no
 * data is presumed neither rage nor fatigued nor curious — the prior is
 * deliberately neutral to avoid the "mood-tax" anti-pattern (prompt §13).
 */
export const NEUTRAL_MOOD: MoodVector = {
  rage:      0.5,
  calm:      0.5,
  curious:   0.5,
  receptive: 0.5,
  fatigued:  0.5,
};

/** Same 90s TTL as intent — see §A.2.4. */
export const MOOD_TTL_MS = 90_000;

export type MoodInferenceInput = {
  /** Rage clicks per minute, smoothed over the last 5 min. Null if unknown. */
  rageClickRate: number | null;
  /** Variance of card-impression dwell ms over the last 90s. Null if unknown. */
  dwellVariance: number | null;
  /** Median scroll velocity (px/s) over the last 90s. Null if unknown. */
  scrollVelocity: number | null;
  /** Viewer's local hour (0..23). Null when timezone unavailable. */
  localHour: number | null;
  /** swipe.regret event count over the last 30 events. */
  recentRegretCount: number;
  /** Re-visits to a profile (intent.profile.settle) over the last 30 events. */
  recentReturnCount: number;
  /** Optional bio-expand rate (0..1); when omitted curious uses returns only. */
  bioExpandRate?: number;
  nowMs: number;
};

// ─── Tunable constants ───────────────────────────────────────────────────────

const RAGE_W_CLICK   = 0.7;  // because: §A.2.1 formula 9 — rage clicks are the textbook signal, 70% of the score
const RAGE_W_REGRET  = 0.3;  // because: §A.2.1 formula 9 — regret is corroborating evidence
const RAGE_REGRET_SCALE = 10; // because: 10 regrets in the window ⇒ +0.3 ⇒ contribution caps; matches the §A.2.1 formula

const DWELL_VAR_HALF_LIFE = 1000; // because: §A.2.1 formula 10 — variance of 1000ms² halves the calm score, mirrors the typical dwell distribution width
const CURIOUS_RETURN_SCALE = 5;  // because: §A.2.1 formula 11 — 5 returns saturate the return contribution

const FATIGUE_REGRET_SCALE = 10; // because: §A.2.1 formula 13 — 10 regrets saturate the regret contribution
const FATIGUE_LATE_NIGHT_BONUS = 0.3; // because: §A.2.1 — local hour > 22 adds +0.3 to fatigue
const FATIGUE_OWL_HOUR_BONUS   = 0.4; // because: §A.2.1 — local hour < 6 adds +0.4 to fatigue
const FATIGUE_LATE_NIGHT_THRESHOLD = 22; // because: 22:00 local is the "should-be-asleep" cutoff for the median chronotype
const FATIGUE_EARLY_HOUR_THRESHOLD = 6;  // because: 06:00 local is the boundary of overnight-doom-scrolling

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAllNull(i: MoodInferenceInput): boolean {
  return (
    i.rageClickRate === null &&
    i.dwellVariance === null &&
    i.scrollVelocity === null &&
    i.localHour === null &&
    i.recentRegretCount === 0 &&
    i.recentReturnCount === 0 &&
    (i.bioExpandRate === undefined || i.bioExpandRate === 0)
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Infer a 5-dimension mood vector. Pure.
 *
 * The five dimensions are INDEPENDENT — they do not sum to 1.0. Each is
 * computed by a separate formula per §A.2.1.
 *
 * Returns NEUTRAL_MOOD when every input is null/zero. Callers that have
 * consent-suppressed the user should not call this function at all and
 * should use NEUTRAL_MOOD directly.
 */
export function inferMood(input: MoodInferenceInput): MoodVector {
  if (isAllNull(input)) return { ...NEUTRAL_MOOD };

  const rageClickRate = input.rageClickRate ?? 0;
  const dwellVariance = input.dwellVariance;
  const localHour     = input.localHour;
  const recentRegret  = Math.max(0, input.recentRegretCount);
  const recentReturn  = Math.max(0, input.recentReturnCount);
  const bioExpandRate = typeof input.bioExpandRate === 'number'
    ? clip01(input.bioExpandRate)
    : 0;

  // ── Formula 9: rage
  const rage = clip01(
    RAGE_W_CLICK * clip01(rageClickRate) +
    RAGE_W_REGRET * (recentRegret / RAGE_REGRET_SCALE),
  );

  // ── Formula 10: calm
  // Low dwell variance ⇒ user is steady ⇒ calm high.
  // Null variance ⇒ no evidence ⇒ default calm = 0.5 (neutral).
  const calm = dwellVariance === null
    ? 0.5 // because: no evidence ⇒ neutral, not 1.0
    : clip01(expDecay(Math.max(0, dwellVariance), DWELL_VAR_HALF_LIFE));

  // ── Formula 11: curious
  // recentReturnCount/5 + bioExpandRate, both clipped to [0,1] before summing.
  const curious = clip01(
    (recentReturn / CURIOUS_RETURN_SCALE) + bioExpandRate,
  );

  // ── Formula 12: receptive — inverse of rage
  // because: §A.2.1 — rage and receptive are direct opposites; we keep it
  // explicit so downstream can use receptive as a positive weight without
  // inverting rage on every call.
  const receptive = clip01(1 - rage);

  // ── Formula 13: fatigued
  let fatigueBonus = 0;
  if (localHour !== null) {
    if (localHour > FATIGUE_LATE_NIGHT_THRESHOLD) fatigueBonus += FATIGUE_LATE_NIGHT_BONUS;
    if (localHour < FATIGUE_EARLY_HOUR_THRESHOLD) fatigueBonus += FATIGUE_OWL_HOUR_BONUS;
  }
  const fatigued = clip01(
    (recentRegret / FATIGUE_REGRET_SCALE) + fatigueBonus,
  );

  // scrollVelocity is reserved for future use; reading it here keeps the
  // contract stable. // because: §A.2.1 mentions scroll velocity as a
  // signal that may modulate calm in a future revision; capturing the input
  // now means the consumer never has to migrate.
  void input.scrollVelocity;

  return { rage, calm, curious, receptive, fatigued };
}

/**
 * Heuristic: is this mood "low" enough that the surface should slow down /
 * suppress aggressive recommendations? // because: §A.2 explicitly calls out
 * that the mood vector should bias downstream pacing, not gate it.
 */
export function isLowMood(m: MoodVector): boolean {
  return (
    m.rage > 0.6 ||
    m.fatigued > 0.7 ||
    (m.receptive < 0.4 && m.curious < 0.4)
  );
}

registerAlgo({
  name: 'moodRightNowV8',
  surface: 'foundation',
  usesEvents: [
    'click.rage',
    'swipe.regret',
    'intent.profile.settle',
    'card.impression.100',
    'card.bio.expand',
    'scroll',
  ] as const,
  weights: {},
});
