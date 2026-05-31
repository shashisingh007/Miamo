// Weighted random sampler — additive infra. New symbols only.

export interface WeightedItem<T> {
  value: T;
  weight: number;
}

export interface WeightedSampler<T> {
  pickOne(rng?: () => number): T;
  pickMany(count: number, rng?: () => number): T[];
  readonly totalWeight: number;
  readonly size: number;
}

export function createWeightedSampler<T>(items: ReadonlyArray<WeightedItem<T>>): WeightedSampler<T> {
  if (!Array.isArray(items) || items.length === 0) throw new Error('items must be non-empty');
  const values: T[] = [];
  const cumulative: number[] = [];
  let total = 0;
  for (const it of items) {
    if (!Number.isFinite(it.weight) || it.weight < 0) throw new Error('weight must be finite >=0');
    if (it.weight === 0) continue;
    total += it.weight;
    values.push(it.value);
    cumulative.push(total);
  }
  if (values.length === 0) throw new Error('all weights are zero');
  function lowerBound(target: number): number {
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (cumulative[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  return {
    get totalWeight() {
      return total;
    },
    get size() {
      return values.length;
    },
    pickOne(rng: () => number = Math.random) {
      const r = rng() * total;
      // strictly greater-than for stable picking; tiny epsilon handled by lowerBound semantics
      const target = r > 0 ? r : Number.EPSILON;
      return values[lowerBound(target)];
    },
    pickMany(count: number, rng: () => number = Math.random) {
      if (!Number.isInteger(count) || count < 0) throw new Error('count must be a non-negative integer');
      const out: T[] = [];
      for (let i = 0; i < count; i++) out.push(this.pickOne(rng));
      return out;
    },
  };
}
