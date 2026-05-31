// Counting Bloom filter — Bloom filter with k counter increments per cell,
// supporting safe element deletion (at the cost of larger memory).

export interface CountingBloomFilterOptions {
  capacity: number;        // expected number of items
  falsePositiveRate: number; // target FPR (0,1)
  counterBits?: number;    // 4..8, default 4
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

export class CountingBloomFilter {
  readonly bitCount: number; // number of counters
  readonly hashCount: number;
  readonly counterMax: number;
  private readonly counters: Uint8Array;
  private readonly seedBase: number;
  private count = 0;

  constructor(opts: CountingBloomFilterOptions) {
    const { capacity, falsePositiveRate } = opts;
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error('capacity must be a positive integer');
    }
    if (
      !Number.isFinite(falsePositiveRate) ||
      falsePositiveRate <= 0 ||
      falsePositiveRate >= 1
    ) {
      throw new Error('falsePositiveRate must be in (0, 1)');
    }
    const counterBits = opts.counterBits ?? 4;
    if (!Number.isInteger(counterBits) || counterBits < 4 || counterBits > 8) {
      throw new Error('counterBits must be an integer in [4, 8]');
    }
    this.counterMax = (1 << counterBits) - 1;
    const m = Math.ceil(-(capacity * Math.log(falsePositiveRate)) / (Math.log(2) ** 2));
    this.bitCount = Math.max(8, m);
    this.hashCount = Math.max(1, Math.round((this.bitCount / capacity) * Math.log(2)));
    this.counters = new Uint8Array(this.bitCount);
    this.seedBase = (opts.seed ?? 0xa5a5a5a5) >>> 0;
  }

  get size(): number {
    return this.count;
  }

  private indexes(value: string): number[] {
    const h1 = fnv1a32(value, this.seedBase);
    const h2 = fnv1a32(value, (this.seedBase ^ 0x9e3779b1) >>> 0);
    const out: number[] = new Array(this.hashCount);
    for (let i = 0; i < this.hashCount; i++) {
      const combined = (h1 + Math.imul(i, h2)) >>> 0;
      out[i] = combined % this.bitCount;
    }
    return out;
  }

  add(value: string): void {
    if (typeof value !== 'string') throw new TypeError('value must be a string');
    const ids = this.indexes(value);
    for (const idx of ids) {
      if (this.counters[idx] < this.counterMax) this.counters[idx]++;
    }
    this.count++;
  }

  has(value: string): boolean {
    if (typeof value !== 'string') throw new TypeError('value must be a string');
    for (const idx of this.indexes(value)) {
      if (this.counters[idx] === 0) return false;
    }
    return true;
  }

  delete(value: string): boolean {
    if (typeof value !== 'string') throw new TypeError('value must be a string');
    if (!this.has(value)) return false;
    for (const idx of this.indexes(value)) {
      if (this.counters[idx] > 0 && this.counters[idx] < this.counterMax) this.counters[idx]--;
    }
    this.count = Math.max(0, this.count - 1);
    return true;
  }

  reset(): void {
    this.counters.fill(0);
    this.count = 0;
  }
}
