// k-d tree with orthogonal range query.
// Build with kdBuild(points); query axis-aligned box [min[d], max[d]] for all d.

export interface KdNode {
  point: number[];
  axis: number;
  left: KdNode | null;
  right: KdNode | null;
}

function buildRec(points: number[][], depth: number, dims: number): KdNode | null {
  if (points.length === 0) return null;
  const axis = depth % dims;
  points.sort((a, b) => a[axis] - b[axis]);
  const mid = points.length >> 1;
  return {
    point: points[mid],
    axis,
    left: buildRec(points.slice(0, mid), depth + 1, dims),
    right: buildRec(points.slice(mid + 1), depth + 1, dims),
  };
}

export function kdBuild(points: number[][]): KdNode | null {
  if (points.length === 0) return null;
  const dims = points[0].length;
  if (dims === 0) throw new Error('zero-dimensional points');
  for (const p of points) {
    if (p.length !== dims) throw new Error('inconsistent dimensions');
    for (const v of p) if (!Number.isFinite(v)) throw new Error('non-finite coordinate');
  }
  return buildRec(points.map((p) => p.slice()), 0, dims);
}

function rangeRec(node: KdNode | null, min: number[], max: number[], out: number[][]): void {
  if (!node) return;
  const p = node.point;
  let inside = true;
  for (let d = 0; d < p.length; d++) {
    if (p[d] < min[d] || p[d] > max[d]) { inside = false; break; }
  }
  if (inside) out.push(p);
  const a = node.axis;
  if (min[a] <= p[a]) rangeRec(node.left, min, max, out);
  if (max[a] >= p[a]) rangeRec(node.right, min, max, out);
}

export function kdRangeQuery(root: KdNode | null, min: number[], max: number[]): number[][] {
  if (!root) return [];
  if (min.length !== max.length) throw new Error('min/max length mismatch');
  if (min.length !== root.point.length) throw new Error('query dimension mismatch');
  for (let d = 0; d < min.length; d++) {
    if (!Number.isFinite(min[d]) || !Number.isFinite(max[d])) throw new Error('non-finite bound');
    if (min[d] > max[d]) throw new Error('min > max');
  }
  const out: number[][] = [];
  rangeRec(root, min, max, out);
  return out;
}
