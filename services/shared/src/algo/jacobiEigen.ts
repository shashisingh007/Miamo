// Jacobi eigenvalue algorithm for real symmetric matrices.
// Repeatedly applies a Givens rotation that zeroes the largest off-diagonal entry.
// Returns sorted eigenvalues (descending) and corresponding eigenvectors as columns.

export interface JacobiResult {
  eigenvalues: number[];
  eigenvectors: number[][]; // columns are eigenvectors
  iterations: number;
  converged: boolean;
}

export function jacobiEigen(
  A: number[][],
  tolerance: number = 1e-12,
  maxIterations: number = 200,
): JacobiResult {
  const n = A.length;
  if (n === 0) throw new Error('empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('matrix must be square');
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (Math.abs(A[i][j] - A[j][i]) > 1e-9) throw new Error('matrix must be symmetric');
  if (!(tolerance > 0)) throw new Error('tolerance must be positive');
  if (!Number.isInteger(maxIterations) || maxIterations <= 0) throw new Error('maxIterations must be positive integer');

  const M: number[][] = A.map((r) => r.slice());
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

  let iter = 0;
  let converged = false;
  for (iter = 1; iter <= maxIterations; iter++) {
    // Find largest off-diagonal absolute value
    let p = 0, q = 1, maxVal = Math.abs(M[0][1] ?? 0);
    if (n === 1) { converged = true; break; }
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const v = Math.abs(M[i][j]);
        if (v > maxVal) { maxVal = v; p = i; q = j; }
      }
    if (maxVal < tolerance) { converged = true; break; }
    const app = M[p][p], aqq = M[q][q], apq = M[p][q];
    const theta = (aqq - app) / (2 * apq);
    const t = theta >= 0 ? 1 / (theta + Math.sqrt(1 + theta * theta)) : 1 / (theta - Math.sqrt(1 + theta * theta));
    const c = 1 / Math.sqrt(1 + t * t);
    const s = t * c;
    M[p][p] = app - t * apq;
    M[q][q] = aqq + t * apq;
    M[p][q] = 0; M[q][p] = 0;
    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const aip = M[i][p], aiq = M[i][q];
        M[i][p] = c * aip - s * aiq;
        M[p][i] = M[i][p];
        M[i][q] = c * aiq + s * aip;
        M[q][i] = M[i][q];
      }
      const vip = V[i][p], viq = V[i][q];
      V[i][p] = c * vip - s * viq;
      V[i][q] = s * vip + c * viq;
    }
  }

  const eig: { val: number; idx: number }[] = [];
  for (let i = 0; i < n; i++) eig.push({ val: M[i][i], idx: i });
  eig.sort((a, b) => b.val - a.val);
  const eigenvalues = eig.map((e) => e.val);
  const eigenvectors: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let col = 0; col < n; col++) {
    const src = eig[col].idx;
    for (let row = 0; row < n; row++) eigenvectors[row][col] = V[row][src];
  }
  return { eigenvalues, eigenvectors, iterations: iter > maxIterations ? maxIterations : iter, converged };
}
