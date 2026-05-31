export interface CubicSpline {
  xs: number[];
  a: number[];
  b: number[];
  c: number[];
  d: number[];
}

export function cubicSplineBuild(xs: number[], ys: number[]): CubicSpline {
  const n = xs.length;
  if (n < 2) throw new Error('need at least 2 samples');
  if (ys.length !== n) throw new Error('xs/ys length mismatch');
  for (let i = 1; i < n; i++) if (xs[i] <= xs[i - 1]) throw new Error('xs must be strictly increasing');

  const h = new Array(n - 1).fill(0);
  for (let i = 0; i < n - 1; i++) h[i] = xs[i + 1] - xs[i];

  // Natural cubic spline: solve tridiagonal for c
  const alpha = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    alpha[i] = (3 / h[i]) * (ys[i + 1] - ys[i]) - (3 / h[i - 1]) * (ys[i] - ys[i - 1]);
  }
  const l = new Array(n).fill(0);
  const mu = new Array(n).fill(0);
  const z = new Array(n).fill(0);
  l[0] = 1;
  for (let i = 1; i < n - 1; i++) {
    l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }
  l[n - 1] = 1;
  const c = new Array(n).fill(0);
  const b = new Array(n - 1).fill(0);
  const d = new Array(n - 1).fill(0);
  const a = ys.slice(0, n - 1);
  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (ys[j + 1] - ys[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }
  return { xs: xs.slice(), a, b, c: c.slice(0, n - 1), d };
}

export function cubicSplineEval(s: CubicSpline, x: number): number {
  const xs = s.xs;
  const n = xs.length;
  let lo = 0, hi = n - 2;
  if (x <= xs[0]) lo = 0;
  else if (x >= xs[n - 1]) lo = n - 2;
  else {
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid - 1;
    }
  }
  const dx = x - xs[lo];
  return s.a[lo] + s.b[lo] * dx + s.c[lo] * dx * dx + s.d[lo] * dx * dx * dx;
}
