export interface LanczosResult {
  Q: number[][];
  alpha: number[];
  beta: number[];
  k: number;
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

export function lanczosIteration(A: number[][], v: number[], k: number): LanczosResult {
  const n = A.length;
  if (n === 0) throw new Error('lanczos: empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('lanczos: A must be square');
  if (v.length !== n) throw new Error('lanczos: v length mismatch');
  if (!Number.isInteger(k) || k < 1) throw new Error('lanczos: k>=1 integer required');
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[i][j] - A[j][i]) > 1e-9) throw new Error('lanczos: A must be symmetric');
    }
  }
  const m = Math.min(k, n);
  const beta0 = Math.sqrt(dot(v, v));
  if (beta0 === 0) throw new Error('lanczos: v is zero');
  const Q: number[][] = [v.map((x) => x / beta0)];
  const alpha: number[] = [];
  const beta: number[] = [];
  let prev: number[] | null = null;
  let actual = m;
  for (let j = 0; j < m; j++) {
    const w = matVec(A, Q[j]);
    const a = dot(w, Q[j]);
    alpha.push(a);
    for (let r = 0; r < n; r++) {
      w[r] -= a * Q[j][r];
      if (prev) w[r] -= beta[j - 1] * prev[r];
    }
    for (let i = 0; i <= j; i++) {
      const c = dot(w, Q[i]);
      for (let r = 0; r < n; r++) w[r] -= c * Q[i][r];
    }
    const b = Math.sqrt(dot(w, w));
    if (b < 1e-14) {
      actual = j + 1;
      break;
    }
    beta.push(b);
    prev = Q[j];
    if (j + 1 < m) Q.push(w.map((x) => x / b));
  }
  return { Q, alpha, beta, k: actual };
}
