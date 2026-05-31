/**
 * Phase 16 — weight drift detector.
 *
 * Watches `UserWeightProfile.weights` between updates. When the L1 distance
 * between previous and new exceeds a threshold (or any single ingredient
 * moves more than `perKey`), we flag drift and bump exploration so the
 * bandit re-discovers what works.
 *
 * Pure: no DB. Caller persists the resulting `explorationRate`.
 */
import type { WeightKey, UserWeightProfile } from './learner';

export type DriftReport = {
  drifted: boolean;
  l1: number;
  maxPerKey: number;
  topKey: WeightKey | null;
  newExplorationRate: number;
};

export type DriftOptions = {
  /** L1 distance over all keys; default 0.20. */
  l1Threshold?: number;
  /** Max abs delta on any single key; default 0.08. */
  perKey?: number;
  /** Multiplier when drift detected; default 1.5 (capped at 0.30). */
  explorationBoost?: number;
};

const MAX_EXPLORATION = 0.30;
const MIN_EXPLORATION = 0.02;

export function detectDrift(
  prev: UserWeightProfile,
  next: UserWeightProfile,
  opts: DriftOptions = {},
): DriftReport {
  const l1Threshold      = opts.l1Threshold      ?? 0.20;
  const perKey           = opts.perKey           ?? 0.08;
  const explorationBoost = opts.explorationBoost ?? 1.5;

  let l1 = 0;
  let maxPerKey = 0;
  let topKey: WeightKey | null = null;

  const keys = new Set<string>([...Object.keys(prev.weights), ...Object.keys(next.weights)]);
  for (const k of keys) {
    const a = prev.weights[k as WeightKey] ?? 0;
    const b = next.weights[k as WeightKey] ?? 0;
    const d = Math.abs(a - b);
    l1 += d;
    if (d > maxPerKey) { maxPerKey = d; topKey = k as WeightKey; }
  }

  const drifted = l1 >= l1Threshold || maxPerKey >= perKey;
  const newExplorationRate = drifted
    ? clamp(next.explorationRate * explorationBoost, MIN_EXPLORATION, MAX_EXPLORATION)
    : next.explorationRate;

  return { drifted, l1, maxPerKey, topKey, newExplorationRate };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
