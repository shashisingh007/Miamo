// Solve a circulant system C * x = y where C is determined by its first column c.
// C_ij = c[(i - j) mod n]. Uses straightforward direct solve via Gaussian elimination.

export function circulantSolve(c: number[], y: number[]): number[] {
  const n = c.length;
  if (n === 0) throw new Error('circulantSolve: empty');
  if (y.length !== n) throw new Error('circulantSolve: length mismatch');

  const A: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n);
    for (let j = 0; j < n; j++) row[j] = c[((i - j) % n + n) % n];
    A.push(row);
  }
  const b = y.slice();

  for (let k = 0; k < n; k++) {
    let p = k;
    let max = Math.abs(A[k][k]);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(A[i][k]);
      if (v > max) {
        max = v;
        p = i;
      }
    }
    if (max < 1e-14) throw new Error('circulantSolve: singular');
    if (p !== k) {
      [A[k], A[p]] = [A[p], A[k]];
      [b[k], b[p]] = [b[p], b[k]];
    }
    for (let i = k + 1; i < n; i++) {
      const f = A[i][k] / A[k][k];
      for (let j = k; j < n; j++) A[i][j] -= f * A[k][j];
      b[i] -= f * b[k];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
    x[i] = s / A[i][i];
  }
  return x;
}
