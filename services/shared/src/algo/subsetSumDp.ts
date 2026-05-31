// Subset-sum dynamic programming over non-negative integers.
//
// canMakeSum(weights, target):    boolean — does some subset of weights sum
//                                  to exactly target?
// subsetSumWitness(weights, target): number[] | null — indices of one such
//                                  subset, or null if impossible.
// countSubsetsWithSum(weights, target): number — number of distinct subsets
//                                  (by index) whose sum equals target.

function validate(weights: number[], target: number): void {
  if (!Array.isArray(weights)) throw new TypeError('weights must be an array');
  for (const w of weights) {
    if (!Number.isInteger(w) || w < 0) throw new RangeError('weights must be non-negative integers');
  }
  if (!Number.isInteger(target) || target < 0) throw new RangeError('target must be a non-negative integer');
}

export function canMakeSum(weights: number[], target: number): boolean {
  validate(weights, target);
  const dp = new Uint8Array(target + 1);
  dp[0] = 1;
  for (const w of weights) {
    if (w > target) continue;
    for (let s = target; s >= w; s -= 1) {
      if (dp[s - w]) dp[s] = 1;
    }
  }
  return dp[target] === 1;
}

export function subsetSumWitness(weights: number[], target: number): number[] | null {
  validate(weights, target);
  const n = weights.length;
  // 2D dp so we can reconstruct.
  const dp: Uint8Array[] = new Array(n + 1);
  for (let i = 0; i <= n; i += 1) dp[i] = new Uint8Array(target + 1);
  dp[0][0] = 1;
  for (let i = 1; i <= n; i += 1) {
    const w = weights[i - 1];
    for (let s = 0; s <= target; s += 1) {
      if (dp[i - 1][s]) dp[i][s] = 1;
      if (w <= s && dp[i - 1][s - w]) dp[i][s] = 1;
    }
  }
  if (!dp[n][target]) return null;
  const out: number[] = [];
  let s = target;
  for (let i = n; i > 0; i -= 1) {
    const w = weights[i - 1];
    if (w <= s && dp[i - 1][s - w]) {
      out.push(i - 1);
      s -= w;
    }
  }
  out.reverse();
  return out;
}

export function countSubsetsWithSum(weights: number[], target: number): number {
  validate(weights, target);
  const dp = new Array<number>(target + 1).fill(0);
  dp[0] = 1;
  for (const w of weights) {
    if (w > target) continue;
    for (let s = target; s >= w; s -= 1) {
      dp[s] += dp[s - w];
    }
  }
  return dp[target];
}
