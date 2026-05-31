// Inverse power iteration with shift to find eigenvalue closest to a given shift.
// Solves (A - shift*I) y = x via Gaussian elimination with partial pivoting per step.

export interface InversePowerOptions {
  tolerance?: number;
  maxIterations?: number;
}

export interface InversePowerResult {
  eigenvalue: number;
  eigenvector: number[];
  iterations: number;
  converged: boolean;
}

function solveLinear(M: number[][], b: number[]): number[] {
  const n = M.length;
  const A: number[][] = M.map((r, i) => [...r, b[i]]);
  for (let k = 0; k < n; k++) {
    let piv = k;
    let pivMag = Math.abs(A[k][k]);
    for (let i = k + 1; i < n; i++) {
      const m = Math.abs(A[i][k]);
      if (m > pivMag) { pivMag = m; piv = i; }
    }
    if (pivMag < 1e-14) throw new Error('singular shifted matrix');
    if (piv !== k) { const t = A[k]; A[k] = A[piv]; A[piv] = t; }
    for (let i = k + 1; i < n; i++) {
      const f = A[i][k] / A[k][k];
      for (let j = k; j <= n; j++) A[i][j] -= f * A[k][j];
    }
  }
  const x: number[] = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = A[i][n];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
    x[i] = s / A[i][i];
  }
  return x;
}

function norm(v: number[]): number {
  let s = 0;
  for (const x of v) s += x * x;
  return Math.sqrt(s);
}

export function inversePowerIteration(
  A: number[][],
  shift: number = 0,
  opts: InversePowerOptions = {},
): InversePowerResult {
  const n = A.length;
  if (n === 0) throw new Error('empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('matrix must be square');
  const tol = opts.tolerance ?? 1e-10;
  const maxIt = opts.maxIterations ?? 200;
  if (!(tol > 0)) throw new Error('tolerance must be positive');
  if (!Number.isInteger(maxIt) || maxIt <= 0) throw new Error('maxIterations must be positive integer');
  if (!Number.isFinite(shift)) throw new Error('non-finite shift');

  const M: number[][] = A.map((r, i) => r.map((v, j) => (i === j ? v - shift : v)));
  let x: number[] = new Array(n).fill(0).map((_, i) => (i === 0 ? 1 : 0));
  let xn = norm(x);
  for (let i = 0; i < n; i++) x[i] /= xn;
  let lambda = shift;
  let converged = false;
  let iter = 0;
  for (iter = 1; iter <= maxIt; iter++) {
    const y = solveLinear(M, x);
    const yn = norm(y);
    if (yn === 0) throw new Error('zero iterate');
    const xNew = y.map((v) => v / yn);
    // Rayleigh-quotient eigenvalue estimate: (xNew^T A xNew)
    let num = 0;
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += A[i][j] * xNew[j];
      num += xNew[i] * s;
    }
    const lambdaNew = num;
    let diff = 0;
    for (let i = 0; i < n; i++) diff += Math.abs(xNew[i] - x[i] * Math.sign(xNew[0] * x[0] || 1));
    x = xNew;
    if (Math.abs(lambdaNew - lambda) < tol) { lambda = lambdaNew; converged = true; break; }
    lambda = lambdaNew;
    if (diff < tol) { converged = true; break; }
  }
  return { eigenvalue: lambda, eigenvector: x, iterations: iter > maxIt ? maxIt : iter, converged };
}
