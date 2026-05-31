/**
 * metricsHistogram \u2014 Phase 18 pure latency histogram helper.
 *
 * Bucketed counters + quantile estimation from the bucket distribution.
 * Bounds default to a coarse latency ladder in ms suitable for HTTP/SLO
 * reporting. State is plain JSON so it serialises across worker threads.
 */
export type Histogram = {
  bounds: ReadonlyArray<number>;   // ascending; values <= bounds[i] go in bucket i
  counts: number[];                // length = bounds.length + 1 (last = +Inf overflow)
  sum: number;
  count: number;
};

export const DEFAULT_LATENCY_BOUNDS_MS: ReadonlyArray<number> = [
  5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
];

export function createHistogram(bounds: ReadonlyArray<number> = DEFAULT_LATENCY_BOUNDS_MS): Histogram {
  // verify ascending
  for (let i = 1; i < bounds.length; i++) {
    if (!(bounds[i] > bounds[i - 1])) throw new Error('metricsHistogram: bounds must be strictly ascending');
  }
  return {
    bounds,
    counts: new Array(bounds.length + 1).fill(0),
    sum: 0,
    count: 0,
  };
}

export function observeHistogram(h: Histogram, value: number): void {
  if (!Number.isFinite(value) || value < 0) return;
  let i = 0;
  while (i < h.bounds.length && value > h.bounds[i]) i++;
  h.counts[i]++;
  h.sum += value;
  h.count++;
}

export function histogramQuantile(h: Histogram, q: number): number {
  if (h.count === 0) return 0;
  const p = Math.max(0, Math.min(1, q));
  const target = p * h.count;
  let acc = 0;
  for (let i = 0; i < h.counts.length; i++) {
    acc += h.counts[i];
    if (acc >= target) {
      // Return the upper bound of this bucket (or last bound for overflow bucket).
      return i < h.bounds.length ? h.bounds[i] : h.bounds[h.bounds.length - 1];
    }
  }
  return h.bounds[h.bounds.length - 1];
}

export function histogramAverage(h: Histogram): number {
  return h.count > 0 ? h.sum / h.count : 0;
}
