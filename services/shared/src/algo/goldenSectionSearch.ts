export interface GoldenSectionOptions {
  tol?: number;
  maxIter?: number;
}

export interface GoldenSectionResult {
  x: number;
  fx: number;
  iters: number;
  converged: boolean;
}

const PHI = (Math.sqrt(5) - 1) / 2;

export function goldenSectionSearch(
  f: (x: number) => number,
  a: number,
  b: number,
  opts: GoldenSectionOptions = {},
): GoldenSectionResult {
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('goldenSection: bounds finite');
  if (!(a < b)) throw new Error('goldenSection: a<b required');
  const tol = opts.tol ?? 1e-8;
  const maxIter = opts.maxIter ?? 200;
  if (!(tol > 0)) throw new Error('goldenSection: tol>0');
  if (!(maxIter >= 1)) throw new Error('goldenSection: maxIter>=1');
  let lo = a;
  let hi = b;
  let c = hi - PHI * (hi - lo);
  let d = lo + PHI * (hi - lo);
  let fc = f(c);
  let fd = f(d);
  if (!Number.isFinite(fc) || !Number.isFinite(fd)) throw new Error('goldenSection: non-finite f');
  let it = 0;
  let converged = false;
  for (it = 0; it < maxIter; it++) {
    if (Math.abs(hi - lo) < tol) {
      converged = true;
      break;
    }
    if (fc < fd) {
      hi = d;
      d = c;
      fd = fc;
      c = hi - PHI * (hi - lo);
      fc = f(c);
    } else {
      lo = c;
      c = d;
      fc = fd;
      d = lo + PHI * (hi - lo);
      fd = f(d);
    }
    if (!Number.isFinite(fc) || !Number.isFinite(fd)) throw new Error('goldenSection: non-finite f');
  }
  const x = (lo + hi) / 2;
  return { x, fx: f(x), iters: it, converged };
}
