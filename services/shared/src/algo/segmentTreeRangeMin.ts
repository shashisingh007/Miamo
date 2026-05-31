// Segment tree supporting range min queries with point updates.

export class SegmentTreeRangeMin {
  private readonly n: number;
  private readonly tree: number[];
  static readonly INF = Number.POSITIVE_INFINITY;

  constructor(values: ReadonlyArray<number>) {
    if (!Array.isArray(values)) throw new TypeError('values must be an array');
    if (values.length === 0) throw new Error('values must be non-empty');
    for (const v of values) {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new Error('all values must be finite numbers');
      }
    }
    this.n = values.length;
    this.tree = new Array(4 * this.n).fill(SegmentTreeRangeMin.INF);
    this.build(1, 0, this.n - 1, values);
  }

  get size(): number {
    return this.n;
  }

  private build(node: number, lo: number, hi: number, values: ReadonlyArray<number>): void {
    if (lo === hi) {
      this.tree[node] = values[lo];
      return;
    }
    const mid = (lo + hi) >> 1;
    this.build(node * 2, lo, mid, values);
    this.build(node * 2 + 1, mid + 1, hi, values);
    this.tree[node] = Math.min(this.tree[node * 2], this.tree[node * 2 + 1]);
  }

  update(index: number, value: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.n) {
      throw new RangeError('index out of bounds');
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error('value must be a finite number');
    }
    this.set(1, 0, this.n - 1, index, value);
  }

  private set(node: number, lo: number, hi: number, idx: number, value: number): void {
    if (lo === hi) {
      this.tree[node] = value;
      return;
    }
    const mid = (lo + hi) >> 1;
    if (idx <= mid) this.set(node * 2, lo, mid, idx, value);
    else this.set(node * 2 + 1, mid + 1, hi, idx, value);
    this.tree[node] = Math.min(this.tree[node * 2], this.tree[node * 2 + 1]);
  }

  /** Min over half-open range [start, end). */
  queryMin(start: number, end: number): number {
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      throw new TypeError('start and end must be integers');
    }
    if (start < 0 || end > this.n || start >= end) {
      throw new RangeError('invalid range');
    }
    return this.query(1, 0, this.n - 1, start, end - 1);
  }

  private query(node: number, lo: number, hi: number, ql: number, qr: number): number {
    if (qr < lo || hi < ql) return SegmentTreeRangeMin.INF;
    if (ql <= lo && hi <= qr) return this.tree[node];
    const mid = (lo + hi) >> 1;
    return Math.min(
      this.query(node * 2, lo, mid, ql, qr),
      this.query(node * 2 + 1, mid + 1, hi, ql, qr)
    );
  }

  get(index: number): number {
    return this.queryMin(index, index + 1);
  }
}
