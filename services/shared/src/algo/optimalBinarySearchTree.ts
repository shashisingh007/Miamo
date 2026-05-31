// Optimal Binary Search Tree (Knuth/Knuth-Yao). Given sorted keys with access
// frequencies, compute the minimum expected search cost when each key is
// looked up with its given frequency and the tree is searched root-down with
// every comparison costing 1.
//
// Returns the minimum total cost (sum over keys of freq[k] * depth(k) where
// the root is at depth 1).

export interface OptimalBstResult {
  minCost: number;
  rootIndex: number[][]; // rootIndex[i][j] = chosen root of optimal subtree on keys[i..j]
}

export function optimalBinarySearchTree(frequencies: number[]): OptimalBstResult {
  if (!Array.isArray(frequencies)) throw new TypeError('frequencies must be an array');
  for (const f of frequencies) {
    if (!Number.isFinite(f) || f < 0) throw new RangeError('frequencies must be non-negative finite numbers');
  }
  const n = frequencies.length;
  if (n === 0) return { minCost: 0, rootIndex: [] };

  // dp[i][j] = min cost of subtree on keys i..j inclusive.
  // sum[i][j] = sum of frequencies in i..j.
  const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const sum: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const root: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i += 1) {
    sum[i][i] = frequencies[i];
    dp[i][i] = frequencies[i];
    root[i][i] = i;
  }
  for (let len = 2; len <= n; len += 1) {
    for (let i = 0; i + len - 1 < n; i += 1) {
      const j = i + len - 1;
      sum[i][j] = sum[i][j - 1] + frequencies[j];
      dp[i][j] = Number.POSITIVE_INFINITY;
      // Knuth-Yao optimisation could be applied; plain O(n^3) is fine here.
      for (let r = i; r <= j; r += 1) {
        const left = r > i ? dp[i][r - 1] : 0;
        const right = r < j ? dp[r + 1][j] : 0;
        const cost = left + right + sum[i][j];
        if (cost < dp[i][j]) {
          dp[i][j] = cost;
          root[i][j] = r;
        }
      }
    }
  }
  return { minCost: dp[0][n - 1], rootIndex: root };
}
