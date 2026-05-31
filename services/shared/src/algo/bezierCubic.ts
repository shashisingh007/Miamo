export interface Point2D {
  x: number;
  y: number;
}

function lerp(a: Point2D, b: Point2D, t: number): Point2D {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function validateCp(cp: Point2D[], required: number): void {
  if (!Array.isArray(cp) || cp.length !== required)
    throw new Error(`bezierCubic: ${required} control points required`);
  for (const p of cp) {
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number')
      throw new Error('bezierCubic: control points need numeric x,y');
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y))
      throw new Error('bezierCubic: control points must be finite');
  }
}

export function bezierCubic(cp: Point2D[], t: number): Point2D {
  validateCp(cp, 4);
  if (!Number.isFinite(t) || t < 0 || t > 1)
    throw new Error('bezierCubic: t must be in [0,1]');
  const a = lerp(cp[0], cp[1], t);
  const b = lerp(cp[1], cp[2], t);
  const c = lerp(cp[2], cp[3], t);
  const d = lerp(a, b, t);
  const e = lerp(b, c, t);
  return lerp(d, e, t);
}

export function bezierCubicDerivative(cp: Point2D[], t: number): Point2D {
  validateCp(cp, 4);
  if (!Number.isFinite(t) || t < 0 || t > 1)
    throw new Error('bezierCubicDerivative: t must be in [0,1]');
  // derivative is degree-2 bezier with cp diffs scaled by 3
  const q0 = { x: 3 * (cp[1].x - cp[0].x), y: 3 * (cp[1].y - cp[0].y) };
  const q1 = { x: 3 * (cp[2].x - cp[1].x), y: 3 * (cp[2].y - cp[1].y) };
  const q2 = { x: 3 * (cp[3].x - cp[2].x), y: 3 * (cp[3].y - cp[2].y) };
  const a = lerp(q0, q1, t);
  const b = lerp(q1, q2, t);
  return lerp(a, b, t);
}

export function bezierCubicSubdivide(
  cp: Point2D[],
  t: number,
): { left: Point2D[]; right: Point2D[] } {
  validateCp(cp, 4);
  if (!Number.isFinite(t) || t < 0 || t > 1)
    throw new Error('bezierCubicSubdivide: t must be in [0,1]');
  const a = lerp(cp[0], cp[1], t);
  const b = lerp(cp[1], cp[2], t);
  const c = lerp(cp[2], cp[3], t);
  const d = lerp(a, b, t);
  const e = lerp(b, c, t);
  const f = lerp(d, e, t);
  return {
    left: [cp[0], a, d, f],
    right: [f, e, c, cp[3]],
  };
}

export function bezierCubicSample(cp: Point2D[], steps: number): Point2D[] {
  validateCp(cp, 4);
  if (!Number.isInteger(steps) || steps < 1)
    throw new Error('bezierCubicSample: steps must be positive integer');
  const out: Point2D[] = [];
  for (let i = 0; i <= steps; i++) out.push(bezierCubic(cp, i / steps));
  return out;
}
