export interface QRDecomposition {
  Q: number[][];
  R: number[][];
}

function clone(M: number[][]): number[][] {
  return M.map((r) => r.slice());
}

export function qrDecompose(A: number[][]): QRDecomposition {
  const m = A.length;
  if (m === 0) throw new Error('empty matrix');
  const n = A[0].length;
  for (const row of A) if (row.length !== n) throw new Error('jagged matrix');
  if (m < n) throw new Error('rows must be >= cols');

  const Q: number[][] = Array.from({ length: m }, (_, i) =>
    Array.from({ length: m }, (_, j) => (i === j ? 1 : 0)),
  );
  const R: number[][] = clone(A);

  for (let k = 0; k < Math.min(n, m - 1); k++) {
    let normSq = 0;
    for (let i = k; i < m; i++) normSq += R[i][k] * R[i][k];
    const norm = Math.sqrt(normSq);
    if (norm === 0) continue;
    const sign = R[k][k] >= 0 ? 1 : -1;
    const v: number[] = new Array(m).fill(0);
    v[k] = R[k][k] + sign * norm;
    for (let i = k + 1; i < m; i++) v[i] = R[i][k];
    let vNorm = 0;
    for (let i = k; i < m; i++) vNorm += v[i] * v[i];
    if (vNorm === 0) continue;
    // Apply H = I - 2 v v^T / vNorm to R (left)
    for (let j = k; j < n; j++) {
      let dot = 0;
      for (let i = k; i < m; i++) dot += v[i] * R[i][j];
      const c = (2 * dot) / vNorm;
      for (let i = k; i < m; i++) R[i][j] -= c * v[i];
    }
    // Apply H to Q on the right: Q = Q * H => Q[i,:] -= (2/vNorm) * (Q[i,:] · v) * v
    for (let i = 0; i < m; i++) {
      let dot = 0;
      for (let j = k; j < m; j++) dot += Q[i][j] * v[j];
      const c = (2 * dot) / vNorm;
      for (let j = k; j < m; j++) Q[i][j] -= c * v[j];
    }
  }
  return { Q, R };
}
