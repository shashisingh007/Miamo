export interface KdPoint {
  coords: number[];
  payload?: unknown;
}

interface KdNode {
  point: KdPoint;
  axis: number;
  left: KdNode | null;
  right: KdNode | null;
}

export class KdTreeNearestNeighbor {
  private root: KdNode | null = null;
  private readonly dimensions: number;

  constructor(points: KdPoint[], dimensions: number) {
    if (dimensions <= 0) throw new RangeError('dimensions must be > 0');
    for (const p of points) {
      if (p.coords.length !== dimensions) throw new RangeError('point dimension mismatch');
    }
    this.dimensions = dimensions;
    this.root = this.build(points.slice(), 0);
  }

  nearest(query: number[]): { point: KdPoint; distance: number } | null {
    if (query.length !== this.dimensions) throw new RangeError('query dimension mismatch');
    if (this.root === null) return null;
    const best = { point: this.root.point, distSq: this.squaredDistance(query, this.root.point.coords) };
    this.searchNearest(this.root, query, best);
    return { point: best.point, distance: Math.sqrt(best.distSq) };
  }

  kNearest(query: number[], k: number): Array<{ point: KdPoint; distance: number }> {
    if (k < 0) throw new RangeError('k must be >= 0');
    if (query.length !== this.dimensions) throw new RangeError('query dimension mismatch');
    if (k === 0 || this.root === null) return [];
    const heap: Array<{ point: KdPoint; distSq: number }> = [];
    this.searchKNearest(this.root, query, k, heap);
    return heap
      .sort((a, b) => a.distSq - b.distSq)
      .map((x) => ({ point: x.point, distance: Math.sqrt(x.distSq) }));
  }

  private build(points: KdPoint[], depth: number): KdNode | null {
    if (points.length === 0) return null;
    const axis = depth % this.dimensions;
    points.sort((a, b) => a.coords[axis] - b.coords[axis]);
    const mid = points.length >> 1;
    return {
      point: points[mid],
      axis,
      left: this.build(points.slice(0, mid), depth + 1),
      right: this.build(points.slice(mid + 1), depth + 1),
    };
  }

  private squaredDistance(a: number[], b: number[]): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
    return s;
  }

  private searchNearest(
    node: KdNode | null,
    query: number[],
    best: { point: KdPoint; distSq: number },
  ): void {
    if (node === null) return;
    const d = this.squaredDistance(query, node.point.coords);
    if (d < best.distSq) { best.point = node.point; best.distSq = d; }
    const diff = query[node.axis] - node.point.coords[node.axis];
    const first = diff < 0 ? node.left : node.right;
    const second = diff < 0 ? node.right : node.left;
    this.searchNearest(first, query, best);
    if (diff * diff < best.distSq) this.searchNearest(second, query, best);
  }

  private searchKNearest(
    node: KdNode | null,
    query: number[],
    k: number,
    heap: Array<{ point: KdPoint; distSq: number }>,
  ): void {
    if (node === null) return;
    const d = this.squaredDistance(query, node.point.coords);
    if (heap.length < k) {
      heap.push({ point: node.point, distSq: d });
      heap.sort((a, b) => b.distSq - a.distSq);
    } else if (d < heap[0].distSq) {
      heap[0] = { point: node.point, distSq: d };
      heap.sort((a, b) => b.distSq - a.distSq);
    }
    const diff = query[node.axis] - node.point.coords[node.axis];
    const first = diff < 0 ? node.left : node.right;
    const second = diff < 0 ? node.right : node.left;
    this.searchKNearest(first, query, k, heap);
    const worst = heap.length === k ? heap[0].distSq : Infinity;
    if (diff * diff < worst) this.searchKNearest(second, query, k, heap);
  }
}
