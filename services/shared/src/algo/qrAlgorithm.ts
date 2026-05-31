export interface QrEigenResult {
  eigenvalues: number[];
  iterations: number;
  converged: boolean;
}

function clone(M: number[][]): number[][] {
  return M.map((r) => r.slice());
}

function qrDecompose(A: number[][]): { Q: number[][]; R: number[][] } {
  const n = A.length;
  const R = clone(A);
  const Q: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
  for (let k = 0; k < n - 1; k++) {
    let normSq = 0;
    for (let i = k; i < n; i++) normSq += R[i][k] * R[i][k];
    const norm = Math.sqrt(normSq);
    if (norm === 0) continue;
    const sign = R[k][k] >= 0 ? 1 : -1;
    const v: number[] = new Array(n).fill(0);
    v[k] = R[k][k] + sign * norm;
    for (let i = k + 1; i < n; i++) v[i] = R[i][k];
    let vNormSq = 0;
    for (let i = k; i < n; i++) vNormSq += v[i] * v[i];
    if (vNormSq === 0) continue;
    for (let j = k; j < n; j++) {
      let dot = 0;
      for (let i = k; i < n; i++) dot += v[i] * R[i][j];
      const c = (2 * dot) / vNormSq;
      for (let i = k; i < n; i++) R[i][j] -= c * v[i];
    }
    for (let j = 0; j < n; j++) {
      let dot = 0;
      for (let i = k; i < n; i++) dot += v[i] * Q[j][i];
      const c = (2 * dot) / vNormSq;
      for (let i = k; i < n; i++) Q[j][i] -= c * v[i];
    }
  }
  return { Q, R };
}

function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const m = B[0].length;
  const p = B.length;
  const C: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < p; k++) {
      const a = A[i][k];
      if (a === 0) continue;
      for (let j = 0; j < m; j++) C[i][j] += a * B[k][j];
    }
  }
  return C;
}

export function qrAlgorithm(
  A: number[][],
  options: { maxIter?: number; tol?: number } = {},
): QrEigenResult {
  if (!Array.isArray(A) || A.length === 0) throw new Error('qrAlgorithm: matrix required');
  const n = A.length;
  for (const row of A) {
    if (!Array.isArray(row) || row.length !== n) throw new Error('qrAlgorithm: square matrix required');
  }
  const maxIter = options.maxIter ?? 500;
  const tol = options.tol ?? 1e-10;
  let M = clone(A);
  let iter = 0;
  let converged = false;
  for (; iter < maxIter; iter++) {
    let off = 0;
    for (let i = 1; i < n; i++) for (let j = 0; j < i; j++) off += Math.abs(M[i][j]);
    if (off < tol) {
      converged = true;
      break;
    }
    const { Q, R } = qrDecompose(M);
    M = matMul(R, Q);
  }
  const eigenvalues: number[] = [];
  for (let i = 0; i < n; i++) eigenvalues.push(M[i][i]);
  eigenvalues.sort((a, b) => b - a);
  return { eigenvalues, iterations: iter, converged };
}
