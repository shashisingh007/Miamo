export interface BiCgStabOptions {
  maxIter?: number;
  tol?: number;
  x0?: number[];
}

export interface BiCgStabResult {
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

export function biCgStab(
  A: number[][],
  b: number[],
  opts: BiCgStabOptions = {},
): BiCgStabResult {
  const n = A.length;
  if (n === 0) throw new Error('biCgStab: empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('biCgStab: A must be square');
  if (b.length !== n) throw new Error('biCgStab: b length mismatch');
  const maxIter = opts.maxIter ?? 1000;
  const tol = opts.tol ?? 1e-10;
  if (!(maxIter >= 1)) throw new Error('biCgStab: maxIter>=1');
  if (!(tol > 0)) throw new Error('biCgStab: tol>0');
  const x = opts.x0 ? opts.x0.slice() : new Array(n).fill(0);
  if (x.length !== n) throw new Error('biCgStab: x0 length mismatch');
  const Ax = matVec(A, x);
  let r = b.map((v, i) => v - Ax[i]);
  const r0 = r.slice();
  let rho = 1;
  let alpha = 1;
  let omega = 1;
  let p = new Array(n).fill(0);
  let v = new Array(n).fill(0);
  let it = 0;
  let residual = Math.sqrt(dot(r, r));
  let converged = residual < tol;
  for (it = 0; it < maxIter && !converged; it++) {
    const rhoNew = dot(r0, r);
    if (rhoNew === 0) throw new Error('biCgStab: breakdown (rho=0)');
    const beta = (rhoNew / rho) * (alpha / omega);
    p = r.map((v0, i) => v0 + beta * (p[i] - omega * v[i]));
    v = matVec(A, p);
    const denom = dot(r0, v);
    if (denom === 0) throw new Error('biCgStab: breakdown (r0·v=0)');
    alpha = rhoNew / denom;
    const s = r.map((v0, i) => v0 - alpha * v[i]);
    const sNorm = Math.sqrt(dot(s, s));
    if (sNorm < tol) {
      for (let i = 0; i < n; i++) x[i] += alpha * p[i];
      r = s;
      residual = sNorm;
      converged = true;
      it++;
      break;
    }
    const t = matVec(A, s);
    const tt = dot(t, t);
    if (tt === 0) throw new Error('biCgStab: breakdown (t·t=0)');
    omega = dot(t, s) / tt;
    if (omega === 0) throw new Error('biCgStab: breakdown (omega=0)');
    for (let i = 0; i < n; i++) x[i] += alpha * p[i] + omega * s[i];
    r = s.map((v0, i) => v0 - omega * t[i]);
    residual = Math.sqrt(dot(r, r));
    if (residual < tol) {
      converged = true;
      it++;
      break;
    }
    rho = rhoNew;
  }
  for (const xv of x) if (!Number.isFinite(xv)) throw new Error('biCgStab: non-finite');
  return { x, iters: it, residual, converged };
}
