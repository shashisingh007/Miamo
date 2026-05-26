/**
 * Bucket truncation + percentile helpers — pure functions, easy to test.
 */

/** UTC hour bucket as a Date object (minutes/seconds/ms zeroed). */
export function hourBucket(ts: number): Date {
  const d = new Date(ts);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

/** UTC day bucket (start of day). */
export function dayBucket(ts: number): Date {
  const d = new Date(ts);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Cheap streaming p50/p95 estimator (P² algorithm variant: bounded reservoir
 * + nearest-rank). Accuracy is fine for telemetry buckets; not for billing.
 */
export class PercentileEstimator {
  private samples: number[] = [];
  private readonly cap: number;
  constructor(cap = 256) {
    this.cap = cap;
  }
  add(v: number): void {
    if (this.samples.length < this.cap) {
      this.samples.push(v);
    } else {
      // Reservoir replacement: evict at random to keep sample bounded.
      const idx = Math.floor(Math.random() * this.cap);
      this.samples[idx] = v;
    }
  }
  percentile(p: number): number {
    if (this.samples.length === 0) return 0;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const rank = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
    return sorted[rank];
  }
  get size(): number {
    return this.samples.length;
  }
}

/**
 * Approximate distinct counter using a Set with a hard cap. For Phase 1 this
 * is good enough; swap for HyperLogLog when cardinality matters at scale.
 */
export class DistinctCounter {
  private set = new Set<string>();
  private readonly cap: number;
  private capped = false;
  constructor(cap = 2048) {
    this.cap = cap;
  }
  add(key: string | undefined): void {
    if (!key) return;
    if (this.set.size < this.cap) {
      this.set.add(key);
    } else {
      this.capped = true;
    }
  }
  get count(): number {
    return this.capped ? this.cap : this.set.size;
  }
  get isCapped(): boolean {
    return this.capped;
  }
}
