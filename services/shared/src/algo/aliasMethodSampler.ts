export class AliasMethodSampler {
  private readonly prob: number[];
  private readonly alias: number[];
  private readonly rng: () => number;

  constructor(weights: number[], rng: () => number = Math.random) {
    if (weights.length === 0) throw new RangeError('weights must be non-empty');
    let total = 0;
    for (const w of weights) {
      if (!Number.isFinite(w) || w < 0) throw new RangeError('weights must be finite and >= 0');
      total += w;
    }
    if (total <= 0) throw new RangeError('weights sum must be > 0');
    const n = weights.length;
    const scaled = weights.map((w) => (w * n) / total);
    const prob = new Array<number>(n).fill(0);
    const alias = new Array<number>(n).fill(0);
    const small: number[] = [];
    const large: number[] = [];
    for (let i = 0; i < n; i++) {
      if (scaled[i] < 1) small.push(i); else large.push(i);
    }
    while (small.length > 0 && large.length > 0) {
      const s = small.pop()!;
      const l = large.pop()!;
      prob[s] = scaled[s];
      alias[s] = l;
      scaled[l] = scaled[l] + scaled[s] - 1;
      if (scaled[l] < 1) small.push(l); else large.push(l);
    }
    while (large.length > 0) { const l = large.pop()!; prob[l] = 1; alias[l] = l; }
    while (small.length > 0) { const s = small.pop()!; prob[s] = 1; alias[s] = s; }
    this.prob = prob;
    this.alias = alias;
    this.rng = rng;
  }

  sample(): number {
    const n = this.prob.length;
    const r = this.rng();
    const i = Math.min(n - 1, Math.floor(r * n));
    const r2 = this.rng();
    return r2 < this.prob[i] ? i : this.alias[i];
  }

  size(): number {
    return this.prob.length;
  }
}
