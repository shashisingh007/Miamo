// Conjugate gradient solver for symmetric positive-definite linear systems
// Ax = b. Returns the approximate solution and the number of iterations
// performed. Caller must supply a symmetric positive-definite matrix.

export interface ConjugateGradientOptions {
  tol?: number;
  maxIter?: number;
}

export interface ConjugateGradientResult {
  x: number[];
  iterations: number;
  converged: boolean;
  residualNorm: number;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function matVec(A: number[][], v: number[]): number[] {
  const n = A.length;
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    const row = A[i];
    for (let j = 0; j < n; j++) s += row[j] * v[j];
    out[i] = s;
  }
  return out;
}

export function conjugateGradient(
  A: number[][],
  b: number[],
  opts: ConjugateGradientOptions = {}
): ConjugateGradientResult {
  const n = b.length;
  if (A.length !== n) throw new RangeError('A and b dimensions disagree');
  for (const row of A) {
    if (row.length !== n) throw new RangeError('A must be square');
  }
  const tol = opts.tol ?? 1e-10;
  const maxIter = opts.maxIter ?? Math.max(50, 2 * n);
  const x = new Array<number>(n).fill(0);
  let r = b.slice();
  let p = r.slice();
  let rsOld = dot(r, r);
  if (Math.sqrt(rsOld) <= tol) {
    return { x, iterations: 0, converged: true, residualNorm: Math.sqrt(rsOld) };
  }
  let iter = 0;
  for (; iter < maxIter; iter++) {
    const Ap = matVec(A, p);
    const denom = dot(p, Ap);
    if (denom === 0) break;
    const alpha = rsOld / denom;
    for (let i = 0; i < n; i++) {
      x[i] += alpha * p[i];
      r[i] -= alpha * Ap[i];
    }
    const rsNew = dot(r, r);
    if (Math.sqrt(rsNew) <= tol) {
      return { x, iterations: iter + 1, converged: true, residualNorm: Math.sqrt(rsNew) };
    }
    const beta = rsNew / rsOld;
    for (let i = 0; i < n; i++) p[i] = r[i] + beta * p[i];
    rsOld = rsNew;
  }
  return { x, iterations: iter, converged: false, residualNorm: Math.sqrt(rsOld) };
}
