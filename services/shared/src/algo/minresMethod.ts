export interface MinresOptions {
  maxIter?: number;
  tol?: number;
  x0?: number[];
}

export interface MinresResult {
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

export function minresMethod(A: number[][], b: number[], opts: MinresOptions = {}): MinresResult {
  const n = A.length;
  if (n === 0) throw new Error('minres: empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('minres: A must be square');
  if (b.length !== n) throw new Error('minres: b length mismatch');
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[i][j] - A[j][i]) > 1e-9) throw new Error('minres: A must be symmetric');
    }
  }
  const maxIter = opts.maxIter ?? 1000;
  const tol = opts.tol ?? 1e-10;
  if (!(maxIter >= 1)) throw new Error('minres: maxIter>=1');
  if (!(tol > 0)) throw new Error('minres: tol>0');
  const x = opts.x0 ? opts.x0.slice() : new Array(n).fill(0);
  if (x.length !== n) throw new Error('minres: x0 length mismatch');
  const Ax = matVec(A, x);
  let r = b.map((v, i) => v - Ax[i]);
  let residual = Math.sqrt(dot(r, r));
  if (residual < tol) return { x, iters: 0, residual, converged: true };
  let p0 = r.slice();
  let s0 = matVec(A, p0);
  let p1 = p0.slice();
  let s1 = s0.slice();
  let it = 0;
  let converged = false;
  for (it = 0; it < maxIter; it++) {
    const p2 = p1;
    const s2 = s1;
    p1 = p0;
    s1 = s0;
    const denom1 = dot(s1, s1);
    if (denom1 === 0) break;
    const alpha = dot(r, s1) / denom1;
    for (let i = 0; i < n; i++) {
      x[i] += alpha * p1[i];
      r[i] -= alpha * s1[i];
    }
    residual = Math.sqrt(dot(r, r));
    if (residual < tol) {
      converged = true;
      it++;
      break;
    }
    p0 = s1.slice();
    s0 = matVec(A, s1);
    const beta1 = dot(s0, s1) / denom1;
    for (let i = 0; i < n; i++) {
      p0[i] -= beta1 * p1[i];
      s0[i] -= beta1 * s1[i];
    }
    if (it > 0) {
      const denom2 = dot(s2, s2);
      if (denom2 !== 0) {
        const beta2 = dot(s0, s2) / denom2;
        for (let i = 0; i < n; i++) {
          p0[i] -= beta2 * p2[i];
          s0[i] -= beta2 * s2[i];
        }
      }
    }
  }
  for (const v of x) if (!Number.isFinite(v)) throw new Error('minres: non-finite');
  return { x, iters: it, residual, converged };
}
