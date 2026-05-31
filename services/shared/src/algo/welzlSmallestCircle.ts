// Welzl's smallest enclosing circle (Emo Welzl, randomized expected O(n)).
// Returns the circle with smallest radius containing all input points.

export interface Point2 {
  x: number;
  y: number;
}

export interface Circle {
  cx: number;
  cy: number;
  r: number;
}

const EPS = 1e-10;

function inCircle(c: Circle, p: Point2): boolean {
  const dx = p.x - c.cx;
  const dy = p.y - c.cy;
  return dx * dx + dy * dy <= c.r * c.r + EPS;
}

function circleFrom2(a: Point2, b: Point2): Circle {
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const dx = a.x - cx;
  const dy = a.y - cy;
  return { cx, cy, r: Math.sqrt(dx * dx + dy * dy) };
}

function circleFrom3(a: Point2, b: Point2, c: Point2): Circle {
  const ax = a.x, ay = a.y;
  const bx = b.x, by = b.y;
  const cx = c.x, cy = c.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < EPS) {
    // Degenerate (collinear) — fall back to bounding circle of farthest pair.
    const c1 = circleFrom2(a, b);
    if (inCircle(c1, c)) return c1;
    const c2 = circleFrom2(a, c);
    if (inCircle(c2, b)) return c2;
    return circleFrom2(b, c);
  }
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
  return { cx: ux, cy: uy, r: Math.sqrt(dx * dx + dy * dy) };
}

function trivial(points: Point2[]): Circle {
  if (points.length === 0) return { cx: 0, cy: 0, r: 0 };
  if (points.length === 1) return { cx: points[0].x, cy: points[0].y, r: 0 };
  if (points.length === 2) return circleFrom2(points[0], points[1]);
  return circleFrom3(points[0], points[1], points[2]);
}

function shuffle<T>(arr: T[], seed = 1): T[] {
  let s = seed >>> 0 || 1;
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

export function welzlSmallestEnclosingCircle(points: Point2[]): Circle {
  const pts = shuffle(points);
  const boundary: Point2[] = [];

  function welzl(end: number, b: Point2[]): Circle {
    if (end === 0 || b.length === 3) return trivial(b);
    const p = pts[end - 1];
    const c = welzl(end - 1, b);
    if (inCircle(c, p)) return c;
    return welzl(end - 1, b.concat(p));
  }

  return welzl(pts.length, boundary);
}
