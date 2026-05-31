/**
 * Phase 17 — per-user fatigue tracker.
 *
 * Decay-weighted impression counter that the v6 ranker reads to compute
 * `fatiguePenalty` for a given (user, candidate) pair. The intuition: if
 * we've shown the same candidate to a user 5 times in 48h with no
 * decision, scoring them again at full weight wastes the slot.
 *
 * Model:
 *   - Each impression contributes 1.0 at t=now.
 *   - Contribution decays with half-life 24h.
 *   - Decision events (`swipe.commit` / `match`) reset the counter to 0.
 *   - `penalty(count)` = min(MAX_PENALTY, count * STEP).
 *
 * Pure: state is passed in, new state is returned. Caller persists.
 */

export type FatigueRecord = {
  count: number;      // decayed count
  updatedAtMs: number;
};

export type FatigueOptions = {
  halfLifeMs?: number;        // default 24h
  step?: number;              // penalty per unit (default 2 pts)
  maxPenalty?: number;        // default 12 pts (matches forYouV6 fatigue cap)
};

const HALF_LIFE_MS_DEFAULT = 24 * 60 * 60 * 1000;
const STEP_DEFAULT = 2;
const MAX_PENALTY_DEFAULT = 12;

/** Apply time decay and return a new record (does not mutate input). */
export function decay(rec: FatigueRecord, nowMs: number, opts: FatigueOptions = {}): FatigueRecord {
  const hl = opts.halfLifeMs ?? HALF_LIFE_MS_DEFAULT;
  const dt = Math.max(0, nowMs - rec.updatedAtMs);
  if (dt === 0) return { ...rec };
  const factor = Math.pow(0.5, dt / hl);
  return { count: rec.count * factor, updatedAtMs: nowMs };
}

/** Record one impression (decay first, then +1). */
export function recordImpression(
  rec: FatigueRecord | null,
  nowMs: number,
  opts: FatigueOptions = {},
): FatigueRecord {
  const base = rec ?? { count: 0, updatedAtMs: nowMs };
  const decayed = decay(base, nowMs, opts);
  return { count: decayed.count + 1, updatedAtMs: nowMs };
}

/** Reset on positive engagement (swipe / match). */
export function resetOnDecision(nowMs: number): FatigueRecord {
  return { count: 0, updatedAtMs: nowMs };
}

/** Convert a decayed count into a 0..MAX_PENALTY penalty (in score points). */
export function fatiguePenalty(rec: FatigueRecord | null, nowMs: number, opts: FatigueOptions = {}): number {
  if (!rec) return 0;
  const step = opts.step ?? STEP_DEFAULT;
  const maxP = opts.maxPenalty ?? MAX_PENALTY_DEFAULT;
  const decayed = decay(rec, nowMs, opts);
  return Math.min(maxP, Math.max(0, decayed.count) * step);
}
