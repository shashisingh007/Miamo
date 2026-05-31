// Time-series downsampler — bucketed aggregations. Additive infra, new symbols only.

export interface TimeSeriesPoint {
  ts: number;
  value: number;
}

export type DownsampleAggregation = 'mean' | 'sum' | 'min' | 'max' | 'first' | 'last' | 'count';

export interface DownsampleOptions {
  bucketMs: number;
  aggregation?: DownsampleAggregation; // default 'mean'
  alignToEpoch?: boolean; // default true — bucket boundaries align to t % bucketMs == 0
  // When provided, downsample fills empty buckets across [startMs, endMs] (inclusive of start, exclusive of end).
  rangeStartMs?: number;
  rangeEndMs?: number;
  fillValue?: number; // value for empty buckets when range provided; default 0
}

export function downsampleTimeSeries(
  points: ReadonlyArray<TimeSeriesPoint>,
  opts: DownsampleOptions
): TimeSeriesPoint[] {
  if (!Number.isFinite(opts.bucketMs) || opts.bucketMs <= 0) {
    throw new Error('bucketMs must be positive');
  }
  const agg: DownsampleAggregation = opts.aggregation ?? 'mean';
  const alignToEpoch = opts.alignToEpoch ?? true;

  type Acc = { sum: number; min: number; max: number; first: number; last: number; count: number };
  const buckets = new Map<number, Acc>();

  function bucketFor(ts: number): number {
    if (alignToEpoch) return Math.floor(ts / opts.bucketMs) * opts.bucketMs;
    if (points.length === 0) return ts;
    const anchor = points[0].ts;
    const offset = Math.floor((ts - anchor) / opts.bucketMs);
    return anchor + offset * opts.bucketMs;
  }

  const sorted = [...points].sort((a, b) => a.ts - b.ts);
  for (const p of sorted) {
    if (!Number.isFinite(p.ts) || !Number.isFinite(p.value)) continue;
    const b = bucketFor(p.ts);
    let acc = buckets.get(b);
    if (!acc) {
      acc = { sum: 0, min: p.value, max: p.value, first: p.value, last: p.value, count: 0 };
      buckets.set(b, acc);
    }
    acc.sum += p.value;
    if (p.value < acc.min) acc.min = p.value;
    if (p.value > acc.max) acc.max = p.value;
    acc.last = p.value;
    acc.count++;
  }

  function reduce(acc: Acc): number {
    switch (agg) {
      case 'mean':
        return acc.count === 0 ? 0 : acc.sum / acc.count;
      case 'sum':
        return acc.sum;
      case 'min':
        return acc.min;
      case 'max':
        return acc.max;
      case 'first':
        return acc.first;
      case 'last':
        return acc.last;
      case 'count':
        return acc.count;
    }
  }

  if (opts.rangeStartMs !== undefined && opts.rangeEndMs !== undefined) {
    if (opts.rangeEndMs <= opts.rangeStartMs) {
      throw new Error('rangeEndMs must be greater than rangeStartMs');
    }
    const fill = opts.fillValue ?? 0;
    const out: TimeSeriesPoint[] = [];
    const startBucket = alignToEpoch
      ? Math.floor(opts.rangeStartMs / opts.bucketMs) * opts.bucketMs
      : opts.rangeStartMs;
    for (let t = startBucket; t < opts.rangeEndMs; t += opts.bucketMs) {
      const acc = buckets.get(t);
      out.push({ ts: t, value: acc ? reduce(acc) : fill });
    }
    return out;
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, acc]) => ({ ts, value: reduce(acc) }));
}
