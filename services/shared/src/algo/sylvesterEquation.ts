// Solve the Sylvester equation A*X + X*B = C for X.
// A is m x m, B is n x n, C is m x n. Uses vectorization:
//   (I_n \kron A + B^T \kron I_m) vec(X) = vec(C)
// where vec stacks columns. Solves via Gaussian elimination.

function checkRect(M: number[][], rows: number, cols: number, name: string): void {
  if (M.length !== rows) throw new Error(`sylvesterEquation: ${name} has wrong rows`);
  for (const row of M) if (row.length !== cols) throw new Error(`sylvesterEquation: ${name} has ragged columns`);
}

export function sylvesterEquation(A: number[][], B: number[][], C: number[][]): number[][] {
  const m = A.length;
  if (m === 0) throw new Error('sylvesterEquation: A is empty');
  for (const row of A) if (row.length !== m) throw new Error('sylvesterEquation: A must be square');
  const n = B.length;
  if (n === 0) throw new Error('sylvesterEquation: B is empty');
  for (const row of B) if (row.length !== n) throw new Error('sylvesterEquation: B must be square');
  checkRect(C, m, n, 'C');

  const N = m * n;
  // Build N x N system M and rhs r in column-major vec ordering: index = j*m + i
  const M: number[][] = [];
  for (let k = 0; k < N; k++) M.push(new Array(N).fill(0));
  const r = new Array(N).fill(0);

  // (I_n \kron A) contribution: for each column j of X, A acts on column j.
  // Entry (j*m + i, j*m + p) += A[i][p]
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      for (let p = 0; p < m; p++) {
        M[j * m + i][j * m + p] += A[i][p];
      }
    }
  }
  // (B^T \kron I_m) contribution: vec(X*B) = (B^T \kron I_m) vec(X)
  // Entry (j*m + i, q*m + i) += B[q][j]  (since (B^T)[j][q] = B[q][j])
  for (let j = 0; j < n; j++) {
    for (let q = 0; q < n; q++) {
      const bqj = B[q][j];
      if (bqj === 0) continue;
      for (let i = 0; i < m; i++) {
        M[j * m + i][q * m + i] += bqj;
      }
    }
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < m; i++) r[j * m + i] = C[i][j];

  // Gaussian elimination
  for (let k = 0; k < N; k++) {
    let p = k;
    let max = Math.abs(M[k][k]);
    for (let i = k + 1; i < N; i++) {
      const v = Math.abs(M[i][k]);
      if (v > max) { max = v; p = i; }
    }
    if (max < 1e-12) throw new Error('sylvesterEquation: singular (A and -B share an eigenvalue)');
    if (p !== k) { [M[k], M[p]] = [M[p], M[k]]; [r[k], r[p]] = [r[p], r[k]]; }
    for (let i = k + 1; i < N; i++) {
      const f = M[i][k] / M[k][k];
      if (f === 0) continue;
      for (let j = k; j < N; j++) M[i][j] -= f * M[k][j];
      r[i] -= f * r[k];
    }
  }
  const x = new Array(N).fill(0);
  for (let i = N - 1; i >= 0; i--) {
    let s = r[i];
    for (let j = i + 1; j < N; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  // Reshape vec back to X (m x n)
  const X: number[][] = [];
  for (let i = 0; i < m; i++) X.push(new Array(n));
  for (let j = 0; j < n; j++) for (let i = 0; i < m; i++) X[i][j] = x[j * m + i];
  return X;
}
