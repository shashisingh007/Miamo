// Sherman-Morrison rank-1 inverse update.
// Given Ainv = A^{-1} (n x n) and column vectors u, v of length n,
// returns (A + u v^T)^{-1} = Ainv - (Ainv u)(v^T Ainv) / (1 + v^T Ainv u).
// Throws if 1 + v^T Ainv u == 0 (singular update).

function matVec(A: number[][], x: number[]): number[] {
  const n = A.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const row = A[i];
    let s = 0;
    for (let j = 0; j < x.length; j++) s += row[j] * x[j];
    y[i] = s;
  }
  return y;
}

function rowVecTimesMat(v: number[], A: number[][]): number[] {
  const n = A.length;
  const m = A[0].length;
  const y = new Array(m).fill(0);
  for (let j = 0; j < m; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += v[i] * A[i][j];
    y[j] = s;
  }
  return y;
}

export function shermanMorrisonUpdate(
  Ainv: number[][],
  u: number[],
  v: number[],
): number[][] {
  if (!Array.isArray(Ainv) || Ainv.length === 0) throw new Error('shermanMorrisonUpdate: empty Ainv');
  const n = Ainv.length;
  for (const row of Ainv) if (row.length !== n) throw new Error('shermanMorrisonUpdate: Ainv must be square');
  if (u.length !== n) throw new Error('shermanMorrisonUpdate: u length mismatch');
  if (v.length !== n) throw new Error('shermanMorrisonUpdate: v length mismatch');

  const Ainv_u = matVec(Ainv, u);
  const vT_Ainv = rowVecTimesMat(v, Ainv);
  let denom = 1;
  for (let j = 0; j < n; j++) denom += v[j] * Ainv_u[j];
  if (denom === 0 || !Number.isFinite(denom)) throw new Error('shermanMorrisonUpdate: singular update');

  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n);
    for (let j = 0; j < n; j++) {
      row[j] = Ainv[i][j] - (Ainv_u[i] * vT_Ainv[j]) / denom;
    }
    out.push(row);
  }
  return out;
}
