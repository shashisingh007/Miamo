// Vose's Alias Method for O(1) weighted random sampling.

export class WeightedAliasSampler {
  readonly n: number;
  private readonly prob: Float64Array;
  private readonly alias: Int32Array;
  private readonly rng: () => number;

  constructor(weights: ReadonlyArray<number>, rng: () => number = Math.random) {
    if (!Array.isArray(weights)) throw new TypeError('weights must be an array');
    if (weights.length === 0) throw new Error('weights must be non-empty');
    let sum = 0;
    for (const w of weights) {
      if (typeof w !== 'number' || !Number.isFinite(w) || w < 0) {
        throw new TypeError('weights must be non-negative finite numbers');
      }
      sum += w;
    }
    if (sum <= 0) throw new Error('weight sum must be positive');
    this.n = weights.length;
    this.prob = new Float64Array(this.n);
    this.alias = new Int32Array(this.n);
    this.rng = rng;

    const small: number[] = [];
    const large: number[] = [];
    const scaled = new Float64Array(this.n);
    for (let i = 0; i < this.n; i++) {
      scaled[i] = (weights[i] / sum) * this.n;
      if (scaled[i] < 1) small.push(i);
      else large.push(i);
    }
    while (small.length > 0 && large.length > 0) {
      const s = small.pop()!;
      const l = large.pop()!;
      this.prob[s] = scaled[s];
      this.alias[s] = l;
      scaled[l] = scaled[l] + scaled[s] - 1;
      if (scaled[l] < 1) small.push(l);
      else large.push(l);
    }
    while (large.length > 0) {
      const l = large.pop()!;
      this.prob[l] = 1;
      this.alias[l] = l;
    }
    while (small.length > 0) {
      const s = small.pop()!;
      this.prob[s] = 1;
      this.alias[s] = s;
    }
  }

  sample(): number {
    const r = this.rng() * this.n;
    const i = Math.min(this.n - 1, Math.floor(r));
    const frac = r - i;
    return frac < this.prob[i] ? i : this.alias[i];
  }

  sampleMany(k: number): number[] {
    if (!Number.isInteger(k) || k < 0) throw new Error('k must be a non-negative integer');
    const out = new Array<number>(k);
    for (let i = 0; i < k; i++) out[i] = this.sample();
    return out;
  }
}
