// Nesterov accelerated gradient method for the quadratic 0.5 x^T A x - b^T x.
// Gradient: A x - b. Step size 1/L where L = upper bound on largest eigenvalue of A.
// Iteration:
//   y = x + ((k-1)/(k+2)) * (x - xPrev)
//   xNew = y - (1/L) * (A y - b)
// Returns x.

export interface NesterovOptions {
  iterations?: number;
  L?: number;
  x0?: number[];
}

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

function defaultLipschitz(A: number[][]): number {
  // Gershgorin bound: max_i sum_j |A[i][j]|
  let bound = 0;
  for (let i = 0; i < A.length; i++) {
    let s = 0;
    for (let j = 0; j < A[i].length; j++) s += Math.abs(A[i][j]);
    if (s > bound) bound = s;
  }
  return bound;
}

export function nesterovAcceleratedGd(
  A: number[][],
  b: number[],
  opts: NesterovOptions = {},
): number[] {
  if (!Array.isArray(A) || A.length === 0) throw new Error('nesterovAcceleratedGd: empty');
  const n = A.length;
  for (const row of A) if (row.length !== n) throw new Error('nesterovAcceleratedGd: A must be square');
  if (b.length !== n) throw new Error('nesterovAcceleratedGd: b length mismatch');
  const iterations = opts.iterations ?? 500;
  if (!Number.isInteger(iterations) || iterations <= 0) throw new Error('nesterovAcceleratedGd: bad iterations');
  const L = opts.L ?? defaultLipschitz(A);
  if (!Number.isFinite(L) || L <= 0) throw new Error('nesterovAcceleratedGd: bad L');

  let x = opts.x0 ? opts.x0.slice() : new Array(n).fill(0);
  if (x.length !== n) throw new Error('nesterovAcceleratedGd: x0 length mismatch');
  let xPrev = x.slice();

  for (let k = 1; k <= iterations; k++) {
    const beta = (k - 1) / (k + 2);
    const y = new Array(n);
    for (let i = 0; i < n; i++) y[i] = x[i] + beta * (x[i] - xPrev[i]);
    const Ay = matVec(A, y);
    const xNew = new Array(n);
    for (let i = 0; i < n; i++) xNew[i] = y[i] - (Ay[i] - b[i]) / L;
    xPrev = x;
    x = xNew;
  }
  return x;
}
