// Andrew's monotone-chain convex hull. Returns the hull vertices in
// counter-clockwise order, starting from the lowest-then-leftmost point. Output
// does NOT repeat the first point. Collinear points on the hull boundary are
// excluded (only true vertices are returned).

export interface Point2 {
  x: number;
  y: number;
}

function cross(o: Point2, a: Point2, b: Point2): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

export function monotoneChainConvexHull(points: Point2[]): Point2[] {
  const pts = points.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const n = pts.length;
  if (n <= 1) return pts;

  // Deduplicate adjacent equal points (sorted) — they cause degenerate cross.
  const dedup: Point2[] = [pts[0]];
  for (let i = 1; i < n; i++) {
    const p = pts[i];
    const q = dedup[dedup.length - 1];
    if (p.x !== q.x || p.y !== q.y) dedup.push(p);
  }
  if (dedup.length <= 1) return dedup;

  const lower: Point2[] = [];
  for (const p of dedup) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point2[] = [];
  for (let i = dedup.length - 1; i >= 0; i--) {
    const p = dedup[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}
