// Fenwick (binary indexed) tree for prefix sums + point updates over a
// fixed-size numeric array. 1-indexed internally; the public API is 0-indexed.

export class FenwickTreeSumRange {
  private readonly n: number;
  private readonly tree: Float64Array;

  constructor(sizeOrValues: number | ReadonlyArray<number>) {
    if (typeof sizeOrValues === 'number') {
      if (!Number.isInteger(sizeOrValues) || sizeOrValues < 0) {
        throw new Error('size must be a non-negative integer');
      }
      this.n = sizeOrValues;
      this.tree = new Float64Array(this.n + 1);
    } else {
      if (!Array.isArray(sizeOrValues)) throw new TypeError('values must be an array');
      this.n = sizeOrValues.length;
      this.tree = new Float64Array(this.n + 1);
      // O(n) initialization
      for (let i = 0; i < this.n; i++) {
        const v = sizeOrValues[i];
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          throw new Error('values must be finite numbers');
        }
        this.tree[i + 1] += v;
        const parent = i + 1 + ((i + 1) & -(i + 1));
        if (parent <= this.n) this.tree[parent] += this.tree[i + 1];
      }
    }
  }

  get size(): number {
    return this.n;
  }

  add(index: number, delta: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.n) {
      throw new RangeError('index out of bounds');
    }
    if (typeof delta !== 'number' || !Number.isFinite(delta)) {
      throw new Error('delta must be a finite number');
    }
    for (let i = index + 1; i <= this.n; i += i & -i) this.tree[i] += delta;
  }

  prefixSum(endExclusive: number): number {
    if (!Number.isInteger(endExclusive) || endExclusive < 0 || endExclusive > this.n) {
      throw new RangeError('endExclusive out of bounds');
    }
    let sum = 0;
    for (let i = endExclusive; i > 0; i -= i & -i) sum += this.tree[i];
    return sum;
  }

  rangeSum(startInclusive: number, endExclusive: number): number {
    if (
      !Number.isInteger(startInclusive) ||
      !Number.isInteger(endExclusive) ||
      startInclusive < 0 ||
      endExclusive > this.n ||
      startInclusive > endExclusive
    ) {
      throw new RangeError('range out of bounds');
    }
    return this.prefixSum(endExclusive) - this.prefixSum(startInclusive);
  }

  get(index: number): number {
    return this.rangeSum(index, index + 1);
  }

  set(index: number, value: number): void {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error('value must be a finite number');
    }
    const cur = this.get(index);
    this.add(index, value - cur);
  }
}
