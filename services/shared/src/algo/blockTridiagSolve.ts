// Block tridiagonal solver using block Thomas algorithm.
// Solves M x = d where M is block-tridiagonal with sub-blocks A[i] (lower),
// B[i] (diagonal), C[i] (upper) all square of equal size, and d is split into block vectors.

function matmul(A: number[][], B: number[][]): number[][] {
  const m = A.length, k = A[0].length, n = B[0].length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    let s = 0; for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
    C[i][j] = s;
  }
  return C;
}

function matVec(A: number[][], x: number[]): number[] {
  const m = A.length;
  const out = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    let s = 0; for (let j = 0; j < x.length; j++) s += A[i][j] * x[j];
    out[i] = s;
  }
  return out;
}

function inv(A: number[][]): number[][] {
  const n = A.length;
  const M = A.map((r) => r.slice());
  const I: number[][] = Array.from({ length: n }, (_, i) => {
    const r = new Array(n).fill(0); r[i] = 1; return r;
  });
  for (let k = 0; k < n; k++) {
    let piv = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[piv][k])) piv = i;
    if (Math.abs(M[piv][k]) < 1e-14) throw new Error('blockTridiag: singular block');
    if (piv !== k) { [M[k], M[piv]] = [M[piv], M[k]]; [I[k], I[piv]] = [I[piv], I[k]]; }
    const d = M[k][k];
    for (let j = 0; j < n; j++) { M[k][j] /= d; I[k][j] /= d; }
    for (let i = 0; i < n; i++) if (i !== k) {
      const f = M[i][k];
      if (f === 0) continue;
      for (let j = 0; j < n; j++) { M[i][j] -= f * M[k][j]; I[i][j] -= f * I[k][j]; }
    }
  }
  return I;
}

function subMat(A: number[][], B: number[][]): number[][] {
  return A.map((r, i) => r.map((v, j) => v - B[i][j]));
}

function subVec(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}

export interface BlockTridiagInput {
  A: number[][][]; // sub-diagonal blocks length N (A[0] unused)
  B: number[][][]; // diagonal blocks length N
  C: number[][][]; // super-diagonal blocks length N (C[N-1] unused)
  d: number[][]; // length N, each a block vector
}

export function blockTridiagSolve(input: BlockTridiagInput): number[][] {
  const { A, B, C, d } = input;
  const N = B.length;
  if (N === 0) throw new Error('blockTridiag: empty');
  if (A.length !== N || C.length !== N || d.length !== N) throw new Error('blockTridiag: length mismatch');
  const Bp: number[][][] = new Array(N);
  const dp: number[][] = new Array(N);
  Bp[0] = B[0].map((r) => r.slice());
  dp[0] = d[0].slice();
  for (let i = 1; i < N; i++) {
    const BpInv = inv(Bp[i - 1]);
    const M = matmul(A[i], BpInv); // A_i * Bp_{i-1}^-1
    Bp[i] = subMat(B[i], matmul(M, C[i - 1]));
    dp[i] = subVec(d[i], matVec(M, dp[i - 1]));
  }
  const x: number[][] = new Array(N);
  x[N - 1] = matVec(inv(Bp[N - 1]), dp[N - 1]);
  for (let i = N - 2; i >= 0; i--) {
    const rhs = subVec(dp[i], matVec(C[i], x[i + 1]));
    x[i] = matVec(inv(Bp[i]), rhs);
  }
  return x;
}
