/**
 * Monotonic cubic interpolation via Fritsch–Carlson method.
 * Preserves monotonicity of the input data while producing C^1 cubics.
 */

export interface MonotonicCubicSpline {
  x: number[];
  y: number[];
  m: number[]; // tangents
}

export function buildMonotonicCubicSpline(x: number[], y: number[]): MonotonicCubicSpline {
  if (x.length !== y.length) throw new Error('x and y length mismatch');
  const n = x.length;
  if (n < 2) throw new Error('need at least 2 points');
  for (let i = 1; i < n; i++) {
    if (!(x[i] > x[i - 1])) throw new Error('x must be strictly increasing');
  }

  const dx = new Array(n - 1);
  const slope = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    dx[i] = x[i + 1] - x[i];
    slope[i] = (y[i + 1] - y[i]) / dx[i];
  }

  const m = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (slope[i - 1] + slope[i]) / 2;
    }
  }

  // Fritsch–Carlson constraint
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }

  return { x: x.slice(), y: y.slice(), m };
}

export function evalMonotonicCubicSpline(s: MonotonicCubicSpline, xq: number): number {
  const { x, y, m } = s;
  const n = x.length;
  if (!Number.isFinite(xq)) throw new Error('xq must be finite');
  if (xq < x[0] || xq > x[n - 1]) throw new Error('xq out of range');

  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (x[mid] <= xq) lo = mid;
    else hi = mid;
  }
  const h = x[hi] - x[lo];
  const t = (xq - x[lo]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * y[lo] + h10 * h * m[lo] + h01 * y[hi] + h11 * h * m[hi];
}

export function monotonicCubicInterpolate(x: number[], y: number[], xq: number[]): number[] {
  const s = buildMonotonicCubicSpline(x, y);
  return xq.map((q) => evalMonotonicCubicSpline(s, q));
}
