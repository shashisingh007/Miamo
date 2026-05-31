function isSquare(m: readonly (readonly number[])[]): boolean {
  const n = m.length;
  if (n === 0) return false;
  return m.every((row) => row.length === n);
}

export function mahalanobisDistance(
  x: readonly number[],
  mean: readonly number[],
  invCov: readonly (readonly number[])[]
): number {
  const n = x.length;
  if (n === 0) throw new Error('x must be non-empty');
  if (mean.length !== n) throw new Error('mean must match x dimension');
  if (!isSquare(invCov)) throw new Error('invCov must be a square matrix');
  if (invCov.length !== n) throw new Error('invCov must match x dimension');
  for (const v of x) if (!Number.isFinite(v)) throw new Error('x entries must be finite');
  for (const v of mean) if (!Number.isFinite(v)) throw new Error('mean entries must be finite');
  for (const row of invCov)
    for (const v of row)
      if (!Number.isFinite(v)) throw new Error('invCov entries must be finite');
  const d = new Array<number>(n);
  for (let i = 0; i < n; i++) d[i] = x[i] - mean[i];
  let s = 0;
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let j = 0; j < n; j++) acc += invCov[i][j] * d[j];
    s += d[i] * acc;
  }
  if (s < 0) {
    if (s > -1e-10) return 0;
    throw new Error('invCov is not positive semi-definite');
  }
  return Math.sqrt(s);
}
