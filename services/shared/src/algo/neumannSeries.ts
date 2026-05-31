// Neumann series partial sum for square matrices: sum_{k=0..K} A^k.
// Converges to (I - A)^{-1} when spectral radius of A < 1.

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, k = A[0].length, n = B[0].length;
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

export function neumannSeries(A: number[][], K: number): number[][] {
  const n = A.length;
  if (n === 0) throw new Error('neumannSeries: empty');
  for (const row of A) if (row.length !== n) throw new Error('neumannSeries: must be square');
  if (!Number.isInteger(K) || K < 0) throw new Error('neumannSeries: K must be a non-negative integer');

  // Initialize sum = I, power = I
  const S: number[][] = [];
  const P: number[][] = [];
  for (let i = 0; i < n; i++) {
    const sr = new Array(n).fill(0);
    const pr = new Array(n).fill(0);
    sr[i] = 1;
    pr[i] = 1;
    S.push(sr);
    P.push(pr);
  }
  let cur: number[][] = P;
  for (let k = 1; k <= K; k++) {
    cur = matMul(cur, A);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) S[i][j] += cur[i][j];
  }
  return S;
}
