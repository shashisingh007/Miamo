export interface Pt2 {
  x: number;
  y: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Centripetal Catmull-Rom spline at parameter t in [0,1] over points p1->p2.
 * Uses p0/p3 as tangent neighbors. alpha=0.5 (centripetal) by default; alpha=0 uniform; alpha=1 chordal.
 */
export function catmullRomSpline(
  p0: Pt2,
  p1: Pt2,
  p2: Pt2,
  p3: Pt2,
  t: number,
  alpha = 0.5,
): Pt2 {
  if (!Number.isFinite(t)) throw new Error('t must be finite');
  if (t < 0 || t > 1) throw new Error('t out of range [0,1]');
  if (alpha < 0 || alpha > 1) throw new Error('alpha out of range [0,1]');

  const tj = (a: Pt2, b: Pt2, prev: number): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    return prev + Math.pow(d === 0 ? 1e-12 : d, alpha);
  };

  const t0 = 0;
  const t1 = tj(p0, p1, t0);
  const t2 = tj(p1, p2, t1);
  const t3 = tj(p2, p3, t2);

  const tt = lerp(t1, t2, t);

  const A1 = mix(p0, p1, (t1 - tt) / (t1 - t0), (tt - t0) / (t1 - t0));
  const A2 = mix(p1, p2, (t2 - tt) / (t2 - t1), (tt - t1) / (t2 - t1));
  const A3 = mix(p2, p3, (t3 - tt) / (t3 - t2), (tt - t2) / (t3 - t2));
  const B1 = mix(A1, A2, (t2 - tt) / (t2 - t0), (tt - t0) / (t2 - t0));
  const B2 = mix(A2, A3, (t3 - tt) / (t3 - t1), (tt - t1) / (t3 - t1));
  return mix(B1, B2, (t2 - tt) / (t2 - t1), (tt - t1) / (t2 - t1));
}

function mix(a: Pt2, b: Pt2, wa: number, wb: number): Pt2 {
  return { x: a.x * wa + b.x * wb, y: a.y * wa + b.y * wb };
}

export function catmullRomSample(
  p0: Pt2,
  p1: Pt2,
  p2: Pt2,
  p3: Pt2,
  n: number,
  alpha = 0.5,
): Pt2[] {
  if (!Number.isInteger(n) || n < 2) throw new Error('n must be integer >= 2');
  const out: Pt2[] = [];
  for (let i = 0; i < n; i++) out.push(catmullRomSpline(p0, p1, p2, p3, i / (n - 1), alpha));
  return out;
}
