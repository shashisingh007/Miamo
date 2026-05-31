// Matrix exponential via Padé approximation with scaling and squaring.
// Computes exp(A) for a square real matrix.

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

function matAdd(A: number[][], B: number[][], scaleB = 1): number[][] {
  const n = A.length;
  const C: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n);
    for (let j = 0; j < n; j++) row[j] = A[i][j] + scaleB * B[i][j];
    C.push(row);
  }
  return C;
}

function matScale(A: number[][], s: number): number[][] {
  const n = A.length;
  const C: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n);
    for (let j = 0; j < n; j++) row[j] = s * A[i][j];
    C.push(row);
  }
  return C;
}

function eye(n: number): number[][] {
  const I: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[i] = 1;
    I.push(row);
  }
  return I;
}

function inverse(M: number[][]): number[][] {
  const n = M.length;
  const A: number[][] = M.map((r) => r.slice());
  const I = eye(n);
  for (let k = 0; k < n; k++) {
    let p = k;
    let max = Math.abs(A[k][k]);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(A[i][k]);
      if (v > max) { max = v; p = i; }
    }
    if (max < 1e-14) throw new Error('matrixExponential: singular intermediate');
    if (p !== k) { [A[k], A[p]] = [A[p], A[k]]; [I[k], I[p]] = [I[p], I[k]]; }
    const piv = A[k][k];
    for (let j = 0; j < n; j++) { A[k][j] /= piv; I[k][j] /= piv; }
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const f = A[i][k];
      if (f === 0) continue;
      for (let j = 0; j < n; j++) {
        A[i][j] -= f * A[k][j];
        I[i][j] -= f * I[k][j];
      }
    }
  }
  return I;
}

function infNorm(A: number[][]): number {
  let max = 0;
  for (let i = 0; i < A.length; i++) {
    let s = 0;
    for (let j = 0; j < A[0].length; j++) s += Math.abs(A[i][j]);
    if (s > max) max = s;
  }
  return max;
}

export function matrixExponential(A: number[][]): number[][] {
  const n = A.length;
  if (n === 0) throw new Error('matrixExponential: empty');
  for (const row of A) if (row.length !== n) throw new Error('matrixExponential: must be square');

  // Scaling
  const norm = infNorm(A);
  let s = 0;
  if (norm > 0.5) s = Math.max(0, Math.ceil(Math.log2(norm / 0.5)));
  const scale = Math.pow(2, -s);
  const As = matScale(A, scale);

  // Padé(3,3) coefficients (diagonal Padé approximation of exp):
  // N(x) = 1 + x/2 + x^2/10 + x^3/120
  // D(x) = 1 - x/2 + x^2/10 - x^3/120
  // exp(A) ≈ D(A)^{-1} N(A)
  const A2 = matMul(As, As);
  const A3 = matMul(A2, As);

  const I = eye(n);
  // N = I + As/2 + A2/10 + A3/120
  let N = matScale(I, 1);
  N = matAdd(N, As, 1 / 2);
  N = matAdd(N, A2, 1 / 10);
  N = matAdd(N, A3, 1 / 120);
  // D = I - As/2 + A2/10 - A3/120
  let D = matScale(I, 1);
  D = matAdd(D, As, -1 / 2);
  D = matAdd(D, A2, 1 / 10);
  D = matAdd(D, A3, -1 / 120);

  let E = matMul(inverse(D), N);

  // Squaring
  for (let k = 0; k < s; k++) E = matMul(E, E);
  return E;
}
