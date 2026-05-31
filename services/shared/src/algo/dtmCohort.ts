/**
 * dtmCohort \u2014 DTM Phase 11 A/B cohort assignment.
 *
 * Assigns each user to one of N question-bank cohorts deterministically
 * from (userId, experimentKey). Same user + same experiment always lands
 * in the same cohort across sessions and pods. Distribution is uniform
 * over cohorts for large user counts.
 *
 * Pure & deterministic. Built on seedRandom (mulberry32).
 */
import { seedFromString } from './seedRandom';

export type DtmCohortConfig = {
  /** Stable experiment identifier (e.g. "dtm_bank_2025q1"). */
  experimentKey: string;
  /** Cohort names. Order is significant for stable hashing. */
  cohorts: readonly string[];
  /** Optional weights (same length as cohorts). Default uniform. */
  weights?: readonly number[];
};

/** Returns the cohort name for this user, or null on misconfigured input. */
export function assignDtmCohort(userId: string, cfg: DtmCohortConfig): string | null {
  const n = cfg.cohorts.length;
  if (n === 0) return null;
  const seed = seedFromString(`${userId}::${cfg.experimentKey}`);
  // Stable [0, 1) double from the seed (one mulberry32 step, inlined to keep
  // this module decoupled from rng state across calls).
  let a = (seed + 0x6D2B79F5) >>> 0;
  let t = Math.imul(a ^ (a >>> 15), a | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;

  const weights = cfg.weights && cfg.weights.length === n
    ? cfg.weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0))
    : cfg.cohorts.map(() => 1);
  let sum = 0;
  for (const w of weights) sum += w;
  if (sum <= 0) return cfg.cohorts[0];

  let acc = 0;
  const target = u * sum;
  for (let i = 0; i < n; i++) {
    acc += weights[i];
    if (target < acc) return cfg.cohorts[i];
  }
  return cfg.cohorts[n - 1];
}
