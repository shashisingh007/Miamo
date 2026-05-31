export function integerPartitionCount(n: number): bigint {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError('n must be a non-negative integer');
  }
  const dp = new Array<bigint>(n + 1).fill(0n);
  dp[0] = 1n;
  for (let k = 1; k <= n; k += 1) {
    for (let i = k; i <= n; i += 1) {
      dp[i] += dp[i - k];
    }
  }
  return dp[n];
}

export function integerPartitions(n: number): number[][] {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError('n must be a non-negative integer');
  }
  const out: number[][] = [];
  const cur: number[] = [];
  const recur = (remaining: number, maxPart: number) => {
    if (remaining === 0) {
      out.push(cur.slice());
      return;
    }
    for (let i = Math.min(remaining, maxPart); i >= 1; i -= 1) {
      cur.push(i);
      recur(remaining - i, i);
      cur.pop();
    }
  };
  recur(n, n);
  return out;
}
