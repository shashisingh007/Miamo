// Square-root decomposition for static range-sum queries with point updates.
// Build: O(n). Query: O(sqrt(n)). Update: O(1).

export class SqrtDecomposition {
  private a: number[];
  private blocks: number[];
  private blockSize: number;

  constructor(arr: number[]) {
    if (!Array.isArray(arr)) throw new Error('SqrtDecomposition: arr must be array');
    for (const v of arr) {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new Error('SqrtDecomposition: arr must contain finite numbers');
      }
    }
    this.a = arr.slice();
    this.blockSize = Math.max(1, Math.floor(Math.sqrt(arr.length)) || 1);
    const nb = Math.ceil(arr.length / this.blockSize);
    this.blocks = new Array<number>(nb).fill(0);
    for (let i = 0; i < arr.length; i += 1) {
      this.blocks[Math.floor(i / this.blockSize)] += arr[i];
    }
  }

  size(): number {
    return this.a.length;
  }

  set(i: number, v: number): void {
    if (!Number.isInteger(i) || i < 0 || i >= this.a.length) {
      throw new Error('SqrtDecomposition.set: index out of range');
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('SqrtDecomposition.set: v must be finite number');
    const b = Math.floor(i / this.blockSize);
    this.blocks[b] += v - this.a[i];
    this.a[i] = v;
  }

  get(i: number): number {
    if (!Number.isInteger(i) || i < 0 || i >= this.a.length) {
      throw new Error('SqrtDecomposition.get: index out of range');
    }
    return this.a[i];
  }

  rangeSum(l: number, r: number): number {
    if (!Number.isInteger(l) || !Number.isInteger(r)) {
      throw new Error('SqrtDecomposition.rangeSum: bounds must be integers');
    }
    if (l < 0 || r >= this.a.length || l > r) {
      throw new Error('SqrtDecomposition.rangeSum: bounds out of range');
    }
    const bs = this.blockSize;
    const lb = Math.floor(l / bs);
    const rb = Math.floor(r / bs);
    let s = 0;
    if (lb === rb) {
      for (let i = l; i <= r; i += 1) s += this.a[i];
      return s;
    }
    for (let i = l; i < (lb + 1) * bs; i += 1) s += this.a[i];
    for (let b = lb + 1; b < rb; b += 1) s += this.blocks[b];
    for (let i = rb * bs; i <= r; i += 1) s += this.a[i];
    return s;
  }
}

export function squareRootDecomposition(arr: number[]): SqrtDecomposition {
  return new SqrtDecomposition(arr);
}
