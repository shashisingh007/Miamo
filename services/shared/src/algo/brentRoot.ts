// Brent's root-finding method. Combines bisection, secant, and inverse
// quadratic interpolation. Requires f(a) and f(b) to bracket a root
// (opposite signs).

export interface BrentOptions {
  tol?: number;
  maxIter?: number;
}

export interface BrentResult {
  root: number;
  iterations: number;
  converged: boolean;
}

export function brentRoot(
  f: (x: number) => number,
  a: number,
  b: number,
  opts: BrentOptions = {}
): BrentResult {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new RangeError('bracket endpoints must be finite');
  }
  let fa = f(a);
  let fb = f(b);
  if (fa === 0) return { root: a, iterations: 0, converged: true };
  if (fb === 0) return { root: b, iterations: 0, converged: true };
  if (fa * fb > 0) throw new RangeError('f(a) and f(b) must have opposite signs');
  if (Math.abs(fa) < Math.abs(fb)) {
    [a, b] = [b, a];
    [fa, fb] = [fb, fa];
  }
  let c = a;
  let fc = fa;
  let d = b - a;
  let e = d;
  const tol = opts.tol ?? 1e-12;
  const maxIter = opts.maxIter ?? 100;
  for (let iter = 1; iter <= maxIter; iter++) {
    if (fb === 0 || Math.abs(b - a) <= tol) {
      return { root: b, iterations: iter, converged: true };
    }
    if (fa !== fc && fb !== fc) {
      // Inverse quadratic interpolation.
      const s =
        (a * fb * fc) / ((fa - fb) * (fa - fc)) +
        (b * fa * fc) / ((fb - fa) * (fb - fc)) +
        (c * fa * fb) / ((fc - fa) * (fc - fb));
      const useBisect = !(
        (s > (3 * a + b) / 4 && s < b) || (s < (3 * a + b) / 4 && s > b)
      );
      if (useBisect) {
        const m = (a + b) / 2;
        d = m - b;
        e = d;
        const newB = m;
        c = b;
        fc = fb;
        b = newB;
        fb = f(b);
      } else {
        e = d;
        d = s - b;
        c = b;
        fc = fb;
        b = s;
        fb = f(b);
      }
    } else {
      // Secant.
      const s = b - (fb * (b - a)) / (fb - fa);
      e = d;
      d = s - b;
      c = b;
      fc = fb;
      b = s;
      fb = f(b);
    }
    if (fa * fb > 0) {
      a = c;
      fa = fc;
    }
    if (Math.abs(fa) < Math.abs(fb)) {
      [a, b] = [b, a];
      [fa, fb] = [fb, fa];
    }
  }
  return { root: b, iterations: maxIter, converged: false };
}
