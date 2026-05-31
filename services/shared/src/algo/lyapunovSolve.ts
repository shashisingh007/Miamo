// Continuous Lyapunov equation solver: A*X + X*A^T = -Q for X (symmetric if Q symmetric).
// Reduces to a Sylvester equation A*X + X*A^T = C with B = A^T, C = -Q.

import { sylvesterEquation } from './sylvesterEquation';

function transpose(M: number[][]): number[][] {
  const n = M.length;
  const T: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n);
    for (let j = 0; j < n; j++) row[j] = M[j][i];
    T.push(row);
  }
  return T;
}

export function lyapunovSolve(A: number[][], Q: number[][]): number[][] {
  const n = A.length;
  if (n === 0) throw new Error('lyapunovSolve: empty');
  for (const row of A) if (row.length !== n) throw new Error('lyapunovSolve: A must be square');
  if (Q.length !== n) throw new Error('lyapunovSolve: Q dimension mismatch');
  for (const row of Q) if (row.length !== n) throw new Error('lyapunovSolve: Q dimension mismatch');

  const negQ: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n);
    for (let j = 0; j < n; j++) row[j] = -Q[i][j];
    negQ.push(row);
  }
  return sylvesterEquation(A, transpose(A), negQ);
}
