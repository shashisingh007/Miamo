/**
 * v9 Temporal Learning — session vibe classifier.
 *
 * Pure heuristic (no ML — hard constraint #5 forbids LLMs / online models
 * inside rankers). Reads a fingerprint of the first ~60 seconds of a
 * session and returns one of five vibes plus a confidence score.
 *
 * Vibes (per D.6 spec):
 *   - casual_browse   swipe rate high, dwell low, no bio reads
 *   - serious_search  bio reads, filter tightening, DTM answers
 *   - chat_first      opens messages before Discover
 *   - content_consume time on Reels / Feed, low Discover engagement
 *   - photo_curate    profile edits / uploads dominate
 *
 * Contract:
 *   - Pure. No I/O. No Date.now().
 *   - Confidence in [0,1]. Low when the fingerprint is contradictory
 *     (e.g. equal chat + reels signals) or under-observed.
 *
 * Downstream: each vibe unlocks a different ranker recipe. The v9 dispatch
 * layer (forYouV9Casual / forYouV9Serious / ...) reads this classification
 * to swap `MO_WEIGHTS`. Not shipped in this phase; the classifier is here
 * so the recipe layer has a stable input contract.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type SessionVibe =
  | 'casual_browse'
  | 'serious_search'
  | 'chat_first'
  | 'content_consume'
  | 'photo_curate';

export interface SessionFingerprint {
  /** Swipes per second in first minute. Casual browsers pass ~1/s+. */
  swipeRate: number;
  /** Mean dwell on Discover cards, ms. Serious searchers linger. */
  dwellMeanMs: number;
  /** Card-bio expansions in the session. */
  bioExpands: number;
  /** Filter-panel changes in the session. */
  filterChanges: number;
  /** DTM answers submitted in the session. */
  dtmAnswers: number;
  /** Chat threads opened. */
  messagesOpened: number;
  /** Reels / feed videos viewed to 50%+. */
  reelsViewed: number;
  /** Own-profile edits (photo replace, prompt edit, bio edit). */
  profileEdits: number;
}

export interface VibeClassification {
  vibe: SessionVibe;
  confidence: number;
}

// ─── Constants (bright-line thresholds; every one has a rationale) ─────────

/** Above this rate the user is skimming, not reading. */
export const CASUAL_SWIPE_RATE = 0.75;

/** Below this mean dwell the user isn't reading bios; above it they are. */
export const SERIOUS_DWELL_MS = 3_000;

/** Reels viewed to 50%+ before Discover-fingerprint bumps content_consume. */
export const REELS_CONSUME_MIN = 3;

/** Chat threads opened before Discover-fingerprint bumps chat_first. */
export const CHAT_FIRST_MIN = 2;

/** Profile edits before profile-fingerprint bumps photo_curate. */
export const PHOTO_CURATE_MIN = 2;

/** Signal totals below this floor: confidence ≤ 0.5 (under-observed). */
export const MIN_TOTAL_SIGNAL = 5;

// ─── Pure implementation ────────────────────────────────────────────────────

/**
 * Score each vibe independently, then argmax. Ties broken by declaration
 * order in `SessionVibe` union (matches the CASUAL/SERIOUS/CHAT/CONTENT/
 * PROFILE priority the design brief calls out).
 *
 * Each score is a bounded [0, 1+] number — bounded above 1 doesn't matter
 * because we normalise at the end. Every summand has a `// because:` line
 * grounded in the D.6 spec so a future tuner knows what they're touching.
 */
export function scoreVibes(fp: SessionFingerprint): Record<SessionVibe, number> {
  // casual_browse — high swipe rate, low dwell, few bio reads.
  const casual =
      Math.max(0, Math.min(1, fp.swipeRate / (CASUAL_SWIPE_RATE * 2)))
    + (fp.dwellMeanMs > 0 && fp.dwellMeanMs < SERIOUS_DWELL_MS ? 0.5 : 0)
    + (fp.bioExpands === 0 ? 0.25 : 0);

  // serious_search — dwell high, bios read, filter changes, dtm engagement.
  const serious =
      (fp.dwellMeanMs >= SERIOUS_DWELL_MS ? 0.5 : 0)
    + Math.min(1, fp.bioExpands / 4) * 0.35
    + Math.min(1, fp.filterChanges / 3) * 0.35
    + Math.min(1, fp.dtmAnswers / 5) * 0.25;

  // chat_first — messages opened, few Discover cards seen.
  const chatFirst =
      Math.min(1, fp.messagesOpened / (CHAT_FIRST_MIN + 2)) * 0.75
    + (fp.messagesOpened >= CHAT_FIRST_MIN ? 0.35 : 0)
    + (fp.swipeRate < 0.2 ? 0.15 : 0);

  // content_consume — reels dominate.
  const consume =
      Math.min(1, fp.reelsViewed / (REELS_CONSUME_MIN + 2)) * 0.75
    + (fp.reelsViewed >= REELS_CONSUME_MIN ? 0.35 : 0);

  // photo_curate — profile edits dominate.
  const curate =
      Math.min(1, fp.profileEdits / (PHOTO_CURATE_MIN + 1)) * 0.9
    + (fp.profileEdits >= PHOTO_CURATE_MIN ? 0.25 : 0);

  return {
    casual_browse:   casual,
    serious_search:  serious,
    chat_first:      chatFirst,
    content_consume: consume,
    photo_curate:    curate,
  };
}

/** Sum of every signal — used for confidence gating. */
export function totalSignal(fp: SessionFingerprint): number {
  return (
    fp.bioExpands +
    fp.filterChanges +
    fp.dtmAnswers +
    fp.messagesOpened +
    fp.reelsViewed +
    fp.profileEdits +
    // Swipes contribute weighted less: at ~1/s a casual browser hits 60
    // in a minute; we don't want that to trivially dominate the floor.
    Math.min(20, fp.swipeRate * 30)
  );
}

/**
 * Classify a session fingerprint. Returns argmax with a confidence
 * computed from:
 *   - the margin between top and second-best score,
 *   - the total observed signal count (below MIN_TOTAL_SIGNAL, cap at 0.5),
 *   - a floor of 0 (never negative).
 */
export function classifyVibe(fp: SessionFingerprint): VibeClassification {
  const scores = scoreVibes(fp);
  const entries = Object.entries(scores) as [SessionVibe, number][];
  // Argmax by declaration order for tie-breaking. Initialise `second`
  // as a sentinel so it's guaranteed to be replaced by any real score
  // strictly less than `top` — otherwise a lone winner leaves
  // `second[1] === top[1]` and yields a bogus zero margin.
  let top: [SessionVibe, number] = entries[0];
  let second: [SessionVibe, number] = ['casual_browse' as SessionVibe, -Infinity];
  for (let i = 1; i < entries.length; i++) {
    const e = entries[i];
    if (e[1] > top[1]) { second = top; top = e; }
    else if (e[1] > second[1]) { second = e; }
  }

  // Margin-based confidence: (top - second) / max(top, 1e-6).
  const margin = top[1] - second[1];
  const norm = top[1] > 0 ? margin / top[1] : 0;
  const marginConf = Math.max(0, Math.min(1, norm));

  // Signal-count factor: linear scale from 0 to MIN_TOTAL_SIGNAL, then 1.
  const signal = totalSignal(fp);
  const signalFactor = Math.max(0, Math.min(1, signal / MIN_TOTAL_SIGNAL));

  const confidence = Math.max(0, Math.min(1, marginConf * signalFactor));

  return { vibe: top[0], confidence };
}
