// Rank-1 update of Cholesky factor: given lower-triangular L with L L^T = A,
// compute L' such that L' L'^T = A + sigma * x x^T (sigma=+1 update, -1 downdate)
// In-place style but returns new matrix.
export function choleskyUpdate(L: number[][], x: number[], sign: 1 | -1 = 1): number[][] {
  const n = L.length;
  if (n === 0) throw new Error('choleskyUpdate: empty');
  if (x.length !== n) throw new Error('choleskyUpdate: x length mismatch');
  for (const r of L) if (r.length !== n) throw new Error('choleskyUpdate: not square');
  const Lp = L.map((r) => r.slice());
  const xp = x.slice();
  for (let k = 0; k < n; k++) {
    const lkk = Lp[k][k];
    const inside = lkk * lkk + sign * xp[k] * xp[k];
    if (inside <= 0) throw new Error('choleskyUpdate: not positive definite');
    const r = Math.sqrt(inside);
    const c = r / lkk;
    const s = xp[k] / lkk;
    Lp[k][k] = r;
    for (let i = k + 1; i < n; i++) {
      Lp[i][k] = (Lp[i][k] + sign * s * xp[i]) / c;
      xp[i] = c * xp[i] - s * Lp[i][k];
    }
  }
  return Lp;
}
