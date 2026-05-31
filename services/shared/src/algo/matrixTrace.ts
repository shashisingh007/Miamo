// Trace of a square matrix: sum of diagonal entries.

export function matrixTrace(A: number[][]): number {
  if (!Array.isArray(A) || A.length === 0) throw new Error('matrixTrace: empty');
  const n = A.length;
  for (const row of A) if (row.length !== n) throw new Error('matrixTrace: must be square');
  let s = 0;
  for (let i = 0; i < n; i++) {
    const v = A[i][i];
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('matrixTrace: non-finite diagonal entry');
    s += v;
  }
  return s;
}
