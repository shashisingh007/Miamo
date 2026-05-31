export interface BroydenOptions {
  maxIter?: number;
  tol?: number;
  J0?: number[][];
}

export interface BroydenResult {
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

function norm(a: number[]): number {
  return Math.sqrt(dot(a, a));
}

function solveLU(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((r) => r.slice());
  const x = b.slice();
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    if (Math.abs(M[p][i]) < 1e-14) throw new Error('broyden: singular Jacobian');
    if (p !== i) {
      [M[i], M[p]] = [M[p], M[i]];
      [x[i], x[p]] = [x[p], x[i]];
    }
    for (let k = i + 1; k < n; k++) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j < n; j++) M[k][j] -= f * M[i][j];
      x[k] -= f * x[i];
    }
  }
  const y = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = x[i];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * y[j];
    y[i] = s / M[i][i];
  }
  return y;
}

export function broydenMethod(
  F: (x: number[]) => number[],
  x0: number[],
  opts: BroydenOptions = {},
): BroydenResult {
  const n = x0.length;
  if (n === 0) throw new Error('broyden: empty x0');
  const maxIter = opts.maxIter ?? 200;
  const tol = opts.tol ?? 1e-10;
  if (!(maxIter >= 1)) throw new Error('broyden: maxIter>=1');
  if (!(tol > 0)) throw new Error('broyden: tol>0');
  let J: number[][];
  if (opts.J0) {
    if (opts.J0.length !== n) throw new Error('broyden: J0 size mismatch');
    for (const r of opts.J0) if (r.length !== n) throw new Error('broyden: J0 not square');
    J = opts.J0.map((r) => r.slice());
  } else {
    const eps = 1e-6;
    J = Array.from({ length: n }, () => new Array(n).fill(0));
    const f0 = F(x0);
    if (f0.length !== n) throw new Error('broyden: F output size mismatch');
    for (let j = 0; j < n; j++) {
      const xp = x0.slice();
      xp[j] += eps;
      const fp = F(xp);
      if (fp.length !== n) throw new Error('broyden: F output size mismatch');
      for (let i = 0; i < n; i++) J[i][j] = (fp[i] - f0[i]) / eps;
    }
  }
  const x = x0.slice();
  let f = F(x);
  if (f.length !== n) throw new Error('broyden: F output size mismatch');
  for (const v of f) if (!Number.isFinite(v)) throw new Error('broyden: non-finite F');
  let residual = norm(f);
  let it = 0;
  let converged = false;
  for (it = 0; it < maxIter; it++) {
    if (residual < tol) {
      converged = true;
      break;
    }
    const negF = f.map((v) => -v);
    const dx = solveLU(J, negF);
    for (let i = 0; i < n; i++) x[i] += dx[i];
    const fNew = F(x);
    if (fNew.length !== n) throw new Error('broyden: F output size mismatch');
    for (const v of fNew) if (!Number.isFinite(v)) throw new Error('broyden: non-finite F');
    const dF = fNew.map((v, i) => v - f[i]);
    const dxNorm2 = dot(dx, dx);
    if (dxNorm2 > 0) {
      const Jdx = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let j = 0; j < n; j++) s += J[i][j] * dx[j];
        Jdx[i] = s;
      }
      const upd = dF.map((v, i) => (v - Jdx[i]) / dxNorm2);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) J[i][j] += upd[i] * dx[j];
      }
    }
    f = fNew;
    residual = norm(f);
  }
  return { x, iters: it, residual, converged };
}
