// Determinant via LU decomposition with partial pivoting.
// Returns the signed determinant (with sign flips for row swaps).

export function matrixDeterminant(A: number[][]): number {
  const n = A.length;
  if (n === 0) throw new Error('empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('matrix must be square');

  const M: number[][] = A.map((r) => r.slice());
  let sign = 1;

  for (let k = 0; k < n; k++) {
    // Partial pivot
    let piv = k;
    let pivMag = Math.abs(M[k][k]);
    for (let i = k + 1; i < n; i++) {
      const m = Math.abs(M[i][k]);
      if (m > pivMag) {
        pivMag = m;
        piv = i;
      }
    }
    if (pivMag < 1e-15) return 0;
    if (piv !== k) {
      const tmp = M[k];
      M[k] = M[piv];
      M[piv] = tmp;
      sign = -sign;
    }
    for (let i = k + 1; i < n; i++) {
      const f = M[i][k] / M[k][k];
      if (f === 0) continue;
      for (let j = k; j < n; j++) M[i][j] -= f * M[k][j];
    }
  }

  let det = sign;
  for (let i = 0; i < n; i++) det *= M[i][i];
  return det;
}
