// Stirling numbers of the second kind: S(n,k) = number of partitions of an
// n-element set into k non-empty subsets. Recurrence: S(n,k)=k*S(n-1,k)+S(n-1,k-1).

export function stirlingSecond(n: number, k: number): number {
  if (!Number.isInteger(n) || n < 0) throw new Error('stirlingSecond: n must be non-negative integer');
  if (!Number.isInteger(k) || k < 0) throw new Error('stirlingSecond: k must be non-negative integer');
  if (k === 0) return n === 0 ? 1 : 0;
  if (k > n) return 0;
  if (k === n || k === 1) return 1;
  // dp[j] = S(*, j)
  let prev = new Array<number>(k + 1).fill(0);
  prev[0] = 1; // S(0,0)=1
  for (let i = 1; i <= n; i += 1) {
    const cur = new Array<number>(k + 1).fill(0);
    const upper = Math.min(i, k);
    for (let j = 1; j <= upper; j += 1) {
      cur[j] = j * prev[j] + prev[j - 1];
    }
    prev = cur;
  }
  return prev[k];
}

export function bellNumber(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new Error('bellNumber: n must be non-negative integer');
  let s = 0;
  for (let k = 0; k <= n; k += 1) s += stirlingSecond(n, k);
  return s;
}

export function stirlingNumbers() {
  return { stirlingSecond, bellNumber };
}
