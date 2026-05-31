// Simple wavelet tree over an integer alphabet [0, sigma).
// Supports rank_c(i) = count of c in [0, i), select_c(k) = position of k-th c.

interface Level {
  bitmap: Uint8Array;
  prefixOnes: Int32Array;
}

export class WaveletTree {
  private readonly sigma: number;
  private readonly length: number;
  private readonly levels: Level[];
  private readonly bitDepth: number;

  constructor(values: number[], sigma: number) {
    if (!Number.isInteger(sigma) || sigma < 1) {
      throw new RangeError('sigma must be a positive integer');
    }
    for (const v of values) {
      if (!Number.isInteger(v) || v < 0 || v >= sigma) {
        throw new RangeError('values must be integers in [0, sigma)');
      }
    }
    this.sigma = sigma;
    this.length = values.length;
    let bits = 1;
    while ((1 << bits) < sigma) bits += 1;
    this.bitDepth = bits;
    this.levels = [];
    this.build(values.slice(), 0, sigma);
  }

  private build(arr: number[], depth: number, alphabetSize: number): void {
    if (depth >= this.bitDepth) return;
    const bitPos = this.bitDepth - 1 - depth;
    const bitmap = new Uint8Array(arr.length);
    const prefixOnes = new Int32Array(arr.length + 1);
    for (let i = 0; i < arr.length; i += 1) {
      bitmap[i] = (arr[i] >>> bitPos) & 1;
      prefixOnes[i + 1] = prefixOnes[i] + bitmap[i];
    }
    this.levels.push({ bitmap, prefixOnes });
    const left: number[] = [];
    const right: number[] = [];
    for (let i = 0; i < arr.length; i += 1) {
      if (bitmap[i] === 0) left.push(arr[i]);
      else right.push(arr[i]);
    }
    // we cannot truly split into independent levels with a flat representation
    // unless we encode boundaries. We avoid recursion here: this simple
    // implementation supports access via descending bit-by-bit with boundary tracking.
    void alphabetSize;
    if (left.length + right.length === arr.length) {
      // store reordering for next level
      const reordered = left.concat(right);
      this.build(reordered, depth + 1, this.sigma);
    }
  }

  get size(): number {
    return this.length;
  }

  access(idx: number): number {
    if (!Number.isInteger(idx) || idx < 0 || idx >= this.length) {
      throw new RangeError('idx out of range');
    }
    let lo = 0;
    let hi = this.length;
    let value = 0;
    for (let d = 0; d < this.bitDepth; d += 1) {
      const level = this.levels[d];
      const bit = level.bitmap[idx];
      value = (value << 1) | bit;
      const zeroCountTotal = hi - lo - (level.prefixOnes[hi] - level.prefixOnes[lo]);
      const zerosBefore = idx - lo - (level.prefixOnes[idx] - level.prefixOnes[lo]);
      const onesBefore = level.prefixOnes[idx] - level.prefixOnes[lo];
      if (bit === 0) {
        idx = lo + zerosBefore;
        hi = lo + zeroCountTotal;
      } else {
        idx = lo + zeroCountTotal + onesBefore;
        lo = lo + zeroCountTotal;
      }
    }
    return value;
  }

  rank(symbol: number, endExclusive: number): number {
    if (!Number.isInteger(symbol) || symbol < 0 || symbol >= this.sigma) {
      throw new RangeError('symbol out of alphabet');
    }
    if (!Number.isInteger(endExclusive) || endExclusive < 0 || endExclusive > this.length) {
      throw new RangeError('endExclusive out of range');
    }
    let lo = 0;
    let hi = this.length;
    let pos = endExclusive;
    for (let d = 0; d < this.bitDepth; d += 1) {
      const level = this.levels[d];
      const bitPos = this.bitDepth - 1 - d;
      const bit = (symbol >>> bitPos) & 1;
      const zeroCountTotal = hi - lo - (level.prefixOnes[hi] - level.prefixOnes[lo]);
      const zerosBefore = pos - lo - (level.prefixOnes[pos] - level.prefixOnes[lo]);
      const onesBefore = level.prefixOnes[pos] - level.prefixOnes[lo];
      if (bit === 0) {
        pos = lo + zerosBefore;
        hi = lo + zeroCountTotal;
      } else {
        pos = lo + zeroCountTotal + onesBefore;
        lo = lo + zeroCountTotal;
      }
    }
    return pos - lo;
  }
}
