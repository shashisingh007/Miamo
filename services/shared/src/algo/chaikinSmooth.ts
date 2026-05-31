// Chaikin's corner-cutting subdivision. Each iteration replaces every
// segment P_i -> P_{i+1} with two new points at 1/4 and 3/4 along the
// segment. Open polylines preserve their first/last endpoints.

export interface Point {
  x: number;
  y: number;
}

export function chaikinSmooth(points: Point[], iterations = 1, closed = false): Point[] {
  if (!Number.isInteger(iterations) || iterations < 0) {
    throw new RangeError('iterations must be a non-negative integer');
  }
  if (points.length < 2 || iterations === 0) return points.slice();
  let pts = points.slice();
  for (let it = 0; it < iterations; it++) {
    const out: Point[] = [];
    if (!closed) out.push(pts[0]);
    const n = pts.length;
    const limit = closed ? n : n - 1;
    for (let i = 0; i < limit; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % n];
      out.push({ x: 0.75 * p.x + 0.25 * q.x, y: 0.75 * p.y + 0.25 * q.y });
      out.push({ x: 0.25 * p.x + 0.75 * q.x, y: 0.25 * p.y + 0.75 * q.y });
    }
    if (!closed) out.push(pts[n - 1]);
    pts = out;
  }
  return pts;
}
