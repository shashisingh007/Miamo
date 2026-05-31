// LU decomposition with partial pivoting. Decomposes a square matrix A
// such that P*A = L*U where L is unit lower triangular, U is upper
// triangular, and P is a permutation. Includes a forward/back substitution
// helper to solve Ax = b after decomposition.

export interface LUDecomposition {
  L: number[][];
  U: number[][];
  P: number[]; // permutation as a row index map: P[i] is the original row now at i
  signum: 1 | -1; // det sign of P, useful for determinants
}

function clone(A: number[][]): number[][] {
  return A.map((row) => row.slice());
}

export function luDecompose(A: number[][]): LUDecomposition {
  const n = A.length;
  if (n === 0) return { L: [], U: [], P: [], signum: 1 };
  for (const row of A) {
    if (row.length !== n) throw new RangeError('A must be square');
  }
  const U = clone(A);
  const L: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const P = Array.from({ length: n }, (_, i) => i);
  let signum: 1 | -1 = 1;
  for (let k = 0; k < n; k++) {
    let pivot = k;
    let pivotMag = Math.abs(U[k][k]);
    for (let i = k + 1; i < n; i++) {
      const m = Math.abs(U[i][k]);
      if (m > pivotMag) {
        pivotMag = m;
        pivot = i;
      }
    }
    if (pivotMag === 0) throw new Error('matrix is singular');
    if (pivot !== k) {
      [U[k], U[pivot]] = [U[pivot], U[k]];
      [P[k], P[pivot]] = [P[pivot], P[k]];
      [L[k], L[pivot]] = [L[pivot], L[k]];
      signum = -signum as 1 | -1;
    }
    for (let i = k + 1; i < n; i++) {
      const factor = U[i][k] / U[k][k];
      L[i][k] = factor;
      for (let j = k; j < n; j++) U[i][j] -= factor * U[k][j];
    }
  }
  for (let i = 0; i < n; i++) L[i][i] = 1;
  return { L, U, P, signum };
}

export function luSolve(decomp: LUDecomposition, b: number[]): number[] {
  const n = b.length;
  if (decomp.L.length !== n) throw new RangeError('b length mismatch');
  // Apply permutation: y0[i] = b[P[i]].
  const y = new Array<number>(n);
  for (let i = 0; i < n; i++) y[i] = b[decomp.P[i]];
  // Forward substitution Ly = y.
  for (let i = 0; i < n; i++) {
    let s = y[i];
    for (let j = 0; j < i; j++) s -= decomp.L[i][j] * y[j];
    y[i] = s; // L diagonal is 1
  }
  // Back substitution Ux = y.
  const x = new Array<number>(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let j = i + 1; j < n; j++) s -= decomp.U[i][j] * x[j];
    x[i] = s / decomp.U[i][i];
  }
  return x;
}
