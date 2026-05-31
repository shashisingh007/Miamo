/**
 * Akima 1-D spline interpolation.
 * Reference: Akima (1970). Robust against outliers via local slope smoothing.
 */
export interface AkimaSpline {
  x: number[];
  y: number[];
  b: number[]; // first derivative at each knot
}

export function buildAkimaSpline(x: number[], y: number[]): AkimaSpline {
  if (x.length !== y.length) throw new Error('x and y length mismatch');
  const n = x.length;
  if (n < 2) throw new Error('need at least 2 points');
  for (let i = 1; i < n; i++) {
    if (!(x[i] > x[i - 1])) throw new Error('x must be strictly increasing');
  }

  // m[i] = slope of segment i (between i and i+1), i = 0..n-2
  const m = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) m[i] = (y[i + 1] - y[i]) / (x[i + 1] - x[i]);

  if (n === 2) {
    return { x: x.slice(), y: y.slice(), b: [m[0], m[0]] };
  }

  // Extend slopes by 2 on each side using Akima's extrapolation
  const ext: number[] = new Array(n + 3);
  for (let i = 0; i < n - 1; i++) ext[i + 2] = m[i];
  ext[1] = 2 * ext[2] - ext[3];
  ext[0] = 2 * ext[1] - ext[2];
  ext[n + 1] = 2 * ext[n] - ext[n - 1];
  ext[n + 2] = 2 * ext[n + 1] - ext[n];

  const b = new Array(n);
  for (let i = 0; i < n; i++) {
    const w1 = Math.abs(ext[i + 3] - ext[i + 2]);
    const w2 = Math.abs(ext[i + 1] - ext[i]);
    if (w1 + w2 === 0) {
      b[i] = 0.5 * (ext[i + 1] + ext[i + 2]);
    } else {
      b[i] = (w1 * ext[i + 1] + w2 * ext[i + 2]) / (w1 + w2);
    }
  }
  return { x: x.slice(), y: y.slice(), b };
}

export function evalAkimaSpline(s: AkimaSpline, xq: number): number {
  const { x, y, b } = s;
  const n = x.length;
  if (!Number.isFinite(xq)) throw new Error('xq must be finite');
  if (xq < x[0] || xq > x[n - 1]) throw new Error('xq out of range');

  // binary search for segment
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (x[mid] <= xq) lo = mid;
    else hi = mid;
  }
  const h = x[hi] - x[lo];
  const t = xq - x[lo];
  const m = (y[hi] - y[lo]) / h;
  const c2 = (3 * m - 2 * b[lo] - b[hi]) / h;
  const c3 = (b[lo] + b[hi] - 2 * m) / (h * h);
  return y[lo] + b[lo] * t + c2 * t * t + c3 * t * t * t;
}

export function akimaInterpolate(x: number[], y: number[], xq: number[]): number[] {
  const s = buildAkimaSpline(x, y);
  return xq.map((q) => evalAkimaSpline(s, q));
}
