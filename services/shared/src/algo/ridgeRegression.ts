// Ridge regression (Tikhonov regularization):
// Solves (X^T X + lambda * I) beta = X^T y
// Returns beta of length p, where X is n x p and y has length n.

function transpose(A: number[][]): number[][] {
  const m = A.length, n = A[0].length;
  const T: number[][] = [];
  for (let j = 0; j < n; j++) {
    const row = new Array(m);
    for (let i = 0; i < m; i++) row[i] = A[i][j];
    T.push(row);
  }
  return T;
}

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, k = A[0].length, n = B[0].length;
  const C: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row = new Array(n).fill(0);
    for (let p = 0; p < k; p++) {
      const aip = A[i][p];
      for (let j = 0; j < n; j++) row[j] += aip * B[p][j];
    }
    C.push(row);
  }
  return C;
}

function matVec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((s, v, j) => s + v * x[j], 0));
}

function solveSpd(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Augmented matrix
  const M: number[][] = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[pivot][i])) pivot = r;
    if (M[pivot][i] === 0) throw new Error('ridgeRegression: singular system');
    if (pivot !== i) {
      const tmp = M[i]; M[i] = M[pivot]; M[pivot] = tmp;
    }
    const piv = M[i][i];
    for (let j = i; j <= n; j++) M[i][j] /= piv;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const factor = M[r][i];
      if (factor === 0) continue;
      for (let j = i; j <= n; j++) M[r][j] -= factor * M[i][j];
    }
  }
  return M.map((row) => row[n]);
}

export function ridgeRegression(X: number[][], y: number[], lambda: number): number[] {
  if (!Array.isArray(X) || X.length === 0) throw new Error('ridgeRegression: empty X');
  const n = X.length;
  const p = X[0].length;
  if (p === 0) throw new Error('ridgeRegression: zero-width X');
  for (const row of X) if (row.length !== p) throw new Error('ridgeRegression: ragged X');
  if (y.length !== n) throw new Error('ridgeRegression: y length mismatch');
  if (!Number.isFinite(lambda) || lambda < 0) throw new Error('ridgeRegression: lambda must be non-negative finite');

  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  for (let i = 0; i < p; i++) XtX[i][i] += lambda;
  const Xty = matVec(Xt, y);
  return solveSpd(XtX, Xty);
}
