export interface InverseIterationOptions {
  maxIter?: number;
  tol?: number;
  v0?: number[];
}

export interface InverseIterationResult {
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
    if (Math.abs(M[p][i]) < 1e-14) throw new Error('inverseIteration: singular shift');
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

export function inverseIteration(
  A: number[][],
  shift: number,
  opts: InverseIterationOptions = {},
): InverseIterationResult {
  const n = A.length;
  if (n === 0) throw new Error('inverseIteration: empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('inverseIteration: A must be square');
  if (!Number.isFinite(shift)) throw new Error('inverseIteration: shift must be finite');
  const maxIter = opts.maxIter ?? 200;
  const tol = opts.tol ?? 1e-10;
  if (!(maxIter >= 1)) throw new Error('inverseIteration: maxIter>=1');
  if (!(tol > 0)) throw new Error('inverseIteration: tol>0');
  let v: number[];
  if (opts.v0) {
    if (opts.v0.length !== n) throw new Error('inverseIteration: v0 size mismatch');
    v = opts.v0.slice();
  } else {
    v = new Array(n).fill(0).map((_, i) => Math.cos(i + 1));
  }
  let nv = Math.sqrt(dot(v, v));
  if (nv === 0) throw new Error('inverseIteration: zero v0');
  v = v.map((x) => x / nv);
  const M = A.map((row, i) => row.map((vv, j) => (i === j ? vv - shift : vv)));
  let lambda = shift;
  let it = 0;
  let converged = false;
  for (it = 0; it < maxIter; it++) {
    const w = solveLU(M, v);
    const wn = Math.sqrt(dot(w, w));
    if (wn === 0 || !Number.isFinite(wn)) break;
    const wNorm = w.map((x) => x / wn);
    const Av = matVec(A, wNorm);
    const lambdaNew = dot(wNorm, Av);
    const diff = Math.abs(lambdaNew - lambda);
    v = wNorm;
    lambda = lambdaNew;
    if (diff < tol) {
      converged = true;
      it++;
      break;
    }
  }
  return { eigenvalue: lambda, eigenvector: v, iters: it, converged };
}
