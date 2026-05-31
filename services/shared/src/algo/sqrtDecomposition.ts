// Sqrt-decomposition for range-sum with point updates over a numeric array.

export class SqrtDecomposition {
  private readonly arr: number[];
  private readonly blocks: number[];
  private readonly blockSize: number;

  constructor(values: number[]) {
    for (const v of values) {
      if (!Number.isFinite(v)) throw new TypeError('values must be finite numbers');
    }
    this.arr = values.slice();
    this.blockSize = Math.max(1, Math.ceil(Math.sqrt(values.length)));
    const blockCount = Math.ceil(values.length / this.blockSize) || 0;
    this.blocks = new Array(blockCount).fill(0);
    for (let i = 0; i < values.length; i += 1) {
      this.blocks[Math.floor(i / this.blockSize)] += values[i];
    }
  }

  get length(): number {
    return this.arr.length;
  }

  get(idx: number): number {
    if (!Number.isInteger(idx) || idx < 0 || idx >= this.arr.length) {
      throw new RangeError('idx out of range');
    }
    return this.arr[idx];
  }

  set(idx: number, value: number): void {
    if (!Number.isInteger(idx) || idx < 0 || idx >= this.arr.length) {
      throw new RangeError('idx out of range');
    }
    if (!Number.isFinite(value)) throw new TypeError('value must be a finite number');
    const block = Math.floor(idx / this.blockSize);
    this.blocks[block] += value - this.arr[idx];
    this.arr[idx] = value;
  }

  rangeSum(lo: number, hiExclusive: number): number {
    if (!Number.isInteger(lo) || !Number.isInteger(hiExclusive)) {
      throw new RangeError('lo/hi must be integers');
    }
    if (lo < 0 || hiExclusive > this.arr.length || lo > hiExclusive) {
      throw new RangeError('range out of bounds');
    }
    if (lo === hiExclusive) return 0;
    const last = hiExclusive - 1;
    const startBlock = Math.floor(lo / this.blockSize);
    const endBlock = Math.floor(last / this.blockSize);
    let sum = 0;
    if (startBlock === endBlock) {
      for (let i = lo; i < hiExclusive; i += 1) sum += this.arr[i];
      return sum;
    }
    const startBlockEnd = (startBlock + 1) * this.blockSize;
    for (let i = lo; i < startBlockEnd; i += 1) sum += this.arr[i];
    for (let b = startBlock + 1; b < endBlock; b += 1) sum += this.blocks[b];
    const endBlockStart = endBlock * this.blockSize;
    for (let i = endBlockStart; i < hiExclusive; i += 1) sum += this.arr[i];
    return sum;
  }
}
