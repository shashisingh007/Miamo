// Gaussian elimination with partial pivoting. Solves Ax = b for a square,
// invertible coefficient matrix A of shape n x n and right-hand side b of
// length n. Returns the solution vector x. Throws on singular/near-singular
// matrices.
//
// Input matrices are NOT mutated.

export function gaussianElimination(A: number[][], b: number[], tol = 1e-12): number[] {
  if (!Array.isArray(A) || !Array.isArray(b)) throw new TypeError('A must be 2D array, b must be array');
  const n = A.length;
  if (n === 0) return [];
  for (const row of A) {
    if (!Array.isArray(row) || row.length !== n) throw new RangeError('A must be square');
    for (const v of row) if (!Number.isFinite(v)) throw new RangeError('A entries must be finite');
  }
  if (b.length !== n) throw new RangeError('b length must equal A row count');
  for (const v of b) if (!Number.isFinite(v)) throw new RangeError('b entries must be finite');
  if (!Number.isFinite(tol) || tol <= 0) throw new RangeError('tol must be positive finite');

  // Build augmented matrix [A|b], deep copied.
  const m: number[][] = new Array(n);
  for (let i = 0; i < n; i += 1) {
    m[i] = new Array(n + 1);
    for (let j = 0; j < n; j += 1) m[i][j] = A[i][j];
    m[i][n] = b[i];
  }

  // Forward elimination with partial pivoting.
  for (let k = 0; k < n; k += 1) {
    let pivot = k;
    let pivotMag = Math.abs(m[k][k]);
    for (let i = k + 1; i < n; i += 1) {
      const mag = Math.abs(m[i][k]);
      if (mag > pivotMag) {
        pivot = i;
        pivotMag = mag;
      }
    }
    if (pivotMag < tol) throw new Error('matrix is singular or near-singular');
    if (pivot !== k) {
      const tmp = m[k];
      m[k] = m[pivot];
      m[pivot] = tmp;
    }
    for (let i = k + 1; i < n; i += 1) {
      const factor = m[i][k] / m[k][k];
      for (let j = k; j <= n; j += 1) m[i][j] -= factor * m[k][j];
    }
  }

  // Back substitution.
  const x: number[] = new Array(n);
  for (let i = n - 1; i >= 0; i -= 1) {
    let s = m[i][n];
    for (let j = i + 1; j < n; j += 1) s -= m[i][j] * x[j];
    x[i] = s / m[i][i];
  }
  return x;
}
