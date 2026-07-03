/**
 * Batch ladder — V7 phase F.
 *
 * "Show 10, breathe, next 10" pagination. Pure module that:
 *   1. Slices the next K items from a candidate list.
 *   2. Returns a randomized but bounded `breatheMs` so the next request
 *      *feels* like a human curator picked the next ten, not a paginator.
 *   3. Carries forward a small state object so the caller (gateway) can
 *      pass it back on the next call without re-running the full ranker.
 *
 * No timers, no I/O. The caller's HTTP layer is responsible for honoring
 * `breatheMs`; the web SDK waits that long before requesting the next batch
 * unless the user pull-to-refreshes (which skips the breath).
 */

export type BatchLadderState = {
  /** Cursor into the underlying candidate list. */
  cursor: number;
  /** Recent surface-momentum hint. 0..1, 1 = very active. */
  momentum: number;
  /** Sequence number — 0 for the first batch. */
  seq: number;
};

export const INITIAL_BATCH_STATE: BatchLadderState = {
  cursor: 0,
  momentum: 0.5,
  seq: 0,
};

const BREATHE_MIN_MS = 1800;
const BREATHE_MAX_MS = 3200;

export type BatchLadderInput<T> = {
  candidates: readonly T[];
  state: BatchLadderState;
  k?: number;
  /** Deterministic randomness source for tests. */
  rand?: () => number;
};

export type BatchLadderResult<T> = {
  batch: T[];
  nextState: BatchLadderState;
  /** Time the client should wait before requesting the next batch (ms). */
  breatheMs: number;
  /** True when no more candidates remain. */
  exhausted: boolean;
};

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Pick the next K items + compute breathe delay.
 *
 * `breatheMs` shrinks when momentum is high (the user is actively flicking
 * through cards) and expands when momentum is low (a deliberate browser
 * gets a slightly longer pause between batches).
 */
export function nextBatch<T>(input: BatchLadderInput<T>): BatchLadderResult<T> {
  const k = clamp(input.k ?? 10, 1, 50);
  const rand = input.rand ?? Math.random;
  const start = clamp(input.state.cursor, 0, input.candidates.length);
  const end = Math.min(start + k, input.candidates.length);
  const batch = input.candidates.slice(start, end);
  const exhausted = end >= input.candidates.length;

  const momentum = clamp(input.state.momentum, 0, 1);
  // Higher momentum → shorter breath. 0 → BREATHE_MAX, 1 → BREATHE_MIN.
  const baseMs = BREATHE_MAX_MS - (BREATHE_MAX_MS - BREATHE_MIN_MS) * momentum;
  // ±200ms jitter per batch so consecutive breaths don't feel mechanical.
  const jitter = (rand() - 0.5) * 400;
  const breatheMs = Math.round(clamp(baseMs + jitter, BREATHE_MIN_MS, BREATHE_MAX_MS));

  return {
    batch: batch as T[],
    nextState: {
      cursor: end,
      momentum,
      seq: input.state.seq + 1,
    },
    breatheMs,
    exhausted,
  };
}

/**
 * Update momentum from a small recent-activity tally. Pure, monotone.
 *   - clicksPerMin: clicks the user produced in the last minute (0..60ish)
 *   - scrollsPerMin: scroll events / minute
 *   - dwellsOver800: number of dwells > 800ms in the last minute
 */
export function computeMomentum(input: {
  clicksPerMin: number;
  scrollsPerMin: number;
  dwellsOver800: number;
}): number {
  const c = clamp(input.clicksPerMin / 30, 0, 1);
  const s = clamp(input.scrollsPerMin / 60, 0, 1);
  const d = clamp(input.dwellsOver800 / 8, 0, 1);
  return clamp(0.5 * c + 0.3 * s + 0.2 * d, 0, 1);
}

/** Skip-the-breath flag for pull-to-refresh. The gateway should treat
 *  `breatheMs = 0` as "client opted out". */
export function skipBreathe<T>(result: BatchLadderResult<T>): BatchLadderResult<T> {
  return { ...result, breatheMs: 0 };
}
