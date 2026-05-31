export interface SavitzkyGolayOptions {
  windowSize?: number; // odd, >=3
  polyOrder?: number;  // < windowSize
}

function solveNormalEquations(A: number[][], b: number[]): number[] {
  // Gauss-Jordan on augmented matrix [AtA | Atb]
  const n = A[0].length;
  const m = A.length;
  const AtA: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const Atb: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      let s = 0;
      for (let k = 0; k < m; k += 1) s += A[k][i] * A[k][j];
      AtA[i][j] = s;
    }
    let sb = 0;
    for (let k = 0; k < m; k += 1) sb += A[k][i] * b[k];
    Atb[i] = sb;
  }
  // Augmented
  for (let i = 0; i < n; i += 1) AtA[i].push(Atb[i]);
  // Gaussian elimination with partial pivoting
  for (let i = 0; i < n; i += 1) {
    let piv = i;
    for (let k = i + 1; k < n; k += 1) {
      if (Math.abs(AtA[k][i]) > Math.abs(AtA[piv][i])) piv = k;
    }
    [AtA[i], AtA[piv]] = [AtA[piv], AtA[i]];
    const div = AtA[i][i];
    if (div === 0) throw new Error('savitzkyGolayFilter: singular matrix');
    for (let j = i; j <= n; j += 1) AtA[i][j] /= div;
    for (let k = 0; k < n; k += 1) {
      if (k === i) continue;
      const factor = AtA[k][i];
      for (let j = i; j <= n; j += 1) AtA[k][j] -= factor * AtA[i][j];
    }
  }
  return AtA.map((row) => row[n]);
}

export function savitzkyGolayFilter(values: number[], opts: SavitzkyGolayOptions = {}): number[] {
  const windowSize = opts.windowSize ?? 5;
  const polyOrder = opts.polyOrder ?? 2;
  if (!Number.isInteger(windowSize) || windowSize < 3 || windowSize % 2 === 0) {
    throw new Error('savitzkyGolayFilter: windowSize must be an odd integer >= 3');
  }
  if (!Number.isInteger(polyOrder) || polyOrder < 0 || polyOrder >= windowSize) {
    throw new Error('savitzkyGolayFilter: polyOrder must satisfy 0 <= order < windowSize');
  }
  for (const v of values) {
    if (!Number.isFinite(v)) throw new Error('savitzkyGolayFilter: non-finite value');
  }
  const half = (windowSize - 1) / 2;
  const n = values.length;
  if (n === 0) return [];
  if (n < windowSize) return values.slice();
  // Compute coefficients via least squares centered design matrix
  const A: number[][] = [];
  for (let i = -half; i <= half; i += 1) {
    const row: number[] = [];
    for (let p = 0; p <= polyOrder; p += 1) row.push(i ** p);
    A.push(row);
  }
  // Coefficients for center point: e0 = [1,0,0,...]
  // h = (AtA)^-1 At e0 ; smoothed[i] = sum_k h[k] * y[i+k-half]
  // Solve AtA c = At e0; c = first column of pseudo-inverse projected
  // Simpler: smoothed[i] = (a0 of polynomial fit)
  // We'll directly fit each window.
  const out = values.slice();
  for (let i = half; i < n - half; i += 1) {
    const window = values.slice(i - half, i + half + 1);
    const coef = solveNormalEquations(A, window);
    out[i] = coef[0]; // value at x=0
  }
  return out;
}
