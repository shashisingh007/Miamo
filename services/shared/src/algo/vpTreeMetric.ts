// Vantage-Point tree for metric kNN / range queries.
// Supports any metric d(a,b) satisfying the triangle inequality.
// Build: O(n log n) average. Query: O(log n) average.

export interface VpTreeNode<T> {
  point: T;
  threshold: number;
  inner: VpTreeNode<T> | null;
  outer: VpTreeNode<T> | null;
}

export interface VpTreeOptions {
  rng?: () => number;
}

export class VpTreeMetric<T> {
  private root: VpTreeNode<T> | null = null;
  private readonly distance: (a: T, b: T) => number;
  private readonly rng: () => number;
  public readonly size: number;

  constructor(points: T[], distance: (a: T, b: T) => number, options: VpTreeOptions = {}) {
    if (!Array.isArray(points)) throw new TypeError('points must be an array');
    if (typeof distance !== 'function') throw new TypeError('distance must be a function');
    this.distance = distance;
    this.rng = options.rng ?? Math.random;
    this.size = points.length;
    if (points.length > 0) this.root = this.build(points.slice());
  }

  private build(items: T[]): VpTreeNode<T> | null {
    if (items.length === 0) return null;
    const vpIdx = Math.floor(this.rng() * items.length);
    const vp = items[vpIdx];
    items[vpIdx] = items[items.length - 1];
    items.pop();
    if (items.length === 0) {
      return { point: vp, threshold: 0, inner: null, outer: null };
    }
    const distances = items.map((p) => this.distance(vp, p));
    const sorted = distances.slice().sort((a, b) => a - b);
    const mid = sorted[sorted.length >> 1];
    const inner: T[] = [];
    const outer: T[] = [];
    for (let i = 0; i < items.length; i += 1) {
      if (distances[i] < mid) inner.push(items[i]);
      else outer.push(items[i]);
    }
    return {
      point: vp,
      threshold: mid,
      inner: this.build(inner),
      outer: this.build(outer),
    };
  }

  knn(query: T, k: number): { point: T; distance: number }[] {
    if (!Number.isInteger(k) || k <= 0) throw new RangeError('k must be a positive integer');
    if (this.root === null) return [];
    const heap: { point: T; distance: number }[] = [];
    let tau = Infinity;
    const self = this;
    function visit(node: VpTreeNode<T> | null): void {
      if (node === null) return;
      const d = self.distance(query, node.point);
      if (d < tau) {
        heap.push({ point: node.point, distance: d });
        heap.sort((a, b) => b.distance - a.distance);
        if (heap.length > k) heap.shift();
        if (heap.length === k) tau = heap[0].distance;
      }
      if (d < node.threshold) {
        if (d - tau <= node.threshold) visit(node.inner);
        if (d + tau >= node.threshold) visit(node.outer);
      } else {
        if (d + tau >= node.threshold) visit(node.outer);
        if (d - tau <= node.threshold) visit(node.inner);
      }
    }
    visit(this.root);
    return heap.slice().sort((a, b) => a.distance - b.distance);
  }

  withinRadius(query: T, radius: number): { point: T; distance: number }[] {
    if (!Number.isFinite(radius) || radius < 0) {
      throw new RangeError('radius must be a non-negative finite number');
    }
    const out: { point: T; distance: number }[] = [];
    if (this.root === null) return out;
    const self = this;
    function visit(node: VpTreeNode<T> | null): void {
      if (node === null) return;
      const d = self.distance(query, node.point);
      if (d <= radius) out.push({ point: node.point, distance: d });
      if (d - radius <= node.threshold) visit(node.inner);
      if (d + radius >= node.threshold) visit(node.outer);
    }
    visit(this.root);
    out.sort((a, b) => a.distance - b.distance);
    return out;
  }
}
