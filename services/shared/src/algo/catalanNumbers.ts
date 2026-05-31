export function catalanNumber(n: number): bigint {
  if (!Number.isInteger(n) || n < 0) throw new RangeError('n must be a non-negative integer');
  let c = 1n;
  for (let i = 1; i <= n; i += 1) {
    c = (c * BigInt(2 * (2 * i - 1))) / BigInt(i + 1);
  }
  return c;
}

export function catalanSequence(count: number): bigint[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError('count must be a non-negative integer');
  }
  const out: bigint[] = [];
  let c = 1n;
  for (let i = 0; i < count; i += 1) {
    out.push(c);
    c = (c * BigInt(2 * (2 * (i + 1) - 1))) / BigInt(i + 2);
  }
  return out;
}
