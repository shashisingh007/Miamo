// Matrix square root via Denman-Beavers iteration.
// Y_0 = A, Z_0 = I; Y_{k+1} = 0.5*(Y_k + Z_k^{-1}), Z_{k+1} = 0.5*(Z_k + Y_k^{-1}).
// Y converges to sqrt(A), Z to sqrt(A)^{-1}. Requires A invertible with no eigenvalues
// on the closed negative real axis.

function inverse(M: number[][]): number[][] {
  const n = M.length;
  const A: number[][] = M.map((r) => r.slice());
  const I: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[i] = 1;
    I.push(row);
  }
  for (let k = 0; k < n; k++) {
    let p = k;
    let max = Math.abs(A[k][k]);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(A[i][k]);
      if (v > max) { max = v; p = i; }
    }
    if (max < 1e-14) throw new Error('matrixSqrt: singular intermediate');
    if (p !== k) { [A[k], A[p]] = [A[p], A[k]]; [I[k], I[p]] = [I[p], I[k]]; }
    const piv = A[k][k];
    for (let j = 0; j < n; j++) { A[k][j] /= piv; I[k][j] /= piv; }
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const f = A[i][k];
      if (f === 0) continue;
      for (let j = 0; j < n; j++) {
        A[i][j] -= f * A[k][j];
        I[i][j] -= f * I[k][j];
      }
    }
  }
  return I;
}

function frobDiff(A: number[][], B: number[][]): number {
  let s = 0;
  for (let i = 0; i < A.length; i++) for (let j = 0; j < A[0].length; j++) {
    const d = A[i][j] - B[i][j];
    s += d * d;
  }
  return Math.sqrt(s);
}

export function matrixSqrt(A: number[][], opts: { maxIter?: number; tol?: number } = {}): number[][] {
  const n = A.length;
  if (n === 0) throw new Error('matrixSqrt: empty');
  for (const row of A) if (row.length !== n) throw new Error('matrixSqrt: must be square');

  const maxIter = opts.maxIter ?? 200;
  const tol = opts.tol ?? 1e-12;

  let Y: number[][] = A.map((r) => r.slice());
  let Z: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[i] = 1;
    Z.push(row);
  }
  for (let it = 0; it < maxIter; it++) {
    const Yinv = inverse(Y);
    const Zinv = inverse(Z);
    const Ynew: number[][] = [];
    const Znew: number[][] = [];
    for (let i = 0; i < n; i++) {
      const yr = new Array(n);
      const zr = new Array(n);
      for (let j = 0; j < n; j++) {
        yr[j] = 0.5 * (Y[i][j] + Zinv[i][j]);
        zr[j] = 0.5 * (Z[i][j] + Yinv[i][j]);
      }
      Ynew.push(yr);
      Znew.push(zr);
    }
    const diff = frobDiff(Y, Ynew);
    Y = Ynew;
    Z = Znew;
    if (diff < tol) break;
  }
  return Y;
}
