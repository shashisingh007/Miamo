// Polynomial long division.
// Coefficients indexed by ascending power: a[i] is coefficient of x^i.
// Returns { quotient, remainder } with deg(remainder) < deg(divisor).

export interface PolyDivisionResult {
  quotient: number[];
  remainder: number[];
}

function trim(p: number[]): number[] {
  let i = p.length - 1;
  while (i > 0 && p[i] === 0) i--;
  return p.slice(0, i + 1);
}

function isZero(p: number[]): boolean {
  return p.length === 1 && p[0] === 0;
}

export function polynomialDivide(dividend: number[], divisor: number[]): PolyDivisionResult {
  if (dividend.length === 0 || divisor.length === 0) throw new Error('empty polynomial');
  for (const v of dividend) if (!Number.isFinite(v)) throw new Error('non-finite coefficient');
  for (const v of divisor) if (!Number.isFinite(v)) throw new Error('non-finite coefficient');
  const D = trim(divisor);
  if (isZero(D)) throw new Error('divide by zero polynomial');

  const N = trim(dividend);
  const degN = N.length - 1;
  const degD = D.length - 1;

  if (degN < degD) return { quotient: [0], remainder: N };

  const r = N.slice();
  const q: number[] = new Array(degN - degD + 1).fill(0);
  const lcD = D[degD];

  for (let k = degN - degD; k >= 0; k--) {
    const coef = r[k + degD] / lcD;
    q[k] = coef;
    if (coef === 0) continue;
    for (let j = 0; j <= degD; j++) r[k + j] -= coef * D[j];
  }

  return { quotient: trim(q), remainder: trim(r.slice(0, degD).length === 0 ? [0] : r.slice(0, degD)) };
}
