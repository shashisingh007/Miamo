// Matrix Chain Multiplication: given the dimensions of a sequence of matrices
// A1 (d0×d1), A2 (d1×d2), ..., An (d_{n-1}×d_n), find the minimum number of
// scalar multiplications needed to compute the product, plus an optimal
// parenthesisation.
//
// Input: dimensions array of length n+1 for n matrices.

export interface MatrixChainResult {
  minCost: number;
  parenthesisation: string; // e.g. "((A1 A2) A3)"
}

export function matrixChainMultiplication(dimensions: number[]): MatrixChainResult {
  if (!Array.isArray(dimensions)) throw new TypeError('dimensions must be an array');
  for (const d of dimensions) {
    if (!Number.isInteger(d) || d <= 0) throw new RangeError('dimensions must be positive integers');
  }
  if (dimensions.length < 2) throw new RangeError('need at least 2 dimensions (one matrix)');

  const n = dimensions.length - 1;
  if (n === 1) return { minCost: 0, parenthesisation: 'A1' };

  const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const split: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let len = 2; len <= n; len += 1) {
    for (let i = 0; i + len - 1 < n; i += 1) {
      const j = i + len - 1;
      dp[i][j] = Number.POSITIVE_INFINITY;
      for (let k = i; k < j; k += 1) {
        const cost = dp[i][k] + dp[k + 1][j] + dimensions[i] * dimensions[k + 1] * dimensions[j + 1];
        if (cost < dp[i][j]) {
          dp[i][j] = cost;
          split[i][j] = k;
        }
      }
    }
  }

  const build = (i: number, j: number): string => {
    if (i === j) return `A${i + 1}`;
    const k = split[i][j];
    return `(${build(i, k)} ${build(k + 1, j)})`;
  };

  return { minCost: dp[0][n - 1], parenthesisation: build(0, n - 1) };
}
