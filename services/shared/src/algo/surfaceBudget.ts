/**
 * surfaceBudget \u2014 Phase 15 generic impression-budget allocator.
 *
 * Given a daily impression cap per user and a per-surface base weight,
 * allocate integer slot counts across surfaces (forYou, deepCompat, notif,
 * dtmAsk). Weights are normalised; remainders are distributed by largest
 * fractional remainder (Hamilton method) so totals match exactly.
 *
 * Pure, deterministic, no IO.
 */
export type SurfaceWeights = Record<string, number>;
export type SurfaceAllocation = Record<string, number>;

export function allocateBudget(totalSlots: number, weights: SurfaceWeights): SurfaceAllocation {
  const keys = Object.keys(weights);
  const out: SurfaceAllocation = {};
  for (const k of keys) out[k] = 0;
  if (totalSlots <= 0 || keys.length === 0) return out;

  let sum = 0;
  for (const k of keys) {
    const w = weights[k];
    if (Number.isFinite(w) && w > 0) sum += w;
  }
  if (sum <= 0) return out;

  const raw: Array<{ k: string; floor: number; frac: number }> = [];
  let used = 0;
  for (const k of keys) {
    const w = Math.max(0, Number.isFinite(weights[k]) ? weights[k] : 0);
    const ideal = (w / sum) * totalSlots;
    const floor = Math.floor(ideal);
    raw.push({ k, floor, frac: ideal - floor });
    used += floor;
  }
  // Distribute remainder by largest fractional part (deterministic tie-break
  // on key name to keep output stable across calls).
  let remainder = totalSlots - used;
  const sorted = raw
    .slice()
    .sort((a, b) => (b.frac - a.frac) || (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
  for (const r of sorted) {
    if (remainder <= 0) break;
    r.floor += 1;
    remainder -= 1;
  }
  for (const r of raw) out[r.k] = r.floor;
  return out;
}
