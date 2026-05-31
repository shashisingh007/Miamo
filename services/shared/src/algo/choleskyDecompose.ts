// Cholesky decomposition A = L L^T for symmetric positive-definite matrices.
// Throws when A is not SPD. Includes a solve helper that performs forward
// then back substitution.

export function choleskyDecompose(A: number[][]): number[][] {
  const n = A.length;
  if (n === 0) return [];
  for (const row of A) {
    if (row.length !== n) throw new RangeError('A must be square');
  }
  const L: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (s <= 0) throw new Error('matrix is not positive definite');
        L[i][j] = Math.sqrt(s);
      } else {
        L[i][j] = s / L[j][j];
      }
    }
  }
  return L;
}

export function choleskySolve(L: number[][], b: number[]): number[] {
  const n = b.length;
  if (L.length !== n) throw new RangeError('b length mismatch');
  const y = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let j = 0; j < i; j++) s -= L[i][j] * y[j];
    y[i] = s / L[i][i];
  }
  const x = new Array<number>(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let j = i + 1; j < n; j++) s -= L[j][i] * x[j];
    x[i] = s / L[i][i];
  }
  return x;
}
