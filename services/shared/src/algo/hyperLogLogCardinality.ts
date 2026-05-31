// HyperLogLog cardinality estimator (Flajolet et al. 2007).
// Estimates the number of distinct elements added with sub-linear memory.

export interface HyperLogLogOptions {
  precision: number; // 4..16; register count m = 2^precision
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

function alpha(m: number): number {
  if (m === 16) return 0.673;
  if (m === 32) return 0.697;
  if (m === 64) return 0.709;
  return 0.7213 / (1 + 1.079 / m);
}

export class HyperLogLog {
  readonly precision: number;
  readonly m: number;
  readonly seed: number;
  private readonly registers: Uint8Array;

  constructor(opts: HyperLogLogOptions) {
    const p = opts.precision;
    if (!Number.isInteger(p) || p < 4 || p > 16) {
      throw new Error('precision must be an integer in [4, 16]');
    }
    this.precision = p;
    this.m = 1 << p;
    this.seed = (opts.seed ?? 0xdeadbeef) >>> 0;
    this.registers = new Uint8Array(this.m);
  }

  add(value: string): void {
    if (typeof value !== 'string') throw new TypeError('value must be a string');
    const h = fnv1a32(value, this.seed);
    const idx = h >>> (32 - this.precision);
    // Remaining bits used to count leading zeros (in lower 32 - p bits).
    const remaining = (h << this.precision) >>> 0;
    const rank = remaining === 0 ? 32 - this.precision + 1 : Math.clz32(remaining) + 1;
    if (rank > this.registers[idx]) this.registers[idx] = rank;
  }

  estimate(): number {
    const m = this.m;
    let sum = 0;
    let zeros = 0;
    for (let i = 0; i < m; i++) {
      sum += Math.pow(2, -this.registers[i]);
      if (this.registers[i] === 0) zeros++;
    }
    const raw = (alpha(m) * m * m) / sum;
    if (raw <= (5 / 2) * m && zeros > 0) {
      return Math.round(m * Math.log(m / zeros));
    }
    return Math.round(raw);
  }

  merge(other: HyperLogLog): void {
    if (this.precision !== other.precision) {
      throw new Error('cannot merge HyperLogLog with different precision');
    }
    if (this.seed !== other.seed) {
      throw new Error('cannot merge HyperLogLog with different seeds');
    }
    for (let i = 0; i < this.m; i++) {
      if (other.registers[i] > this.registers[i]) this.registers[i] = other.registers[i];
    }
  }

  reset(): void {
    this.registers.fill(0);
  }
}
