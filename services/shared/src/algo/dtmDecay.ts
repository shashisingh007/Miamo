/**
 * dtmDecay \u2014 DTM Phase 16 time-decay over the 16-topic vector.
 *
 * Goal: a user's stored DTM should fade toward neutral (0) when they
 * haven't answered in a while, so stale signal doesn't dominate.
 *
 * Decay model: exponential half-life. After `halfLifeDays` of inactivity,
 * each component is multiplied by 0.5. Re-normalised (L2) so the vector
 * remains a unit-ish direction unless it has fully collapsed.
 *
 * Pure: no Date.now, all time inputs are explicit.
 */
import { DTM_TOPIC_KEYS } from './dtmTopics';

const D = DTM_TOPIC_KEYS.length; // 16

export type DtmDecayInputs = {
  vec: Float32Array;
  lastUpdatedMs: number;
  nowMs: number;
  halfLifeDays?: number; // default 30
};

export type DtmDecayResult = {
  vec: Float32Array;
  decayFactor: number; // 1.0 = no decay, 0.5 = one half-life elapsed
  daysElapsed: number;
};

const DEFAULT_HALF_LIFE_DAYS = 30;
const MS_PER_DAY = 86_400_000;

export function applyDtmDecay(inp: DtmDecayInputs): DtmDecayResult {
  const half = Math.max(0.001, inp.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS);
  const elapsedMs = Math.max(0, inp.nowMs - inp.lastUpdatedMs);
  const days = elapsedMs / MS_PER_DAY;
  const factor = Math.pow(0.5, days / half);
  const out = new Float32Array(D);
  let sumSq = 0;
  for (let i = 0; i < D; i++) {
    const v = (inp.vec[i] ?? 0) * factor;
    out[i] = v;
    sumSq += v * v;
  }
  // Re-normalise to unit length when the vector still has signal,
  // so direction is preserved but magnitude tracks decay through an
  // explicit `decayFactor` field instead of the vector itself.
  const norm = Math.sqrt(sumSq);
  if (norm > 1e-6) {
    for (let i = 0; i < D; i++) out[i] = out[i] / norm;
  }
  return { vec: out, decayFactor: factor, daysElapsed: days };
}
