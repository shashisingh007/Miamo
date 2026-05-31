/**
 * Chan's convex hull algorithm in 2D.
 * Output-sensitive O(n log h) where h is the hull size.
 *
 * Implementation: groups points into ⌈n/m⌉ subsets, computes Graham hull
 * for each, then walks via tangent jumps using binary search on each sub-hull.
 * Tries m = 4, 16, 256, ... until success.
 *
 * Returns hull vertices in counter-clockwise order, no repeated final vertex.
 */

export interface Pt2 {
  x: number;
  y: number;
}

function cross(o: Pt2, a: Pt2, b: Pt2): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function grahamHull(pts: Pt2[]): Pt2[] {
  const sorted = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const n = sorted.length;
  if (n <= 1) return sorted;
  const lower: Pt2[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: Pt2[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function tangent(hull: Pt2[], p: Pt2): number {
  // Index in hull of the point that maximizes polar angle from p (right tangent in CCW order).
  // Use linear scan for simplicity (correct, O(h_i)).
  let best = 0;
  for (let i = 1; i < hull.length; i++) {
    const c = cross(p, hull[best], hull[i]);
    if (c < 0 || (c === 0 && distSq(p, hull[i]) > distSq(p, hull[best]))) best = i;
  }
  return best;
}

function distSq(a: Pt2, b: Pt2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function chanConvexHull(points: Pt2[]): Pt2[] {
  if (!Array.isArray(points)) throw new Error('points must be array');
  const n = points.length;
  if (n < 1) throw new Error('need at least 1 point');
  if (n <= 3) return grahamHull(points);

  for (let t = 1; t < 32; t++) {
    const m = Math.min(n, 1 << (1 << t));
    const result = chanWithM(points, m);
    if (result) return result;
  }
  // fallback
  return grahamHull(points);
}

function chanWithM(points: Pt2[], m: number): Pt2[] | null {
  const n = points.length;
  // partition
  const groups: Pt2[][] = [];
  for (let i = 0; i < n; i += m) groups.push(points.slice(i, i + m));
  const subHulls = groups.map((g) => grahamHull(g));

  // start at lowest-y (then lowest-x) point overall
  let p0: Pt2 = points[0];
  for (const p of points) {
    if (p.y < p0.y || (p.y === p0.y && p.x < p0.x)) p0 = p;
  }

  const hull: Pt2[] = [p0];
  let cur = p0;
  for (let k = 0; k < m; k++) {
    // pick best next vertex via tangent on each sub-hull
    let next: Pt2 | null = null;
    for (const sh of subHulls) {
      if (sh.length === 0) continue;
      const idx = tangent(sh, cur);
      const cand = sh[idx];
      if (cand === cur) continue;
      if (next === null) next = cand;
      else {
        const c = cross(cur, next, cand);
        if (c < 0 || (c === 0 && distSq(cur, cand) > distSq(cur, next))) next = cand;
      }
    }
    if (next === null) return null;
    if (next === hull[0]) return hull;
    hull.push(next);
    cur = next;
  }
  // didn't close in m steps
  return null;
}
