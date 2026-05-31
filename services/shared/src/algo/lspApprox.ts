// Polynomial least-squares fit via normal equations using Cholesky.
// Returns coefficients [a0, a1, ..., aD] such that p(x) = sum a_i x^i minimizes
// sum (p(x_k) - y_k)^2. Throws if matrix is singular (e.g., fewer points than D+1).

function cholFactor(A: number[][]): number[][] {
  const n = A.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (s <= 0) throw new Error('lspApprox: normal matrix not PD');
        L[i][j] = Math.sqrt(s);
      } else {
        L[i][j] = s / L[j][j];
      }
    }
  }
  return L;
}

function cholSolve(L: number[][], b: number[]): number[] {
  const n = L.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * y[k];
    y[i] = s / L[i][i];
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
    x[i] = s / L[i][i];
  }
  return x;
}

export function lspApprox(xs: number[], ys: number[], degree: number): number[] {
  if (xs.length === 0 || ys.length === 0) throw new Error('lspApprox: empty input');
  if (xs.length !== ys.length) throw new Error('lspApprox: length mismatch');
  if (degree < 0 || !Number.isInteger(degree)) throw new Error('lspApprox: invalid degree');
  if (xs.length < degree + 1) throw new Error('lspApprox: not enough points');
  const n = xs.length;
  const D = degree + 1;
  // Build Vandermonde V (n x D), then normal A = V^T V, b = V^T y
  const A: number[][] = Array.from({ length: D }, () => new Array(D).fill(0));
  const bv: number[] = new Array(D).fill(0);
  for (let k = 0; k < n; k++) {
    const x = xs[k];
    const powers = new Array(D);
    powers[0] = 1;
    for (let p = 1; p < D; p++) powers[p] = powers[p - 1] * x;
    for (let i = 0; i < D; i++) {
      bv[i] += powers[i] * ys[k];
      for (let j = 0; j < D; j++) A[i][j] += powers[i] * powers[j];
    }
  }
  const L = cholFactor(A);
  return cholSolve(L, bv);
}

export function lspEval(coeffs: number[], x: number): number {
  let s = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) s = s * x + coeffs[i];
  return s;
}
