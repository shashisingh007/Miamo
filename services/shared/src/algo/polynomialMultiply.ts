// Polynomial multiplication via direct convolution.
// Coefficients indexed by ascending power: a[i] is coefficient of x^i.
// Trailing zeros are trimmed (except the zero polynomial which is [0]).

function trim(p: number[]): number[] {
  let i = p.length - 1;
  while (i > 0 && p[i] === 0) i--;
  return p.slice(0, i + 1);
}

export function polynomialMultiply(a: number[], b: number[]): number[] {
  if (a.length === 0 || b.length === 0) throw new Error('empty polynomial');
  for (const v of a) if (!Number.isFinite(v)) throw new Error('non-finite coefficient');
  for (const v of b) if (!Number.isFinite(v)) throw new Error('non-finite coefficient');
  const out: number[] = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === 0) continue;
    for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  }
  return trim(out);
}
