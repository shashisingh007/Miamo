export interface ArnoldiResult {
  Q: number[][];
  H: number[][];
  k: number;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(v: number[]): number {
  return Math.sqrt(dot(v, v));
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

export function arnoldiIteration(A: number[][], b: number[], k: number): ArnoldiResult {
  const n = A.length;
  if (n === 0) throw new Error('arnoldi: empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('arnoldi: A must be square');
  if (b.length !== n) throw new Error('arnoldi: b length mismatch');
  if (!Number.isInteger(k) || k < 1) throw new Error('arnoldi: k>=1 integer required');
  const m = Math.min(k, n);
  const Q: number[][] = [];
  const H: number[][] = [];
  const beta = norm(b);
  if (beta === 0) throw new Error('arnoldi: b is zero');
  Q.push(b.map((x) => x / beta));
  let actual = m;
  for (let j = 0; j < m; j++) {
    const v = matVec(A, Q[j]);
    const hcol = new Array(j + 2).fill(0);
    for (let i = 0; i <= j; i++) {
      hcol[i] = dot(Q[i], v);
      for (let r = 0; r < n; r++) v[r] -= hcol[i] * Q[i][r];
    }
    const h = norm(v);
    hcol[j + 1] = h;
    H.push(hcol);
    if (h < 1e-14) {
      actual = j + 1;
      break;
    }
    if (j + 1 < m) {
      Q.push(v.map((x) => x / h));
    }
  }
  return { Q, H, k: actual };
}
