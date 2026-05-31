function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function matVec(A: number[][], x: number[]): number[] {
  const m = A.length;
  const out = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    let s = 0;
    for (let j = 0; j < x.length; j++) s += A[i][j] * x[j];
    out[i] = s;
  }
  return out;
}

function matTVec(A: number[][], y: number[]): number[] {
  const n = A[0].length;
  const out = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let i = 0; i < A.length; i++) s += A[i][j] * y[i];
    out[j] = s;
  }
  return out;
}

function norm(v: number[]): number {
  return Math.sqrt(dot(v, v));
}

export interface LanczosBidiagResult {
  alpha: number[]; // diag of B (length k)
  beta: number[]; // upper bidiag (length k, last entry usually 0)
  U: number[][]; // m x (k+1) but we store k columns
  V: number[][]; // n x k
}

export function lanczosBidiagonal(A: number[][], k: number, b?: number[]): LanczosBidiagResult {
  if (!A.length) throw new Error('lanczosBidiagonal: empty');
  const m = A.length;
  const n = A[0].length;
  if (k <= 0) throw new Error('lanczosBidiagonal: k must be >0');
  if (k > Math.min(m, n)) throw new Error('lanczosBidiagonal: k too large');
  let u = b ? b.slice() : (() => { const x = new Array(m).fill(0); x[0] = 1; return x; })();
  if (u.length !== m) throw new Error('lanczosBidiagonal: b length mismatch');
  const u0Norm = norm(u);
  if (u0Norm === 0) throw new Error('lanczosBidiagonal: zero start vector');
  for (let i = 0; i < m; i++) u[i] /= u0Norm;
  const U: number[][] = [u];
  const V: number[][] = [];
  const alpha: number[] = [];
  const beta: number[] = [];
  let prevV: number[] | null = null;
  let prevBeta = 0;
  for (let i = 0; i < k; i++) {
    let v = matTVec(A, U[i]);
    if (prevV) for (let j = 0; j < n; j++) v[j] -= prevBeta * prevV[j];
    // reorthogonalize against all previous V
    for (const vp of V) {
      const c = dot(v, vp);
      for (let j = 0; j < n; j++) v[j] -= c * vp[j];
    }
    const a = norm(v);
    alpha.push(a);
    if (a === 0) {
      beta.push(0);
      V.push(new Array(n).fill(0));
      break;
    }
    for (let j = 0; j < n; j++) v[j] /= a;
    V.push(v);
    let uNext = matVec(A, v);
    for (let j = 0; j < m; j++) uNext[j] -= a * U[i][j];
    for (const up of U) {
      const c = dot(uNext, up);
      for (let j = 0; j < m; j++) uNext[j] -= c * up[j];
    }
    const bn = norm(uNext);
    beta.push(bn);
    if (bn === 0 || i === k - 1) {
      if (i < k - 1) break;
    } else {
      for (let j = 0; j < m; j++) uNext[j] /= bn;
      U.push(uNext);
    }
    prevV = v;
    prevBeta = bn;
  }
  return { alpha, beta, U, V };
}
