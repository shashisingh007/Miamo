export function eulerTotient(n: number): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError('n must be a positive integer');
  }
  let result = n;
  let m = n;
  for (let p = 2; p * p <= m; p += 1) {
    if (m % p === 0) {
      while (m % p === 0) m = Math.floor(m / p);
      result -= Math.floor(result / p);
    }
  }
  if (m > 1) {
    result -= Math.floor(result / m);
  }
  return result;
}

export function totientsUpTo(n: number): number[] {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError('n must be a non-negative integer');
  }
  const phi = new Array<number>(n + 1);
  for (let i = 0; i <= n; i += 1) phi[i] = i;
  for (let i = 2; i <= n; i += 1) {
    if (phi[i] === i) {
      for (let j = i; j <= n; j += i) {
        phi[j] -= Math.floor(phi[j] / i);
      }
    }
  }
  return phi;
}
