/**
 * Bowyer–Watson Delaunay triangulation in 2D.
 * Input: array of distinct points {x,y}. Output: array of triangles indexed
 * into the input points (0-based), with three vertex indices each.
 *
 * Notes:
 *  - Degenerate inputs (fewer than 3 unique points, all collinear) throw.
 *  - The result is a triangulation of the input points; the convex hull
 *    edges are present as triangle edges.
 */

export interface Pt2 {
  x: number;
  y: number;
}

export type Tri = [number, number, number];

interface InternalTri {
  v: [number, number, number]; // indices into augmented points (incl. supertri)
}

function inCircle(a: Pt2, b: Pt2, c: Pt2, p: Pt2): boolean {
  // returns true if p lies strictly inside the circumcircle of (a,b,c) given CCW orientation.
  const ax = a.x - p.x;
  const ay = a.y - p.y;
  const bx = b.x - p.x;
  const by = b.y - p.y;
  const cx = c.x - p.x;
  const cy = c.y - p.y;
  const det =
    (ax * ax + ay * ay) * (bx * cy - by * cx) -
    (bx * bx + by * by) * (ax * cy - ay * cx) +
    (cx * cx + cy * cy) * (ax * by - ay * bx);
  return det > 0;
}

function orient(a: Pt2, b: Pt2, c: Pt2): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

export function bowyerWatsonDelaunay(points: Pt2[]): Tri[] {
  if (!Array.isArray(points)) throw new Error('points must be array');
  const n = points.length;
  if (n < 3) throw new Error('need at least 3 points');
  // dedup check
  const seen = new Set<string>();
  for (const p of points) {
    const k = `${p.x},${p.y}`;
    if (seen.has(k)) throw new Error('duplicate points not allowed');
    seen.add(k);
  }

  // bounding super-triangle
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const dx = maxX - minX;
  const dy = maxY - minY;
  const dmax = Math.max(dx, dy) * 20 + 1;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  // Three super-triangle vertices appended after input points
  const aug: Pt2[] = [
    ...points,
    { x: midX - dmax, y: midY - dmax },
    { x: midX + dmax, y: midY - dmax },
    { x: midX, y: midY + dmax },
  ];
  const sA = n;
  const sB = n + 1;
  const sC = n + 2;

  let tris: InternalTri[] = [{ v: [sA, sB, sC] }];

  for (let i = 0; i < n; i++) {
    const p = aug[i];
    const bad: number[] = [];
    for (let t = 0; t < tris.length; t++) {
      const v = tris[t].v;
      let A = aug[v[0]];
      let B = aug[v[1]];
      let C = aug[v[2]];
      if (orient(A, B, C) < 0) {
        const tmp = B;
        B = C;
        C = tmp;
      }
      if (inCircle(A, B, C, p)) bad.push(t);
    }
    // Find boundary edges of bad-region (edges that appear once)
    const edgeCount = new Map<string, { a: number; b: number; n: number }>();
    for (const t of bad) {
      const v = tris[t].v;
      for (const [a, b] of [
        [v[0], v[1]],
        [v[1], v[2]],
        [v[2], v[0]],
      ]) {
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        const cur = edgeCount.get(key);
        if (cur) cur.n += 1;
        else edgeCount.set(key, { a, b, n: 1 });
      }
    }
    // remove bad triangles
    const keep: InternalTri[] = [];
    const badSet = new Set(bad);
    for (let t = 0; t < tris.length; t++) {
      if (!badSet.has(t)) keep.push(tris[t]);
    }
    tris = keep;
    // Add new triangles for each boundary edge
    for (const e of edgeCount.values()) {
      if (e.n === 1) tris.push({ v: [e.a, e.b, i] });
    }
  }

  // Drop triangles touching super-triangle
  const out: Tri[] = [];
  for (const t of tris) {
    const v = t.v;
    if (v[0] >= n || v[1] >= n || v[2] >= n) continue;
    out.push([v[0], v[1], v[2]]);
  }
  if (out.length === 0) throw new Error('degenerate input (collinear?)');
  return out;
}
