/**
 * Tanh-Sinh (double exponential) quadrature.
 * Highly accurate for smooth integrands, especially with endpoint singularities.
 * Integrates over [a,b] (a<b finite).
 */

export function tanhSinhQuad(
  f: (x: number) => number,
  a: number,
  b: number,
  level = 6,
  tol = 1e-12,
): number {
  if (typeof f !== 'function') throw new Error('f must be function');
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('endpoints must be finite');
  if (a >= b) throw new Error('require a < b');
  if (!Number.isInteger(level) || level < 1) throw new Error('level must be integer >= 1');
  if (!(tol > 0)) throw new Error('tol must be positive');

  const c = 0.5 * (b - a);
  const d = 0.5 * (b + a);
  const halfPi = Math.PI / 2;

  let prev = NaN;
  let result = NaN;

  for (let lev = 1; lev <= level; lev++) {
    const h = Math.pow(2, -lev);
    let sum = 0;
    if (lev === 1) {
      // include t=0 once
      sum += f(d) * halfPi;
    } else {
      // carry over previous nodes implicitly: we recompute fully for simplicity
      sum = computeAll(f, a, b, h, halfPi, c, d);
      result = h * c * sum;
      if (Number.isFinite(prev) && Math.abs(result - prev) < tol * Math.max(1, Math.abs(result))) {
        return result;
      }
      prev = result;
      continue;
    }
    // lev=1: also add k=±1
    for (const k of [-1, 1]) {
      const t = k * h;
      const u = halfPi * Math.sinh(t);
      const cu = Math.cosh(u);
      const x = c * Math.tanh(u) + d;
      const w = (halfPi * Math.cosh(t)) / (cu * cu);
      sum += f(x) * w;
    }
    result = h * c * sum;
    prev = result;
  }
  return result;
}

function computeAll(
  f: (x: number) => number,
  a: number,
  b: number,
  h: number,
  halfPi: number,
  c: number,
  d: number,
): number {
  let s = f(d) * halfPi;
  for (let k = 1; ; k++) {
    const t = k * h;
    const sh = Math.sinh(t);
    const u = halfPi * sh;
    if (!Number.isFinite(Math.cosh(u))) break;
    const cu = Math.cosh(u);
    const w = (halfPi * Math.cosh(t)) / (cu * cu);
    if (w < 1e-300) break;
    const xp = c * Math.tanh(u) + d;
    const xn = -c * Math.tanh(u) + d;
    if (xp >= b - 1e-300 && xn <= a + 1e-300) {
      // both ends pinned, weights vanish
    }
    const fp = xp >= b ? 0 : f(xp);
    const fn = xn <= a ? 0 : f(xn);
    s += w * (fp + fn);
    if (k > 4 && w < 1e-15) break;
  }
  return s;
}
