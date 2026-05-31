// CGNR: Conjugate Gradient on the Normal Residual equation.
// Solves min ||Ax - b||_2 (least squares) for general A (m x n) iteratively.

function dot(a: number[], b: number[]): number {
  let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s;
}

function matVec(A: number[][], x: number[]): number[] {
  const m = A.length;
  const out = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    let s = 0; for (let j = 0; j < x.length; j++) s += A[i][j] * x[j];
    out[i] = s;
  }
  return out;
}

function matTVec(A: number[][], y: number[]): number[] {
  const n = A[0].length;
  const out = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let s = 0; for (let i = 0; i < A.length; i++) s += A[i][j] * y[i];
    out[j] = s;
  }
  return out;
}

export interface CgnrSolveOptions {
  tol?: number;
  maxIter?: number;
  x0?: number[];
}

export interface CgnrSolveResult {
  x: number[];
  iterations: number;
  residualNorm: number;
}

export function cgnrSolve(A: number[][], b: number[], opts: CgnrSolveOptions = {}): CgnrSolveResult {
  if (!A.length) throw new Error('cgnrSolve: empty');
  const m = A.length;
  const n = A[0].length;
  if (b.length !== m) throw new Error('cgnrSolve: b length mismatch');
  for (const row of A) if (row.length !== n) throw new Error('cgnrSolve: ragged');
  const tol = opts.tol ?? 1e-10;
  const maxIter = opts.maxIter ?? Math.max(2 * n, 50);
  let x = opts.x0 ? opts.x0.slice() : new Array(n).fill(0);
  if (x.length !== n) throw new Error('cgnrSolve: x0 length mismatch');
  // r = b - A x ; z = A^T r ; p = z
  const Ax0 = matVec(A, x);
  const r = b.map((v, i) => v - Ax0[i]);
  let z = matTVec(A, r);
  let p = z.slice();
  let zNormSq = dot(z, z);
  let iter = 0;
  for (; iter < maxIter; iter++) {
    if (Math.sqrt(zNormSq) < tol) break;
    const Ap = matVec(A, p);
    const ApNormSq = dot(Ap, Ap);
    if (ApNormSq === 0) break;
    const alpha = zNormSq / ApNormSq;
    for (let j = 0; j < n; j++) x[j] += alpha * p[j];
    for (let i = 0; i < m; i++) r[i] -= alpha * Ap[i];
    const zNew = matTVec(A, r);
    const zNewNormSq = dot(zNew, zNew);
    const beta = zNewNormSq / zNormSq;
    for (let j = 0; j < n; j++) p[j] = zNew[j] + beta * p[j];
    z = zNew;
    zNormSq = zNewNormSq;
  }
  const finalAx = matVec(A, x);
  const finalRes = b.map((v, i) => v - finalAx[i]);
  return { x, iterations: iter, residualNorm: Math.sqrt(dot(finalRes, finalRes)) };
}
