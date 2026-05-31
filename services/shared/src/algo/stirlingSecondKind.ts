export function stirlingSecondKind(n: number, k: number): bigint {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0) {
    throw new RangeError('n and k must be non-negative integers');
  }
  if (k === 0) return n === 0 ? 1n : 0n;
  if (k > n) return 0n;
  if (k === n) return 1n;
  if (k === 1) return 1n;
  const row = new Array<bigint>(k + 1).fill(0n);
  row[0] = 0n;
  row[1] = 1n;
  for (let i = 2; i <= n; i += 1) {
    const next = new Array<bigint>(k + 1).fill(0n);
    for (let j = 1; j <= Math.min(i, k); j += 1) {
      next[j] = BigInt(j) * row[j] + row[j - 1];
    }
    for (let j = 0; j <= k; j += 1) row[j] = next[j];
  }
  return row[k];
}

export function bellNumber(n: number): bigint {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError('n must be a non-negative integer');
  }
  let sum = 0n;
  for (let k = 0; k <= n; k += 1) sum += stirlingSecondKind(n, k);
  return sum;
}
