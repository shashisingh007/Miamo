// Polar decomposition of a square invertible matrix A: A = U * P
// where U is orthogonal and P is symmetric positive semidefinite.
// Uses Newton iteration: U_{k+1} = 0.5 * (U_k + (U_k^{-T}))

function transpose(M: number[][]): number[][] {
  const m = M.length;
  const n = M[0].length;
  const T: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(m);
    for (let j = 0; j < m; j++) row[j] = M[j][i];
    T.push(row);
  }
  return T;
}

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const k = A[0].length;
  const n = B[0].length;
  const C: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row = new Array(n).fill(0);
    for (let p = 0; p < k; p++) {
      const aip = A[i][p];
      for (let j = 0; j < n; j++) row[j] += aip * B[p][j];
    }
    C.push(row);
  }
  return C;
}

function inverse(M: number[][]): number[][] {
  const n = M.length;
  const A: number[][] = M.map((r) => r.slice());
  const I: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[i] = 1;
    I.push(row);
  }
  for (let k = 0; k < n; k++) {
    let p = k;
    let max = Math.abs(A[k][k]);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(A[i][k]);
      if (v > max) { max = v; p = i; }
    }
    if (max < 1e-14) throw new Error('polarDecompose: singular');
    if (p !== k) { [A[k], A[p]] = [A[p], A[k]]; [I[k], I[p]] = [I[p], I[k]]; }
    const piv = A[k][k];
    for (let j = 0; j < n; j++) { A[k][j] /= piv; I[k][j] /= piv; }
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const f = A[i][k];
      if (f === 0) continue;
      for (let j = 0; j < n; j++) {
        A[i][j] -= f * A[k][j];
        I[i][j] -= f * I[k][j];
      }
    }
  }
  return I;
}

function frobDiff(A: number[][], B: number[][]): number {
  let s = 0;
  for (let i = 0; i < A.length; i++) for (let j = 0; j < A[0].length; j++) {
    const d = A[i][j] - B[i][j];
    s += d * d;
  }
  return Math.sqrt(s);
}

export interface PolarDecomposition {
  U: number[][];
  P: number[][];
}

export function polarDecompose(A: number[][], opts: { maxIter?: number; tol?: number } = {}): PolarDecomposition {
  const n = A.length;
  if (n === 0) throw new Error('polarDecompose: empty');
  for (const row of A) if (row.length !== n) throw new Error('polarDecompose: must be square');

  const maxIter = opts.maxIter ?? 100;
  const tol = opts.tol ?? 1e-12;

  let U: number[][] = A.map((r) => r.slice());
  for (let it = 0; it < maxIter; it++) {
    const Uinv = inverse(U);
    const UinvT = transpose(Uinv);
    const Unew: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row = new Array(n);
      for (let j = 0; j < n; j++) row[j] = 0.5 * (U[i][j] + UinvT[i][j]);
      Unew.push(row);
    }
    const diff = frobDiff(U, Unew);
    U = Unew;
    if (diff < tol) break;
  }
  const P = matMul(transpose(U), A);
  // Symmetrize P to clean tiny asymmetry
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const m = 0.5 * (P[i][j] + P[j][i]);
    P[i][j] = m;
    P[j][i] = m;
  }
  return { U, P };
}
