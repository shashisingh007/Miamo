// Simplex method for standard-form LPs:
//   maximize c · x  subject to Ax <= b, x >= 0, b >= 0
// Returns the optimal x*, objective value, and a status flag.

export interface SimplexResult {
  status: 'optimal' | 'unbounded';
  x: number[];
  value: number;
}

export function simplexLinearProg(
  c: ReadonlyArray<number>,
  a: ReadonlyArray<ReadonlyArray<number>>,
  b: ReadonlyArray<number>,
): SimplexResult {
  if (!Array.isArray(c) || c.length === 0) throw new Error('simplexLinearProg: c must be non-empty');
  if (!Array.isArray(a)) throw new Error('simplexLinearProg: a must be an array');
  if (!Array.isArray(b)) throw new Error('simplexLinearProg: b must be an array');
  const m = a.length;
  const n = c.length;
  if (b.length !== m) throw new Error('simplexLinearProg: b length must equal number of constraints');
  for (let i = 0; i < m; i += 1) {
    if (a[i].length !== n) throw new Error('simplexLinearProg: row length mismatch');
    if (b[i] < 0) throw new Error('simplexLinearProg: b must be non-negative (no Phase I implemented)');
  }

  const cols = n + m + 1; // x vars + slacks + RHS
  const rows = m + 1; // constraints + objective
  const tab: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const basis: number[] = new Array(m);

  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < n; j += 1) tab[i][j] = a[i][j];
    tab[i][n + i] = 1;
    tab[i][cols - 1] = b[i];
    basis[i] = n + i;
  }
  for (let j = 0; j < n; j += 1) tab[m][j] = -c[j];

  const MAX_ITER = 200 * (n + m);
  for (let iter = 0; iter < MAX_ITER; iter += 1) {
    let pivotCol = -1;
    let mostNeg = -1e-12;
    for (let j = 0; j < cols - 1; j += 1) {
      if (tab[m][j] < mostNeg) {
        mostNeg = tab[m][j];
        pivotCol = j;
      }
    }
    if (pivotCol === -1) break; // optimal

    let pivotRow = -1;
    let bestRatio = Infinity;
    for (let i = 0; i < m; i += 1) {
      if (tab[i][pivotCol] > 1e-12) {
        const ratio = tab[i][cols - 1] / tab[i][pivotCol];
        if (ratio < bestRatio - 1e-12) {
          bestRatio = ratio;
          pivotRow = i;
        }
      }
    }
    if (pivotRow === -1) {
      return { status: 'unbounded', x: new Array(n).fill(0), value: Infinity };
    }

    const piv = tab[pivotRow][pivotCol];
    for (let j = 0; j < cols; j += 1) tab[pivotRow][j] /= piv;
    for (let i = 0; i < rows; i += 1) {
      if (i === pivotRow) continue;
      const factor = tab[i][pivotCol];
      if (factor === 0) continue;
      for (let j = 0; j < cols; j += 1) tab[i][j] -= factor * tab[pivotRow][j];
    }
    basis[pivotRow] = pivotCol;
  }

  const x = new Array<number>(n).fill(0);
  for (let i = 0; i < m; i += 1) {
    if (basis[i] < n) x[basis[i]] = tab[i][cols - 1];
  }
  return { status: 'optimal', x, value: tab[m][cols - 1] };
}
