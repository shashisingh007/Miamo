// Held-Karp dynamic programming for the Travelling Salesman Problem.
// Bitmask DP over visited-set subsets. O(n^2 * 2^n) time, O(n * 2^n) memory.
// Suitable for n up to ~16. Input: n x n cost matrix of non-negative finite
// numbers. Returns minimum tour cost starting and ending at city 0, plus the
// tour as a list of city indices [0, ..., 0] of length n+1.

export interface HeldKarpResult {
  minCost: number;
  tour: number[]; // length n + 1, first === last === 0
}

const MAX_N = 16;

export function heldKarpTSP(cost: number[][]): HeldKarpResult {
  if (!Array.isArray(cost)) throw new TypeError('cost must be a 2D array');
  const n = cost.length;
  if (n === 0) return { minCost: 0, tour: [] };
  if (n > MAX_N) throw new RangeError(`n must be <= ${MAX_N}`);
  for (const row of cost) {
    if (!Array.isArray(row) || row.length !== n) throw new RangeError('cost must be square');
    for (const v of row) if (!Number.isFinite(v)) throw new RangeError('cost entries must be finite');
  }
  if (n === 1) return { minCost: 0, tour: [0, 0] };

  const SIZE = 1 << n;
  // dp[mask][i] = min cost to start at 0, visit exactly the set `mask` (must
  // include 0 and i), ending at i.
  const dp: number[][] = Array.from({ length: SIZE }, () => new Array(n).fill(Number.POSITIVE_INFINITY));
  const parent: number[][] = Array.from({ length: SIZE }, () => new Array(n).fill(-1));
  dp[1][0] = 0;
  for (let mask = 1; mask < SIZE; mask += 1) {
    if ((mask & 1) === 0) continue;
    for (let i = 0; i < n; i += 1) {
      if (!(mask & (1 << i))) continue;
      if (dp[mask][i] === Number.POSITIVE_INFINITY) continue;
      for (let j = 0; j < n; j += 1) {
        if (mask & (1 << j)) continue;
        const newMask = mask | (1 << j);
        const cand = dp[mask][i] + cost[i][j];
        if (cand < dp[newMask][j]) {
          dp[newMask][j] = cand;
          parent[newMask][j] = i;
        }
      }
    }
  }

  const full = SIZE - 1;
  let best = Number.POSITIVE_INFINITY;
  let endCity = -1;
  for (let i = 1; i < n; i += 1) {
    const c = dp[full][i] + cost[i][0];
    if (c < best) {
      best = c;
      endCity = i;
    }
  }
  if (endCity === -1) throw new Error('no tour exists');

  // reconstruct
  const tour: number[] = [];
  let cur = endCity;
  let mask = full;
  while (cur !== -1) {
    tour.push(cur);
    const p = parent[mask][cur];
    mask ^= 1 << cur;
    cur = p;
  }
  tour.reverse();
  tour.push(0);
  return { minCost: best, tour };
}
