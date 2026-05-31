// Count-Min Sketch — probabilistic frequency estimator with bounded over-estimation.
// Construct with desired error bound (epsilon) and confidence (delta).

export interface CountMinSketchOptions {
  epsilon: number; // 0 < epsilon < 1; width = ceil(e / epsilon)
  delta: number;   // 0 < delta < 1;   depth = ceil(ln(1 / delta))
  seed?: number;
}

function fnv1a32(s: string, seed: number): number {
  let h = (0x811c9dc5 ^ (seed >>> 0)) >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i) & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export class CountMinSketch {
  readonly width: number;
  readonly depth: number;
  private readonly table: Uint32Array;
  private readonly seeds: Uint32Array;
  private totalCount = 0;

  constructor(opts: CountMinSketchOptions) {
    const { epsilon, delta } = opts;
    if (!Number.isFinite(epsilon) || epsilon <= 0 || epsilon >= 1) {
      throw new Error('epsilon must be in (0, 1)');
    }
    if (!Number.isFinite(delta) || delta <= 0 || delta >= 1) {
      throw new Error('delta must be in (0, 1)');
    }
    this.width = Math.max(2, Math.ceil(Math.E / epsilon));
    this.depth = Math.max(1, Math.ceil(Math.log(1 / delta)));
    this.table = new Uint32Array(this.width * this.depth);
    this.seeds = new Uint32Array(this.depth);
    const base = (opts.seed ?? 0x12345678) >>> 0;
    for (let i = 0; i < this.depth; i++) this.seeds[i] = (base + i * 0x9e3779b1) >>> 0;
  }

  add(key: string, count = 1): void {
    if (typeof key !== 'string') throw new TypeError('key must be a string');
    if (!Number.isInteger(count) || count < 1) {
      throw new Error('count must be a positive integer');
    }
    for (let i = 0; i < this.depth; i++) {
      const h = fnv1a32(key, this.seeds[i]);
      const col = h % this.width;
      const idx = i * this.width + col;
      this.table[idx] = Math.min(0xffffffff, this.table[idx] + count);
    }
    this.totalCount += count;
  }

  estimate(key: string): number {
    if (typeof key !== 'string') throw new TypeError('key must be a string');
    let min = 0xffffffff;
    for (let i = 0; i < this.depth; i++) {
      const h = fnv1a32(key, this.seeds[i]);
      const col = h % this.width;
      const v = this.table[i * this.width + col];
      if (v < min) min = v;
    }
    return min;
  }

  get total(): number {
    return this.totalCount;
  }

  merge(other: CountMinSketch): void {
    if (this.width !== other.width || this.depth !== other.depth) {
      throw new Error('cannot merge sketches with different dimensions');
    }
    for (let i = 0; i < this.seeds.length; i++) {
      if (this.seeds[i] !== other.seeds[i]) {
        throw new Error('cannot merge sketches with different seeds');
      }
    }
    for (let i = 0; i < this.table.length; i++) {
      this.table[i] = Math.min(0xffffffff, this.table[i] + other.table[i]);
    }
    this.totalCount += other.totalCount;
  }

  reset(): void {
    this.table.fill(0);
    this.totalCount = 0;
  }
}
