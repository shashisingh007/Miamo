// Sparse-set data structure with O(1) add, remove, has, and clear over a bounded
// universe [0, capacity). Iteration order is insertion order.

export class SparseSet {
  private dense: number[] = [];
  private sparse: number[];
  private readonly capacity: number;

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 0) {
      throw new RangeError('capacity must be a non-negative integer');
    }
    this.capacity = capacity;
    this.sparse = new Array<number>(capacity);
  }

  size(): number {
    return this.dense.length;
  }

  has(value: number): boolean {
    if (value < 0 || value >= this.capacity) return false;
    const idx = this.sparse[value];
    return idx !== undefined && idx < this.dense.length && this.dense[idx] === value;
  }

  add(value: number): boolean {
    if (value < 0 || value >= this.capacity) {
      throw new RangeError('value out of capacity');
    }
    if (this.has(value)) return false;
    this.sparse[value] = this.dense.length;
    this.dense.push(value);
    return true;
  }

  delete(value: number): boolean {
    if (!this.has(value)) return false;
    const idx = this.sparse[value];
    const last = this.dense[this.dense.length - 1];
    this.dense[idx] = last;
    this.sparse[last] = idx;
    this.dense.pop();
    return true;
  }

  clear(): void {
    this.dense.length = 0;
  }

  values(): number[] {
    return this.dense.slice();
  }
}
