// Streaming quantile sketch — simplified t-digest-style with bounded centroid count.
// On each add we insert a tiny centroid; when count exceeds maxCentroids we merge
// adjacent ones whose combined mass is below the size limit q*(1-q).
// Not a strict t-digest, but provides bounded-memory quantile estimates with
// stronger accuracy near the tails than uniform sampling.

interface Centroid {
  mean: number;
  weight: number;
}

export interface TDigestOptions {
  maxCentroids?: number;
}

export class TDigestQuantile {
  private centroids: Centroid[] = [];
  private readonly maxCentroids: number;
  private totalWeight = 0;

  constructor(options: TDigestOptions = {}) {
    const m = options.maxCentroids ?? 100;
    if (!Number.isInteger(m) || m < 4) {
      throw new RangeError('maxCentroids must be an integer >= 4');
    }
    this.maxCentroids = m;
  }

  size(): number {
    return this.totalWeight;
  }

  add(value: number, weight = 1): void {
    if (!Number.isFinite(value)) throw new TypeError('value must be finite');
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new RangeError('weight must be a positive finite number');
    }
    this.totalWeight += weight;
    // binary-insert by mean
    let lo = 0;
    let hi = this.centroids.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.centroids[mid].mean < value) lo = mid + 1;
      else hi = mid;
    }
    this.centroids.splice(lo, 0, { mean: value, weight });
    if (this.centroids.length > this.maxCentroids) this.compress();
  }

  private compress(): void {
    if (this.centroids.length <= this.maxCentroids) return;
    const out: Centroid[] = [];
    let cum = 0;
    const target = this.maxCentroids;
    let cur: Centroid | null = null;
    for (const c of this.centroids) {
      if (cur === null) {
        cur = { mean: c.mean, weight: c.weight };
        continue;
      }
      const newWeight = cur.weight + c.weight;
      const q = (cum + cur.weight + c.weight / 2) / this.totalWeight;
      const sizeLimit = 4 * this.totalWeight * q * (1 - q) / target;
      if (newWeight <= sizeLimit) {
        cur.mean = (cur.mean * cur.weight + c.mean * c.weight) / newWeight;
        cur.weight = newWeight;
      } else {
        out.push(cur);
        cum += cur.weight;
        cur = { mean: c.mean, weight: c.weight };
      }
    }
    if (cur !== null) out.push(cur);
    this.centroids = out;
    // Hard cap: if size-limit compression left us above maxCentroids, force-merge
    // the adjacent pair with smallest combined weight until we are within bounds.
    while (this.centroids.length > this.maxCentroids) {
      let bestIdx = 0;
      let bestSum = Infinity;
      for (let i = 0; i + 1 < this.centroids.length; i += 1) {
        const s = this.centroids[i].weight + this.centroids[i + 1].weight;
        if (s < bestSum) {
          bestSum = s;
          bestIdx = i;
        }
      }
      const a = this.centroids[bestIdx];
      const b = this.centroids[bestIdx + 1];
      const w = a.weight + b.weight;
      a.mean = (a.mean * a.weight + b.mean * b.weight) / w;
      a.weight = w;
      this.centroids.splice(bestIdx + 1, 1);
    }
  }

  quantile(q: number): number {
    if (!Number.isFinite(q) || q < 0 || q > 1) {
      throw new RangeError('q must be in [0,1]');
    }
    if (this.centroids.length === 0) return NaN;
    if (this.centroids.length === 1) return this.centroids[0].mean;
    const target = q * this.totalWeight;
    let cum = 0;
    for (let i = 0; i < this.centroids.length; i += 1) {
      const c = this.centroids[i];
      const next = cum + c.weight;
      if (target <= next) {
        if (i === 0) return c.mean;
        const prev = this.centroids[i - 1];
        const lo = cum - prev.weight / 2 + c.weight / 2; // midpoint between adjacent means in cum space
        // linear interpolation between prev.mean and c.mean
        const span = lo === 0 ? 1 : c.weight;
        const frac = Math.min(1, Math.max(0, (target - cum) / span));
        return prev.mean + (c.mean - prev.mean) * frac;
      }
      cum = next;
    }
    return this.centroids[this.centroids.length - 1].mean;
  }

  centroidCount(): number {
    return this.centroids.length;
  }
}
