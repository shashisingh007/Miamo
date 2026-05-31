/**
 * slidingWindowCounter \u2014 Phase 18 pure sliding-window event counter.
 *
 * Fixed-size circular ring of timestamped event counts; aggregates the
 * count of events within `windowMs` of `nowMs`. Useful for sampler
 * adaptation, abuse heuristics, and feature-usage telemetry.
 *
 * State is plain JSON so it can be serialised between worker turns.
 */
export type SlidingWindowState = {
  timestamps: number[]; // ring buffer (atMs)
  weights: number[];    // same length as timestamps
  size: number;         // logical capacity
  cursor: number;       // next write index
  length: number;       // 0..size populated
};

export function createSlidingWindow(size = 256): SlidingWindowState {
  const cap = Math.max(1, size | 0);
  return {
    timestamps: new Array(cap).fill(0),
    weights: new Array(cap).fill(0),
    size: cap,
    cursor: 0,
    length: 0,
  };
}

export function recordEvent(state: SlidingWindowState, atMs: number, weight = 1): void {
  if (!Number.isFinite(atMs) || !Number.isFinite(weight) || weight <= 0) return;
  state.timestamps[state.cursor] = atMs;
  state.weights[state.cursor] = weight;
  state.cursor = (state.cursor + 1) % state.size;
  if (state.length < state.size) state.length++;
}

export function countInWindow(state: SlidingWindowState, nowMs: number, windowMs: number): number {
  if (!(windowMs > 0)) return 0;
  const cutoff = nowMs - windowMs;
  let sum = 0;
  for (let i = 0; i < state.length; i++) {
    const ts = state.timestamps[i];
    if (ts >= cutoff && ts <= nowMs) sum += state.weights[i];
  }
  return sum;
}

export function pruneOlderThan(state: SlidingWindowState, cutoffMs: number): void {
  // Compact: keep only entries with ts >= cutoffMs. Order is rebuilt from existing data.
  const keepTs: number[] = [];
  const keepW: number[] = [];
  for (let i = 0; i < state.length; i++) {
    if (state.timestamps[i] >= cutoffMs) {
      keepTs.push(state.timestamps[i]);
      keepW.push(state.weights[i]);
    }
  }
  for (let i = 0; i < state.size; i++) {
    state.timestamps[i] = i < keepTs.length ? keepTs[i] : 0;
    state.weights[i] = i < keepW.length ? keepW[i] : 0;
  }
  state.length = keepTs.length;
  state.cursor = state.length % state.size;
}
