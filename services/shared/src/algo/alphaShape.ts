/**
 * 2D alpha shape boundary edges.
 *
 * Builds the Delaunay triangulation, then keeps triangles whose circumradius
 * is ≤ alpha. The boundary of the union of those triangles is returned as a
 * set of edges (pairs of point indices, smaller index first).
 *
 * Special case: alpha = Infinity → boundary equals convex-hull edges.
 */

import { bowyerWatsonDelaunay, Pt2, Tri } from './bowyerWatsonDelaunay';

function circumradius(a: Pt2, b: Pt2, c: Pt2): number {
  const ax = a.x;
  const ay = a.y;
  const bx = b.x;
  const by = b.y;
  const cx = c.x;
  const cy = c.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (d === 0) return Infinity;
  const ux =
    ((ax * ax + ay * ay) * (by - cy) +
      (bx * bx + by * by) * (cy - ay) +
      (cx * cx + cy * cy) * (ay - by)) /
    d;
  const uy =
    ((ax * ax + ay * ay) * (cx - bx) +
      (bx * bx + by * by) * (ax - cx) +
      (cx * cx + cy * cy) * (bx - ax)) /
    d;
  const dx = ax - ux;
  const dy = ay - uy;
  return Math.sqrt(dx * dx + dy * dy);
}

export interface AlphaShapeResult {
  edges: [number, number][]; // i < j
  triangles: Tri[]; // kept triangles
}

export function alphaShape(points: Pt2[], alpha: number): AlphaShapeResult {
  if (!Array.isArray(points)) throw new Error('points must be array');
  if (!(alpha > 0)) throw new Error('alpha must be > 0');
  if (points.length < 3) throw new Error('need >= 3 points');

  const tris = bowyerWatsonDelaunay(points);
  const kept: Tri[] = [];
  for (const t of tris) {
    const r = circumradius(points[t[0]], points[t[1]], points[t[2]]);
    if (r <= alpha) kept.push(t);
  }

  const edgeCount = new Map<string, { a: number; b: number; n: number }>();
  for (const t of kept) {
    for (const [a0, b0] of [
      [t[0], t[1]],
      [t[1], t[2]],
      [t[2], t[0]],
    ]) {
      const a = Math.min(a0, b0);
      const b = Math.max(a0, b0);
      const key = `${a},${b}`;
      const cur = edgeCount.get(key);
      if (cur) cur.n += 1;
      else edgeCount.set(key, { a, b, n: 1 });
    }
  }
  const edges: [number, number][] = [];
  for (const e of edgeCount.values()) {
    if (e.n === 1) edges.push([e.a, e.b]);
  }
  return { edges, triangles: kept };
}
