// Lazy-propagation segment tree supporting:
//   - range add updates: add a constant to all elements in [l, r)
//   - range sum queries:  sum of elements in [l, r)
//
// Constructed from an initial array. Indices are 0-based, half-open ranges.

export class LazySegmentTree {
  private readonly n: number;
  private readonly tree: number[]; // sums
  private readonly lazy: number[]; // pending add per node
  private readonly size: number;   // tree array size = 4 * n

  constructor(values: number[]) {
    if (!Array.isArray(values)) throw new TypeError('values must be an array');
    for (const v of values) {
      if (!Number.isFinite(v)) throw new RangeError('values must be finite numbers');
    }
    this.n = values.length;
    this.size = Math.max(4, 4 * this.n);
    this.tree = new Array(this.size).fill(0);
    this.lazy = new Array(this.size).fill(0);
    if (this.n > 0) this.build(1, 0, this.n - 1, values);
  }

  size_(): number {
    return this.n;
  }

  private build(node: number, l: number, r: number, src: number[]): void {
    if (l === r) {
      this.tree[node] = src[l];
      return;
    }
    const mid = (l + r) >> 1;
    this.build(node * 2, l, mid, src);
    this.build(node * 2 + 1, mid + 1, r, src);
    this.tree[node] = this.tree[node * 2] + this.tree[node * 2 + 1];
  }

  private push(node: number, l: number, r: number): void {
    if (this.lazy[node] === 0) return;
    const mid = (l + r) >> 1;
    const leftLen = mid - l + 1;
    const rightLen = r - mid;
    this.tree[node * 2] += this.lazy[node] * leftLen;
    this.lazy[node * 2] += this.lazy[node];
    this.tree[node * 2 + 1] += this.lazy[node] * rightLen;
    this.lazy[node * 2 + 1] += this.lazy[node];
    this.lazy[node] = 0;
  }

  // Add delta to every element in [ql, qr) (half-open).
  rangeAdd(ql: number, qr: number, delta: number): void {
    if (!Number.isInteger(ql) || !Number.isInteger(qr)) throw new TypeError('range bounds must be integers');
    if (!Number.isFinite(delta)) throw new RangeError('delta must be finite');
    if (ql < 0 || qr > this.n || ql > qr) throw new RangeError('range out of bounds');
    if (ql === qr || this.n === 0) return;
    this.update(1, 0, this.n - 1, ql, qr - 1, delta);
  }

  private update(node: number, l: number, r: number, ql: number, qr: number, delta: number): void {
    if (qr < l || ql > r) return;
    if (ql <= l && r <= qr) {
      this.tree[node] += delta * (r - l + 1);
      this.lazy[node] += delta;
      return;
    }
    this.push(node, l, r);
    const mid = (l + r) >> 1;
    this.update(node * 2, l, mid, ql, qr, delta);
    this.update(node * 2 + 1, mid + 1, r, ql, qr, delta);
    this.tree[node] = this.tree[node * 2] + this.tree[node * 2 + 1];
  }

  // Sum of elements in [ql, qr) (half-open).
  rangeSum(ql: number, qr: number): number {
    if (!Number.isInteger(ql) || !Number.isInteger(qr)) throw new TypeError('range bounds must be integers');
    if (ql < 0 || qr > this.n || ql > qr) throw new RangeError('range out of bounds');
    if (ql === qr || this.n === 0) return 0;
    return this.query(1, 0, this.n - 1, ql, qr - 1);
  }

  private query(node: number, l: number, r: number, ql: number, qr: number): number {
    if (qr < l || ql > r) return 0;
    if (ql <= l && r <= qr) return this.tree[node];
    this.push(node, l, r);
    const mid = (l + r) >> 1;
    return this.query(node * 2, l, mid, ql, qr) + this.query(node * 2 + 1, mid + 1, r, ql, qr);
  }

  // Get element at index i.
  pointGet(i: number): number {
    if (!Number.isInteger(i) || i < 0 || i >= this.n) throw new RangeError('index out of bounds');
    return this.query(1, 0, this.n - 1, i, i);
  }
}
