export function jacobiSymbol(a: number | bigint, n: number | bigint): -1 | 0 | 1 {
  const N = typeof n === 'bigint' ? n : BigInt(n);
  if (N <= 0n || (N & 1n) === 0n) throw new Error('jacobiSymbol: n must be positive odd integer');
  let A = typeof a === 'bigint' ? a : BigInt(a);
  A = A % N;
  if (A < 0n) A += N;
  let nn = N;
  let result: 1 | -1 = 1;
  while (A !== 0n) {
    while ((A & 1n) === 0n) {
      A >>= 1n;
      const r = nn & 7n;
      if (r === 3n || r === 5n) result = (-result) as 1 | -1;
    }
    [A, nn] = [nn, A];
    if ((A & 3n) === 3n && (nn & 3n) === 3n) result = (-result) as 1 | -1;
    A = A % nn;
  }
  return nn === 1n ? result : 0;
}
