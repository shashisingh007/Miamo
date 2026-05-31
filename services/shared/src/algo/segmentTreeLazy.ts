// Segment tree with lazy propagation.
// Operations: range add (delta), range sum, point query.
// All operations O(log n) on an array of size n.

export class SegmentTreeLazy {
  private n: number;
  private tree: number[];
  private lazy: number[];

  constructor(input: number[] | number) {
    if (typeof input === 'number') {
      if (!Number.isInteger(input) || input < 0) {
        throw new Error('SegmentTreeLazy: size must be non-negative integer');
      }
      this.n = input;
      const arr = new Array<number>(this.n).fill(0);
      this.tree = new Array<number>(Math.max(1, 4 * this.n)).fill(0);
      this.lazy = new Array<number>(Math.max(1, 4 * this.n)).fill(0);
      if (this.n > 0) this.build(1, 0, this.n - 1, arr);
    } else {
      this.n = input.length;
      this.tree = new Array<number>(Math.max(1, 4 * this.n)).fill(0);
      this.lazy = new Array<number>(Math.max(1, 4 * this.n)).fill(0);
      if (this.n > 0) this.build(1, 0, this.n - 1, input);
    }
  }

  private build(node: number, l: number, r: number, arr: number[]): void {
    if (l === r) {
      this.tree[node] = arr[l];
      return;
    }
    const mid = (l + r) >> 1;
    this.build(node * 2, l, mid, arr);
    this.build(node * 2 + 1, mid + 1, r, arr);
    this.tree[node] = this.tree[node * 2] + this.tree[node * 2 + 1];
  }

  private push(node: number, l: number, r: number): void {
    if (this.lazy[node] === 0) return;
    const mid = (l + r) >> 1;
    const left = node * 2;
    const right = node * 2 + 1;
    this.tree[left] += this.lazy[node] * (mid - l + 1);
    this.lazy[left] += this.lazy[node];
    this.tree[right] += this.lazy[node] * (r - mid);
    this.lazy[right] += this.lazy[node];
    this.lazy[node] = 0;
  }

  rangeAdd(qL: number, qR: number, delta: number): void {
    if (this.n === 0) return;
    if (qL < 0 || qR >= this.n || qL > qR) throw new Error('SegmentTreeLazy.rangeAdd: bad range');
    this.add(1, 0, this.n - 1, qL, qR, delta);
  }

  private add(node: number, l: number, r: number, qL: number, qR: number, delta: number): void {
    if (qR < l || r < qL) return;
    if (qL <= l && r <= qR) {
      this.tree[node] += delta * (r - l + 1);
      this.lazy[node] += delta;
      return;
    }
    this.push(node, l, r);
    const mid = (l + r) >> 1;
    this.add(node * 2, l, mid, qL, qR, delta);
    this.add(node * 2 + 1, mid + 1, r, qL, qR, delta);
    this.tree[node] = this.tree[node * 2] + this.tree[node * 2 + 1];
  }

  rangeSum(qL: number, qR: number): number {
    if (this.n === 0) return 0;
    if (qL < 0 || qR >= this.n || qL > qR) throw new Error('SegmentTreeLazy.rangeSum: bad range');
    return this.sum(1, 0, this.n - 1, qL, qR);
  }

  private sum(node: number, l: number, r: number, qL: number, qR: number): number {
    if (qR < l || r < qL) return 0;
    if (qL <= l && r <= qR) return this.tree[node];
    this.push(node, l, r);
    const mid = (l + r) >> 1;
    return this.sum(node * 2, l, mid, qL, qR) + this.sum(node * 2 + 1, mid + 1, r, qL, qR);
  }

  pointQuery(i: number): number {
    return this.rangeSum(i, i);
  }
}

export function segmentTreeLazy(input: number[] | number): SegmentTreeLazy {
  return new SegmentTreeLazy(input);
}
