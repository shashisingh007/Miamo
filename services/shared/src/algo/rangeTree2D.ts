// 2D range tree for orthogonal point queries. Outer BST sorted by x; each
// inner node holds a sorted-by-y list of points within its subtree. Allows
// rectangular range counting and reporting in O(log^2 n + k).

export interface Point2D {
  x: number;
  y: number;
}

interface RangeNode {
  point: Point2D;
  left: RangeNode | null;
  right: RangeNode | null;
  yList: Point2D[]; // sorted by y, includes this point and all descendants
}

function buildTree(points: Point2D[]): RangeNode | null {
  if (points.length === 0) return null;
  const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const build = (lo: number, hi: number): RangeNode | null => {
    if (lo > hi) return null;
    const mid = (lo + hi) >> 1;
    const left = build(lo, mid - 1);
    const right = build(mid + 1, hi);
    const yList = sorted
      .slice(lo, hi + 1)
      .slice()
      .sort((a, b) => a.y - b.y || a.x - b.x);
    return { point: sorted[mid], left, right, yList };
  };
  return build(0, sorted.length - 1);
}

function lowerBoundY(list: Point2D[], y: number): number {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].y < y) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBoundY(list: Point2D[], y: number): number {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].y <= y) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export class RangeTree2D {
  private root: RangeNode | null;

  constructor(points: Point2D[]) {
    if (!Array.isArray(points)) throw new Error('RangeTree2D: points must be array');
    this.root = buildTree(points);
  }

  rangeReport(x1: number, x2: number, y1: number, y2: number): Point2D[] {
    if (x1 > x2 || y1 > y2) return [];
    const out: Point2D[] = [];
    const recur = (node: RangeNode | null): void => {
      if (!node) return;
      if (node.point.x >= x1 && node.point.x <= x2 && node.point.y >= y1 && node.point.y <= y2) {
        out.push(node.point);
      }
      if (node.point.x >= x1) recur(node.left);
      if (node.point.x <= x2) recur(node.right);
    };
    recur(this.root);
    return out;
  }

  rangeCount(x1: number, x2: number, y1: number, y2: number): number {
    if (x1 > x2 || y1 > y2) return 0;
    let total = 0;
    const recur = (node: RangeNode | null, lo: number, hi: number): void => {
      if (!node) return;
      if (lo >= x1 && hi <= x2) {
        const a = lowerBoundY(node.yList, y1);
        const b = upperBoundY(node.yList, y2);
        total += b - a;
        return;
      }
      if (node.point.x >= x1 && node.point.x <= x2 && node.point.y >= y1 && node.point.y <= y2) {
        total += 1;
      }
      if (node.point.x >= x1) recur(node.left, lo, Math.min(hi, node.point.x));
      if (node.point.x <= x2) recur(node.right, Math.max(lo, node.point.x), hi);
    };
    recur(this.root, -Infinity, Infinity);
    return total;
  }
}

export function rangeTree2D(points: Point2D[]): RangeTree2D {
  return new RangeTree2D(points);
}
