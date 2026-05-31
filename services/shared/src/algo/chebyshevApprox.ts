export function chebyshevApprox(
  f: (x: number) => number,
  a: number,
  b: number,
  n: number,
): number[] {
  if (!(b > a)) throw new Error('chebyshevApprox: b > a required');
  if (!Number.isInteger(n) || n < 1) throw new Error('chebyshevApprox: n >= 1 integer required');
  const N = n;
  const fk: number[] = new Array(N);
  for (let k = 0; k < N; k++) {
    const xk = Math.cos((Math.PI * (k + 0.5)) / N);
    const x = 0.5 * (b - a) * xk + 0.5 * (b + a);
    const v = f(x);
    if (!Number.isFinite(v)) throw new Error('chebyshevApprox: f returned non-finite');
    fk[k] = v;
  }
  const c: number[] = new Array(N).fill(0);
  for (let j = 0; j < N; j++) {
    let s = 0;
    for (let k = 0; k < N; k++) s += fk[k] * Math.cos((Math.PI * j * (k + 0.5)) / N);
    c[j] = (2 / N) * s;
  }
  return c;
}

export function chebyshevEval(c: number[], a: number, b: number, x: number): number {
  if (c.length === 0) throw new Error('chebyshevEval: empty coefficients');
  if (!(b > a)) throw new Error('chebyshevEval: b > a required');
  if (x < a - 1e-12 || x > b + 1e-12) throw new Error('chebyshevEval: x out of range');
  const y = (2 * x - (a + b)) / (b - a);
  let d = 0;
  let dd = 0;
  for (let j = c.length - 1; j >= 1; j--) {
    const sv = d;
    d = 2 * y * d - dd + c[j];
    dd = sv;
  }
  return y * d - dd + 0.5 * c[0];
}
