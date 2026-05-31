// Segment tree beats (Ji Driver Segment Tree). Supports range chmin (clamp
// to max), range add, and range sum on signed integers. Provides amortized
// O(log^2 n) per operation.

export class SegmentTreeBeats {
  private n: number;
  private sum: number[];
  private mx: number[];
  private mx2: number[];          // second-largest, -Infinity if absent
  private mxCount: number[];
  private addLazy: number[];

  constructor(input: number[]) {
    this.n = input.length;
    const size = Math.max(1, 4 * this.n);
    this.sum = new Array<number>(size).fill(0);
    this.mx = new Array<number>(size).fill(-Infinity);
    this.mx2 = new Array<number>(size).fill(-Infinity);
    this.mxCount = new Array<number>(size).fill(0);
    this.addLazy = new Array<number>(size).fill(0);
    if (this.n > 0) this.build(1, 0, this.n - 1, input);
  }

  private build(node: number, l: number, r: number, arr: number[]): void {
    if (l === r) {
      this.sum[node] = arr[l];
      this.mx[node] = arr[l];
      this.mx2[node] = -Infinity;
      this.mxCount[node] = 1;
      return;
    }
    const mid = (l + r) >> 1;
    this.build(node * 2, l, mid, arr);
    this.build(node * 2 + 1, mid + 1, r, arr);
    this.merge(node);
  }

  private merge(node: number): void {
    const L = node * 2;
    const R = node * 2 + 1;
    this.sum[node] = this.sum[L] + this.sum[R];
    if (this.mx[L] === this.mx[R]) {
      this.mx[node] = this.mx[L];
      this.mx2[node] = Math.max(this.mx2[L], this.mx2[R]);
      this.mxCount[node] = this.mxCount[L] + this.mxCount[R];
    } else if (this.mx[L] > this.mx[R]) {
      this.mx[node] = this.mx[L];
      this.mx2[node] = Math.max(this.mx2[L], this.mx[R]);
      this.mxCount[node] = this.mxCount[L];
    } else {
      this.mx[node] = this.mx[R];
      this.mx2[node] = Math.max(this.mx[L], this.mx2[R]);
      this.mxCount[node] = this.mxCount[R];
    }
  }

  private applyAdd(node: number, l: number, r: number, v: number): void {
    this.sum[node] += v * (r - l + 1);
    this.mx[node] += v;
    if (this.mx2[node] !== -Infinity) this.mx2[node] += v;
    this.addLazy[node] += v;
  }

  private applyChmin(node: number, v: number): void {
    if (v >= this.mx[node]) return;
    this.sum[node] -= (this.mx[node] - v) * this.mxCount[node];
    this.mx[node] = v;
  }

  private push(node: number, l: number, r: number): void {
    const mid = (l + r) >> 1;
    if (this.addLazy[node] !== 0) {
      this.applyAdd(node * 2, l, mid, this.addLazy[node]);
      this.applyAdd(node * 2 + 1, mid + 1, r, this.addLazy[node]);
      this.addLazy[node] = 0;
    }
    if (this.mx[node] < this.mx[node * 2]) this.applyChmin(node * 2, this.mx[node]);
    if (this.mx[node] < this.mx[node * 2 + 1]) this.applyChmin(node * 2 + 1, this.mx[node]);
  }

  rangeAdd(qL: number, qR: number, v: number): void {
    if (this.n === 0) return;
    if (qL < 0 || qR >= this.n || qL > qR) throw new Error('SegmentTreeBeats.rangeAdd: bad range');
    this.add(1, 0, this.n - 1, qL, qR, v);
  }

  private add(node: number, l: number, r: number, qL: number, qR: number, v: number): void {
    if (qR < l || r < qL) return;
    if (qL <= l && r <= qR) {
      this.applyAdd(node, l, r, v);
      return;
    }
    this.push(node, l, r);
    const mid = (l + r) >> 1;
    this.add(node * 2, l, mid, qL, qR, v);
    this.add(node * 2 + 1, mid + 1, r, qL, qR, v);
    this.merge(node);
  }

  rangeChmin(qL: number, qR: number, v: number): void {
    if (this.n === 0) return;
    if (qL < 0 || qR >= this.n || qL > qR) throw new Error('SegmentTreeBeats.rangeChmin: bad range');
    this.chmin(1, 0, this.n - 1, qL, qR, v);
  }

  private chmin(node: number, l: number, r: number, qL: number, qR: number, v: number): void {
    if (qR < l || r < qL || v >= this.mx[node]) return;
    if (qL <= l && r <= qR && v > this.mx2[node]) {
      this.applyChmin(node, v);
      return;
    }
    this.push(node, l, r);
    const mid = (l + r) >> 1;
    this.chmin(node * 2, l, mid, qL, qR, v);
    this.chmin(node * 2 + 1, mid + 1, r, qL, qR, v);
    this.merge(node);
  }

  rangeSum(qL: number, qR: number): number {
    if (this.n === 0) return 0;
    if (qL < 0 || qR >= this.n || qL > qR) throw new Error('SegmentTreeBeats.rangeSum: bad range');
    return this.querySum(1, 0, this.n - 1, qL, qR);
  }

  private querySum(node: number, l: number, r: number, qL: number, qR: number): number {
    if (qR < l || r < qL) return 0;
    if (qL <= l && r <= qR) return this.sum[node];
    this.push(node, l, r);
    const mid = (l + r) >> 1;
    return this.querySum(node * 2, l, mid, qL, qR) + this.querySum(node * 2 + 1, mid + 1, r, qL, qR);
  }
}

export function segmentTreeBeats(input: number[]): SegmentTreeBeats {
  return new SegmentTreeBeats(input);
}
