// Modified Gram-Schmidt orthogonalization. Returns Q (m x k where k <= n) and
// R (k x n) such that A = Q R for input m x n A. Skips columns that are linearly
// dependent within tolerance, so rank may be less than min(m,n).

export interface ModifiedGramSchmidtResult {
  Q: number[][]; // m x k
  R: number[][]; // k x n
  rank: number;
}

function dot(a: number[], b: number[]): number {
  let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s;
}

export function modifiedGramSchmidt(A: number[][], tol = 1e-12): ModifiedGramSchmidtResult {
  if (!A.length) throw new Error('modifiedGramSchmidt: empty');
  const m = A.length;
  const n = A[0].length;
  for (const r of A) if (r.length !== n) throw new Error('modifiedGramSchmidt: ragged');
  // Column vectors of A
  const cols: number[][] = [];
  for (let j = 0; j < n; j++) {
    const c = new Array(m);
    for (let i = 0; i < m; i++) c[i] = A[i][j];
    cols.push(c);
  }
  const Qcols: number[][] = [];
  const R: number[][] = []; // we will index by [Qrow][colj]
  for (let j = 0; j < n; j++) {
    const v = cols[j].slice();
    const rRow = new Array(n).fill(0);
    for (let i = 0; i < Qcols.length; i++) {
      const r = dot(Qcols[i], v);
      R[i][j] = r;
      for (let p = 0; p < m; p++) v[p] -= r * Qcols[i][p];
    }
    const norm = Math.sqrt(dot(v, v));
    if (norm > tol) {
      for (let p = 0; p < m; p++) v[p] /= norm;
      Qcols.push(v);
      rRow[j] = norm;
      // Push into R as new row corresponding to this q
      R.push(rRow);
    }
  }
  // Q is m x k from Qcols
  const k = Qcols.length;
  const Q: number[][] = Array.from({ length: m }, () => new Array(k).fill(0));
  for (let j = 0; j < k; j++) for (let i = 0; i < m; i++) Q[i][j] = Qcols[j][i];
  // R currently is k x n already (we appended row per accepted q with norm slot;
  // off-diagonals from rejected vectors do not appear because we only push when accepted)
  // But for j where vector was rejected, R has no row for it; we still need projections
  // recorded against accepted q's. Re-iterate to compute R properly.
  const Rfix: number[][] = Array.from({ length: k }, () => new Array(n).fill(0));
  // Recompute R as Q^T A
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let p = 0; p < m; p++) s += Q[p][i] * A[p][j];
      Rfix[i][j] = s;
    }
  }
  return { Q, R: Rfix, rank: k };
}
