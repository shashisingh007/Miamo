export interface RayleighOptions {
  maxIter?: number;
  tol?: number;
  v0?: number[];
}

export interface RayleighResult {
  eigenvalue: number;
  eigenvector: number[];
  iters: number;
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

function solveLU(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((r) => r.slice());
  const x = b.slice();
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    if (Math.abs(M[p][i]) < 1e-14) {
      for (let k = 0; k < n; k++) M[i][k] += 1e-12;
    }
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

export function rayleighQuotientIteration(A: number[][], opts: RayleighOptions = {}): RayleighResult {
  const n = A.length;
  if (n === 0) throw new Error('rayleigh: empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('rayleigh: A must be square');
  const maxIter = opts.maxIter ?? 100;
  const tol = opts.tol ?? 1e-10;
  if (!(maxIter >= 1)) throw new Error('rayleigh: maxIter>=1');
  if (!(tol > 0)) throw new Error('rayleigh: tol>0');
  let v: number[];
  if (opts.v0) {
    if (opts.v0.length !== n) throw new Error('rayleigh: v0 size mismatch');
    v = opts.v0.slice();
  } else {
    v = new Array(n).fill(0).map((_, i) => Math.cos(i + 1));
  }
  let nv = Math.sqrt(dot(v, v));
  if (nv === 0) throw new Error('rayleigh: zero v0');
  v = v.map((x) => x / nv);
  let mu = dot(v, matVec(A, v));
  let it = 0;
  let converged = false;
  for (it = 0; it < maxIter; it++) {
    const M = A.map((row, i) => row.map((vv, j) => (i === j ? vv - mu : vv)));
    let w: number[];
    try {
      w = solveLU(M, v);
    } catch {
      converged = true;
      break;
    }
    const wn = Math.sqrt(dot(w, w));
    if (wn === 0 || !Number.isFinite(wn)) break;
    w = w.map((x) => x / wn);
    const muNew = dot(w, matVec(A, w));
    const diff = Math.abs(muNew - mu);
    v = w;
    mu = muNew;
    if (diff < tol) {
      converged = true;
      it++;
      break;
    }
  }
  return { eigenvalue: mu, eigenvector: v, iters: it, converged };
}
