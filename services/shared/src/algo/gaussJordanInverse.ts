// Inverse of a square matrix via Gauss-Jordan elimination with partial pivoting.

export function gaussJordanInverse(A: number[][]): number[][] {
  const n = A.length;
  if (n === 0) throw new Error('gaussJordanInverse: empty');
  for (const r of A) if (r.length !== n) throw new Error('gaussJordanInverse: not square');
  const M = A.map((r) => r.slice());
  const I: number[][] = Array.from({ length: n }, (_, i) => {
    const r = new Array(n).fill(0); r[i] = 1; return r;
  });
  for (let k = 0; k < n; k++) {
    let piv = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[piv][k])) piv = i;
    if (Math.abs(M[piv][k]) < 1e-14) throw new Error('gaussJordanInverse: singular');
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
