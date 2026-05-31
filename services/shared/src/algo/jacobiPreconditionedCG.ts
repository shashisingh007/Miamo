// Jacobi-preconditioned conjugate gradient for SPD systems Ax = b.
// Diagonal preconditioner M = diag(A); requires A[i][i] > 0.

export interface JacobiCgOptions {
  iterations?: number;
  tolerance?: number;
  x0?: number[];
}

function matVec(A: number[][], x: number[]): number[] {
  const n = A.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    const row = A[i];
    for (let j = 0; j < n; j++) s += row[j] * x[j];
    y[i] = s;
  }
  return y;
}

export function jacobiPreconditionedCG(
  A: number[][],
  b: number[],
  opts: JacobiCgOptions = {},
): number[] {
  if (!Array.isArray(A) || A.length === 0) throw new Error('jacobiPreconditionedCG: empty');
  const n = A.length;
  for (const row of A) if (row.length !== n) throw new Error('jacobiPreconditionedCG: A must be square');
  if (b.length !== n) throw new Error('jacobiPreconditionedCG: b length mismatch');
  const Minv = new Array(n);
  for (let i = 0; i < n; i++) {
    if (A[i][i] === 0) throw new Error('jacobiPreconditionedCG: zero diagonal entry');
    Minv[i] = 1 / A[i][i];
  }
  const iterations = opts.iterations ?? Math.max(50, n * 10);
  const tol = opts.tolerance ?? 1e-10;
  if (!Number.isInteger(iterations) || iterations <= 0) throw new Error('jacobiPreconditionedCG: bad iterations');
  if (!Number.isFinite(tol) || tol < 0) throw new Error('jacobiPreconditionedCG: bad tolerance');

  const x = opts.x0 ? opts.x0.slice() : new Array(n).fill(0);
  if (x.length !== n) throw new Error('jacobiPreconditionedCG: x0 length mismatch');

  // r = b - A x
  const Ax = matVec(A, x);
  const r = new Array(n);
  for (let i = 0; i < n; i++) r[i] = b[i] - Ax[i];
  const z = new Array(n);
  for (let i = 0; i < n; i++) z[i] = Minv[i] * r[i];
  const p = z.slice();
  let rzOld = 0;
  for (let i = 0; i < n; i++) rzOld += r[i] * z[i];

  let bNorm = 0;
  for (let i = 0; i < n; i++) bNorm += b[i] * b[i];
  bNorm = Math.sqrt(bNorm);
  if (bNorm === 0) bNorm = 1;

  for (let it = 0; it < iterations; it++) {
    const Ap = matVec(A, p);
    let pAp = 0;
    for (let i = 0; i < n; i++) pAp += p[i] * Ap[i];
    if (pAp === 0) break;
    const alpha = rzOld / pAp;
    for (let i = 0; i < n; i++) {
      x[i] += alpha * p[i];
      r[i] -= alpha * Ap[i];
    }
    let rNorm = 0;
    for (let i = 0; i < n; i++) rNorm += r[i] * r[i];
    rNorm = Math.sqrt(rNorm);
    if (rNorm / bNorm < tol) break;
    for (let i = 0; i < n; i++) z[i] = Minv[i] * r[i];
    let rzNew = 0;
    for (let i = 0; i < n; i++) rzNew += r[i] * z[i];
    const beta = rzNew / rzOld;
    for (let i = 0; i < n; i++) p[i] = z[i] + beta * p[i];
    rzOld = rzNew;
  }
  return x;
}
