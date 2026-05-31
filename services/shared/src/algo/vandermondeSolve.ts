// Solve V * a = y where V is the Vandermonde matrix [x_i^j] (n x n) for distinct x_i.
// Uses Bjorck-Pereyra algorithm with O(n^2) cost.

export function vandermondeSolve(xs: number[], ys: number[]): number[] {
  const n = xs.length;
  if (n === 0) throw new Error('vandermondeSolve: empty');
  if (ys.length !== n) throw new Error('vandermondeSolve: length mismatch');
  // Check distinct nodes
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (xs[i] === xs[j]) throw new Error('vandermondeSolve: duplicate nodes');
  }
  const a = ys.slice();
  // Forward (compute divided differences)
  for (let k = 0; k < n - 1; k++) {
    for (let i = n - 1; i > k; i--) {
      a[i] = (a[i] - a[i - 1]) / (xs[i] - xs[i - k - 1]);
    }
  }
  // Backward (convert from Newton basis to monomial)
  for (let k = n - 2; k >= 0; k--) {
    for (let i = k; i < n - 1; i++) {
      a[i] -= xs[k] * a[i + 1];
    }
  }
  return a;
}
