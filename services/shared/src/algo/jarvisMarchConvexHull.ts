// Jarvis march (gift wrapping) convex hull. Returns hull vertices in
// counter-clockwise order, starting at the lowest-then-leftmost point.
// Collinear points on hull edges are excluded.

export interface Point2 {
  x: number;
  y: number;
}

function cross(o: Point2, a: Point2, b: Point2): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function dist2(a: Point2, b: Point2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function pointEq(a: Point2, b: Point2): boolean {
  return a.x === b.x && a.y === b.y;
}

export function jarvisMarchConvexHull(points: Point2[]): Point2[] {
  if (points.length === 0) return [];
  // Deduplicate points.
  const seen = new Set<string>();
  const pts: Point2[] = [];
  for (const p of points) {
    const k = `${p.x},${p.y}`;
    if (!seen.has(k)) {
      seen.add(k);
      pts.push(p);
    }
  }
  const n = pts.length;
  if (n <= 2) return pts.slice().sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));

  // Find lowest-then-leftmost.
  let startIdx = 0;
  for (let i = 1; i < n; i++) {
    if (pts[i].y < pts[startIdx].y || (pts[i].y === pts[startIdx].y && pts[i].x < pts[startIdx].x)) {
      startIdx = i;
    }
  }
  const hull: Point2[] = [];
  let cur = startIdx;
  do {
    hull.push(pts[cur]);
    let next = (cur + 1) % n;
    for (let i = 0; i < n; i++) {
      if (i === cur) continue;
      const c = cross(pts[cur], pts[next], pts[i]);
      // Replace next if i lies to the right of cur->next (i is more CCW), or
      // collinear and farther from cur (so next gets dropped as collinear-on-edge).
      if (c < 0 || (c === 0 && dist2(pts[cur], pts[i]) > dist2(pts[cur], pts[next]))) {
        next = i;
      }
    }
    cur = next;
  } while (cur !== startIdx);

  // Remove collinear points: a hull vertex v is "true" if cross(prev,v,next) > 0.
  const filtered: Point2[] = [];
  for (let i = 0; i < hull.length; i++) {
    const prev = hull[(i - 1 + hull.length) % hull.length];
    const v = hull[i];
    const nxt = hull[(i + 1) % hull.length];
    if (cross(prev, v, nxt) !== 0) filtered.push(v);
    else if (pointEq(prev, v) || pointEq(v, nxt)) {
      // skip
    }
  }
  // If all are collinear (filtered empty), return the two extreme points of hull.
  if (filtered.length === 0) {
    const sorted = hull.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
    return [sorted[0], sorted[sorted.length - 1]];
  }
  return filtered;
}
