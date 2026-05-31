// Cuckoo filter — approximate set membership with deletion support.
// Stores fixed-length fingerprints in buckets indexed by two hash candidates.

export interface CuckooFilterOptions {
  capacity: number;        // approx number of items
  bucketSize?: number;     // entries per bucket, default 4
  fingerprintBits?: number; // 4..16, default 12
  seed?: number;
  maxKicks?: number;       // default 500
  random?: () => number;
}

function fnv1a32(s: string, seed: number): number {
  let h = (0x811c9dc5 ^ (seed >>> 0)) >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i) & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export class CuckooFilter {
  readonly bucketCount: number;
  readonly bucketSize: number;
  readonly fingerprintMask: number;
  private readonly buckets: Int32Array; // -1 means empty
  private readonly seedA: number;
  private readonly seedB: number;
  private readonly maxKicks: number;
  private readonly rng: () => number;
  private count = 0;

  constructor(opts: CuckooFilterOptions) {
    if (!Number.isFinite(opts.capacity) || opts.capacity < 1) {
      throw new Error('capacity must be a positive number');
    }
    this.bucketSize = opts.bucketSize ?? 4;
    if (!Number.isInteger(this.bucketSize) || this.bucketSize < 1 || this.bucketSize > 8) {
      throw new Error('bucketSize must be an integer in [1, 8]');
    }
    const fpBits = opts.fingerprintBits ?? 12;
    if (!Number.isInteger(fpBits) || fpBits < 4 || fpBits > 16) {
      throw new Error('fingerprintBits must be an integer in [4, 16]');
    }
    this.fingerprintMask = (1 << fpBits) - 1;
    this.bucketCount = nextPow2(Math.ceil(opts.capacity / this.bucketSize));
    this.buckets = new Int32Array(this.bucketCount * this.bucketSize).fill(-1);
    const base = (opts.seed ?? 0xc0ffee) >>> 0;
    this.seedA = base;
    this.seedB = (base ^ 0x9e3779b1) >>> 0;
    this.maxKicks = opts.maxKicks ?? 500;
    this.rng = opts.random ?? Math.random;
  }

  get size(): number {
    return this.count;
  }

  private fingerprint(value: string): number {
    let fp = fnv1a32(value, this.seedB) & this.fingerprintMask;
    if (fp === 0) fp = 1; // avoid empty marker
    return fp;
  }

  private indexA(value: string): number {
    return fnv1a32(value, this.seedA) & (this.bucketCount - 1);
  }

  private altIndex(i: number, fp: number): number {
    return (i ^ fnv1a32('fp:' + fp, this.seedA)) & (this.bucketCount - 1);
  }

  private bucketHas(i: number, fp: number): number {
    const base = i * this.bucketSize;
    for (let k = 0; k < this.bucketSize; k++) {
      if (this.buckets[base + k] === fp) return k;
    }
    return -1;
  }

  private bucketInsert(i: number, fp: number): boolean {
    const base = i * this.bucketSize;
    for (let k = 0; k < this.bucketSize; k++) {
      if (this.buckets[base + k] === -1) {
        this.buckets[base + k] = fp;
        return true;
      }
    }
    return false;
  }

  add(value: string): boolean {
    if (typeof value !== 'string') throw new TypeError('value must be a string');
    const fp = this.fingerprint(value);
    let i = this.indexA(value);
    if (this.bucketInsert(i, fp)) {
      this.count++;
      return true;
    }
    let j = this.altIndex(i, fp);
    if (this.bucketInsert(j, fp)) {
      this.count++;
      return true;
    }
    // Cuckoo eviction
    let idx = this.rng() < 0.5 ? i : j;
    let fpCur = fp;
    for (let n = 0; n < this.maxKicks; n++) {
      const slot = Math.floor(this.rng() * this.bucketSize);
      const base = idx * this.bucketSize;
      const old = this.buckets[base + slot];
      this.buckets[base + slot] = fpCur;
      fpCur = old;
      idx = this.altIndex(idx, fpCur);
      if (this.bucketInsert(idx, fpCur)) {
        this.count++;
        return true;
      }
    }
    return false; // filter full
  }

  has(value: string): boolean {
    if (typeof value !== 'string') throw new TypeError('value must be a string');
    const fp = this.fingerprint(value);
    const i = this.indexA(value);
    if (this.bucketHas(i, fp) !== -1) return true;
    const j = this.altIndex(i, fp);
    return this.bucketHas(j, fp) !== -1;
  }

  delete(value: string): boolean {
    if (typeof value !== 'string') throw new TypeError('value must be a string');
    const fp = this.fingerprint(value);
    const i = this.indexA(value);
    let k = this.bucketHas(i, fp);
    if (k !== -1) {
      this.buckets[i * this.bucketSize + k] = -1;
      this.count--;
      return true;
    }
    const j = this.altIndex(i, fp);
    k = this.bucketHas(j, fp);
    if (k !== -1) {
      this.buckets[j * this.bucketSize + k] = -1;
      this.count--;
      return true;
    }
    return false;
  }
}
