export function matrixInverse(A: number[][]): number[][] {
  const n = A.length;
  if (n === 0) throw new Error('empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('matrix must be square');

  // Augmented [A | I]
  const M: number[][] = A.map((row, i) => {
    const r = row.slice();
    for (let j = 0; j < n; j++) r.push(i === j ? 1 : 0);
    return r;
  });

  for (let k = 0; k < n; k++) {
    // Partial pivot
    let piv = k;
    let pivMag = Math.abs(M[k][k]);
    for (let i = k + 1; i < n; i++) {
      const m = Math.abs(M[i][k]);
      if (m > pivMag) {
        pivMag = m;
        piv = i;
      }
    }
    if (pivMag < 1e-12) throw new Error('matrix is singular');
    if (piv !== k) {
      const tmp = M[k];
      M[k] = M[piv];
      M[piv] = tmp;
    }
    const inv = 1 / M[k][k];
    for (let j = 0; j < 2 * n; j++) M[k][j] *= inv;
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const f = M[i][k];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) M[i][j] -= f * M[k][j];
    }
  }

  return M.map((row) => row.slice(n));
}
