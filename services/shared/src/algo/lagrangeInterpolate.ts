// Lagrange polynomial interpolation. Given n distinct nodes (x_i, y_i),
// returns the value of the unique degree-(n-1) polynomial P(x) at the
// query point. All x-values must be distinct.

export interface InterpPoint {
  x: number;
  y: number;
}

export function lagrangeInterpolate(points: InterpPoint[], xq: number): number {
  if (points.length === 0) throw new RangeError('need at least one point');
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (points[i].x === points[j].x) throw new RangeError('x values must be distinct');
    }
  }
  let result = 0;
  for (let i = 0; i < points.length; i++) {
    let term = points[i].y;
    for (let j = 0; j < points.length; j++) {
      if (j === i) continue;
      term *= (xq - points[j].x) / (points[i].x - points[j].x);
    }
    result += term;
  }
  return result;
}
