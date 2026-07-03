/**
 * Preference snapshot — v6.7.
 *
 * Reduces a UserWeightProfile to a compact, human-readable picture of what
 * the learner currently believes the user prefers. Designed to be:
 *   - emitted as a `preference.snapshot` event every N reward updates
 *   - consumed by the /me/insights endpoint to render trends
 *
 * Pure: no DB, no I/O.
 */
import type { UserWeightProfile, WeightKey } from './learner';

export type PreferenceSnapshot = {
  /** ISO timestamp at snapshot creation */
  ts: string;
  /** ranked top-K ingredients by current weight */
  top: Array<{ key: WeightKey; w: number }>;
  /** ranked bottom-K ingredients by current weight */
  bottom: Array<{ key: WeightKey; w: number }>;
  /** Shannon entropy of normalized weights, in nats. Lower = more decisive. */
  entropy: number;
  /** posterior mean per ingredient (alpha / (alpha+beta)) */
  posterior: Record<WeightKey, number>;
  /** current exploration rate */
  explorationRate: number;
};

export function snapshotProfile(
  profile: UserWeightProfile,
  k: number = 5,
  now: Date = new Date(),
): PreferenceSnapshot {
  const entries = (Object.keys(profile.weights) as WeightKey[])
    .map((key) => ({ key, w: profile.weights[key] }))
    .sort((a, b) => b.w - a.w);

  const sum = entries.reduce((s, e) => s + e.w, 0);
  let entropy = 0;
  if (sum > 0) {
    for (const e of entries) {
      const p = e.w / sum;
      if (p > 0) entropy -= p * Math.log(p);
    }
  }

  const posterior = {} as Record<WeightKey, number>;
  for (const key of Object.keys(profile.banditAlpha) as WeightKey[]) {
    const a = profile.banditAlpha[key];
    const b = profile.banditBeta[key];
    posterior[key] = a + b > 0 ? a / (a + b) : 0.5;
  }

  return {
    ts: now.toISOString(),
    top: entries.slice(0, k),
    bottom: entries.slice(-k).reverse(),
    entropy,
    posterior,
    explorationRate: profile.explorationRate,
  };
}

/**
 * Compare two snapshots and return per-ingredient deltas, useful for
 * "your taste 30 days ago vs now" UI.
 */
export function diffSnapshots(
  before: PreferenceSnapshot,
  after: PreferenceSnapshot,
): Array<{ key: WeightKey; before: number; after: number; delta: number }> {
  const beforeMap = new Map<WeightKey, number>();
  for (const e of [...before.top, ...before.bottom]) beforeMap.set(e.key, e.w);
  const afterMap = new Map<WeightKey, number>();
  for (const e of [...after.top, ...after.bottom]) afterMap.set(e.key, e.w);

  const keys = new Set<WeightKey>([...beforeMap.keys(), ...afterMap.keys()]);
  return Array.from(keys).map((key) => {
    const b = beforeMap.get(key) ?? 0;
    const a = afterMap.get(key) ?? 0;
    return { key, before: b, after: a, delta: a - b };
  }).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
}
