export interface SteepestDescentOptions {
  maxIter?: number;
  tol?: number;
  x0?: number[];
}

export interface SteepestDescentResult {
  x: number[];
  iters: number;
  residual: number;
  converged: boolean;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function matVec(A: number[][], x: number[]): number[] {
  const n = A.length;
  const r = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i][j] * x[j];
    r[i] = s;
  }
  return r;
}

export function steepestDescent(
  A: number[][],
  b: number[],
  opts: SteepestDescentOptions = {},
): SteepestDescentResult {
  const n = A.length;
  if (n === 0) throw new Error('steepestDescent: empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('steepestDescent: A must be square');
  if (b.length !== n) throw new Error('steepestDescent: b length mismatch');
  const maxIter = opts.maxIter ?? 1000;
  const tol = opts.tol ?? 1e-10;
  if (!(maxIter >= 1)) throw new Error('steepestDescent: maxIter>=1');
  if (!(tol > 0)) throw new Error('steepestDescent: tol>0');
  const x = opts.x0 ? opts.x0.slice() : new Array(n).fill(0);
  if (x.length !== n) throw new Error('steepestDescent: x0 length mismatch');
  let it = 0;
  let residual = Infinity;
  let converged = false;
  for (it = 0; it < maxIter; it++) {
    const Ax = matVec(A, x);
    const r = b.map((v, i) => v - Ax[i]);
    const rr = dot(r, r);
    residual = Math.sqrt(rr);
    if (residual < tol) {
      converged = true;
      break;
    }
    const Ar = matVec(A, r);
    const denom = dot(r, Ar);
    if (denom === 0) throw new Error('steepestDescent: zero denominator (A not SPD?)');
    const alpha = rr / denom;
    for (let i = 0; i < n; i++) x[i] += alpha * r[i];
  }
  for (const v of x) if (!Number.isFinite(v)) throw new Error('steepestDescent: non-finite');
  return { x, iters: it, residual, converged };
}
