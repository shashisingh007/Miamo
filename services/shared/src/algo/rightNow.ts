/**
 * Right-now signal composer — V7 phase G.
 *
 * Tiny pure function that blends short-horizon signals into a single
 * 0..1 score per topic / surface. Sub-millisecond budget per call;
 * intended to run inline in the feed builder.
 *
 * Components (each clamped to 0..1, blended via fixed weights):
 *   0.35 hourBias        — how much this topic / surface lights up at this hour
 *                          for this user (from insights.hourTotals)
 *   0.30 surfaceMomentum — clicks + scrolls per minute over the last 90s
 *   0.20 recencyHeat     — ≥1 dwell ≥800ms in the last 60s → bonus
 *   0.15 moodGuess       — rage-click rate over the last 5 min damps the score
 */

export type RightNowInput = {
  /** Local hour (0..23). */
  hour: number;
  /** hourTotals[h] = events the user produced at hour h, lifetime. */
  hourTotals: number[];
  /** Surface-activity tally for the current surface, last 90 s. */
  recent: {
    clicks: number;
    scrolls: number;
    dwellsOver800: number;
    rageClicks: number;
  };
};

export type RightNowSignal = {
  score: number;
  components: {
    hourBias: number;
    surfaceMomentum: number;
    recencyHeat: number;
    moodGuess: number;
  };
};

const W_HOUR = 0.35;
const W_MOM  = 0.30;
const W_RECENT = 0.20;
const W_MOOD = 0.15;

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function rightNow(input: RightNowInput): RightNowSignal {
  // Hour bias: this hour's share of the user's lifetime activity, normalized
  // so the busiest hour ≈ 1 and the quietest ≈ 0.
  let hourBias = 0;
  if (input.hourTotals.length === 24) {
    const max = Math.max(...input.hourTotals, 1);
    const h = clamp01(input.hour / 23);
    void h;
    const idx = Math.max(0, Math.min(23, Math.round(input.hour)));
    hourBias = clamp01(input.hourTotals[idx] / max);
  }

  // Surface momentum (clicks + scrolls within last 90 s):
  // Saturating curve so a single flick doesn't equal a full minute of work.
  const momRaw = input.recent.clicks + 0.5 * input.recent.scrolls;
  const surfaceMomentum = clamp01(momRaw / 20);

  // Recency heat: any dwell ≥ 800 ms in the last minute → +1.0,
  // multiple dwells saturate at 1.
  const recencyHeat = clamp01(input.recent.dwellsOver800 / 2);

  // Mood guess: rage-click rate damps the right-now score. Negative weight.
  const moodDamp = clamp01(input.recent.rageClicks / 4);
  const moodGuess = 1 - moodDamp;

  const score = clamp01(
    W_HOUR * hourBias +
    W_MOM * surfaceMomentum +
    W_RECENT * recencyHeat +
    W_MOOD * moodGuess,
  );

  return {
    score,
    components: { hourBias, surfaceMomentum, recencyHeat, moodGuess },
  };
}
