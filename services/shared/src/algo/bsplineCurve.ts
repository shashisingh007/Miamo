/**
 * B-spline curve evaluation via de Boor's algorithm.
 * Supports clamped or arbitrary knot vectors of length m+1 with m = n + p,
 * where n+1 is the number of control points and p is the degree.
 */

export interface BSpline {
  degree: number;
  knots: number[];
  control: number[][]; // control[i] = vector of any dimension
}

export function buildBSpline(degree: number, knots: number[], control: number[][]): BSpline {
  if (!Number.isInteger(degree) || degree < 1) throw new Error('degree must be integer >= 1');
  if (!Array.isArray(knots) || knots.length < 2) throw new Error('need knots');
  if (!Array.isArray(control) || control.length === 0) throw new Error('need control points');
  const expected = control.length + degree + 1;
  if (knots.length !== expected) {
    throw new Error(`knots length must be n+p+2 (control=${control.length}, p=${degree}, expected=${expected}, got=${knots.length})`);
  }
  const dim = control[0].length;
  for (const c of control) {
    if (c.length !== dim) throw new Error('control points must share dimension');
  }
  for (let i = 1; i < knots.length; i++) {
    if (knots[i] < knots[i - 1]) throw new Error('knots must be non-decreasing');
  }
  return { degree, knots: knots.slice(), control: control.map((c) => c.slice()) };
}

export function evalBSpline(spline: BSpline, t: number): number[] {
  const { degree: p, knots, control } = spline;
  const n = control.length - 1;
  const tmin = knots[p];
  const tmax = knots[n + 1];
  if (!Number.isFinite(t)) throw new Error('t must be finite');
  if (t < tmin || t > tmax) throw new Error('t outside valid domain');

  // find knot span k such that knots[k] <= t < knots[k+1] (clamp at right)
  let k = -1;
  if (t === tmax) {
    // last span containing t
    k = n;
    while (k > p && knots[k] === tmax) k--;
  } else {
    for (let i = p; i <= n; i++) {
      if (knots[i] <= t && t < knots[i + 1]) {
        k = i;
        break;
      }
    }
  }
  if (k < 0) throw new Error('no knot span found');

  const dim = control[0].length;
  // de Boor: copy p+1 control points starting at k-p
  const d: number[][] = [];
  for (let i = 0; i <= p; i++) d.push(control[k - p + i].slice());

  for (let r = 1; r <= p; r++) {
    for (let j = p; j >= r; j--) {
      const i = k - p + j;
      const denom = knots[i + p - r + 1] - knots[i];
      const alpha = denom === 0 ? 0 : (t - knots[i]) / denom;
      for (let c = 0; c < dim; c++) {
        d[j][c] = (1 - alpha) * d[j - 1][c] + alpha * d[j][c];
      }
    }
  }
  return d[p];
}

export function clampedKnots(degree: number, nControl: number): number[] {
  if (!Number.isInteger(degree) || degree < 1) throw new Error('degree must be int >= 1');
  if (!Number.isInteger(nControl) || nControl <= degree) {
    throw new Error('nControl must be integer > degree');
  }
  const m = nControl + degree + 1;
  const k: number[] = new Array(m);
  for (let i = 0; i <= degree; i++) k[i] = 0;
  for (let i = m - degree - 1; i < m; i++) k[i] = 1;
  const inner = m - 2 * (degree + 1);
  for (let i = 0; i < inner; i++) k[degree + 1 + i] = (i + 1) / (inner + 1);
  return k;
}

export function bsplineSample(spline: BSpline, n: number): number[][] {
  if (!Number.isInteger(n) || n < 2) throw new Error('n must be integer >= 2');
  const { degree: p, knots, control } = spline;
  const tmin = knots[p];
  const tmax = knots[control.length];
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const t = tmin + ((tmax - tmin) * i) / (n - 1);
    out.push(evalBSpline(spline, t));
  }
  return out;
}
