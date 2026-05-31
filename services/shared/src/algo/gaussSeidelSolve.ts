// Gauss-Seidel iterative solver for Ax = b. Updates each component in place
// using the most recent neighbor estimates. Converges for diagonally
// dominant or symmetric positive-definite matrices.

export interface GaussSeidelOptions {
  tol?: number;
  maxIter?: number;
}

export interface GaussSeidelResult {
  x: number[];
  iterations: number;
  converged: boolean;
  residualNorm: number;
}

function infNorm(v: number[]): number {
  let m = 0;
  for (const x of v) {
    const a = Math.abs(x);
    if (a > m) m = a;
  }
  return m;
}

export function gaussSeidelSolve(
  A: number[][],
  b: number[],
  opts: GaussSeidelOptions = {}
): GaussSeidelResult {
  const n = b.length;
  if (A.length !== n) throw new RangeError('A and b dimensions disagree');
  for (const row of A) {
    if (row.length !== n) throw new RangeError('A must be square');
  }
  for (let i = 0; i < n; i++) {
    if (A[i][i] === 0) throw new RangeError('zero diagonal entry');
  }
  const tol = opts.tol ?? 1e-10;
  const maxIter = opts.maxIter ?? Math.max(1000, 50 * n);
  const x = new Array<number>(n).fill(0);
  let iter = 0;
  while (iter < maxIter) {
    let maxDelta = 0;
    for (let i = 0; i < n; i++) {
      let s = b[i];
      const row = A[i];
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        s -= row[j] * x[j];
      }
      const xi = s / row[i];
      const d = Math.abs(xi - x[i]);
      if (d > maxDelta) maxDelta = d;
      x[i] = xi;
    }
    iter++;
    if (maxDelta <= tol) {
      const res = new Array<number>(n);
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let j = 0; j < n; j++) s += A[i][j] * x[j];
        res[i] = s - b[i];
      }
      return { x, iterations: iter, converged: true, residualNorm: infNorm(res) };
    }
  }
  const res = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i][j] * x[j];
    res[i] = s - b[i];
  }
  return { x, iterations: iter, converged: false, residualNorm: infNorm(res) };
}
