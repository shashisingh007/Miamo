// Kronecker product of two matrices: (A ⊗ B) is (m1*m2) x (n1*n2).

export function kroneckerProduct(A: number[][], B: number[][]): number[][] {
  if (!A.length || !B.length) throw new Error('kroneckerProduct: empty');
  const m1 = A.length, n1 = A[0].length;
  const m2 = B.length, n2 = B[0].length;
  for (const r of A) if (r.length !== n1) throw new Error('kroneckerProduct: A ragged');
  for (const r of B) if (r.length !== n2) throw new Error('kroneckerProduct: B ragged');
  const C: number[][] = Array.from({ length: m1 * m2 }, () => new Array(n1 * n2).fill(0));
  for (let i = 0; i < m1; i++) {
    for (let j = 0; j < n1; j++) {
      const a = A[i][j];
      if (a === 0) continue;
      for (let p = 0; p < m2; p++) {
        for (let q = 0; q < n2; q++) {
          C[i * m2 + p][j * n2 + q] = a * B[p][q];
        }
      }
    }
  }
  return C;
}
