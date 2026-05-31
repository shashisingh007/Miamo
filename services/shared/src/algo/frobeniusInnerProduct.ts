// Frobenius inner product of two real matrices: <A, B>_F = sum_ij A[i][j] * B[i][j].
// Equivalent to trace(A^T B). Frobenius norm of A is sqrt(<A, A>_F).

export function frobeniusInnerProduct(A: number[][], B: number[][]): number {
  if (!Array.isArray(A) || A.length === 0) throw new Error('frobeniusInnerProduct: empty');
  if (!Array.isArray(B) || B.length !== A.length) throw new Error('frobeniusInnerProduct: row count mismatch');
  const m = A.length;
  const n = A[0].length;
  if (n === 0) throw new Error('frobeniusInnerProduct: zero-width');
  for (let i = 0; i < m; i++) {
    if (A[i].length !== n) throw new Error('frobeniusInnerProduct: ragged A');
    if (B[i].length !== n) throw new Error('frobeniusInnerProduct: dim mismatch');
  }
  let s = 0;
  for (let i = 0; i < m; i++) {
    const ar = A[i], br = B[i];
    for (let j = 0; j < n; j++) s += ar[j] * br[j];
  }
  return s;
}

export function frobeniusNorm(A: number[][]): number {
  return Math.sqrt(frobeniusInnerProduct(A, A));
}
