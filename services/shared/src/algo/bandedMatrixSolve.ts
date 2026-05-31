// Solve a banded linear system A*x = y where A has lower bandwidth p and upper bandwidth q.
// A is provided as a dense n x n matrix; entries with |i-j| > max(p,q) are ignored.
// Uses banded Gaussian elimination with partial pivoting (LAPACK gbsv-style scheme,
// expanded fill of width p+q allowed).

export function bandedMatrixSolve(
  A: number[][],
  y: number[],
  p: number,
  q: number,
): number[] {
  const n = A.length;
  if (n === 0) throw new Error('bandedMatrixSolve: empty');
  if (y.length !== n) throw new Error('bandedMatrixSolve: length mismatch');
  for (const row of A) if (row.length !== n) throw new Error('bandedMatrixSolve: A must be square');
  if (!Number.isInteger(p) || p < 0) throw new Error('bandedMatrixSolve: invalid p');
  if (!Number.isInteger(q) || q < 0) throw new Error('bandedMatrixSolve: invalid q');

  // Work on a copy
  const M: number[][] = A.map((r) => r.slice());
  const b = y.slice();

  for (let k = 0; k < n; k++) {
    let pivRow = k;
    let max = Math.abs(M[k][k]);
    const lastRow = Math.min(n - 1, k + p);
    for (let i = k + 1; i <= lastRow; i++) {
      const v = Math.abs(M[i][k]);
      if (v > max) { max = v; pivRow = i; }
    }
    if (max < 1e-14) throw new Error('bandedMatrixSolve: singular');
    if (pivRow !== k) {
      [M[k], M[pivRow]] = [M[pivRow], M[k]];
      [b[k], b[pivRow]] = [b[pivRow], b[k]];
    }
    const lastCol = Math.min(n - 1, k + p + q);
    for (let i = k + 1; i <= lastRow; i++) {
      const f = M[i][k] / M[k][k];
      if (f === 0) continue;
      for (let j = k; j <= lastCol; j++) M[i][j] -= f * M[k][j];
      b[i] -= f * b[k];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    const last = Math.min(n - 1, i + p + q);
    for (let j = i + 1; j <= last; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}
