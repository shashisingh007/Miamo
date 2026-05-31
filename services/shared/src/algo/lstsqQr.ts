// Least squares solver via QR decomposition: minimizes ||A x - b||_2 for m >= n full-rank A.

import { qrDecompose } from './qrDecompose';

export function lstsqQr(A: number[][], b: number[]): number[] {
  if (!A.length) throw new Error('lstsqQr: empty');
  const m = A.length;
  const n = A[0].length;
  if (b.length !== m) throw new Error('lstsqQr: b length mismatch');
  const { Q, R } = qrDecompose(A);
  // Compute c = Q^T b (length m); take first n entries
  const c = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < m; k++) s += Q[k][i] * b[k];
    c[i] = s;
  }
  // Back-substitute with R (n x n upper triangular)
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = c[i];
    for (let j = i + 1; j < n; j++) s -= R[i][j] * x[j];
    if (Math.abs(R[i][i]) < 1e-14) throw new Error('lstsqQr: rank deficient');
    x[i] = s / R[i][i];
  }
  return x;
}
