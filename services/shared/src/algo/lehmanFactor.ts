function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    [x, y] = [y, x % y];
  }
  return x;
}

function isqrt(n: bigint): bigint {
  if (n < 0n) throw new Error('isqrt: n must be non-negative');
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) >> 1n;
  while (y < x) {
    x = y;
    y = (x + n / x) >> 1n;
  }
  return x;
}

function icbrt(n: bigint): bigint {
  if (n < 0n) throw new Error('icbrt: n must be non-negative');
  if (n < 2n) return n;
  let lo = 1n;
  let hi = 1n;
  while (hi * hi * hi <= n) hi <<= 1n;
  while (lo < hi) {
    const mid = (lo + hi + 1n) >> 1n;
    if (mid * mid * mid <= n) lo = mid;
    else hi = mid - 1n;
  }
  return lo;
}

export function lehmanFactor(n: number | bigint): bigint | null {
  const N = typeof n === 'bigint' ? n : BigInt(n);
  if (N < 2n) throw new Error('lehmanFactor: n must be >= 2');
  if ((N & 1n) === 0n) return 2n;
  // trial division up to n^(1/3)
  const cbrt = icbrt(N);
  for (let d = 3n; d <= cbrt; d += 2n) {
    if (N % d === 0n) return d;
  }
  // Lehman search
  const limit = cbrt + 1n;
  for (let k = 1n; k <= limit; k++) {
    const four_kn = 4n * k * N;
    const sqrt_4kn = isqrt(four_kn);
    const aLo = sqrt_4kn;
    // upper bound: aLo + cbrt/(4*sqrt(k)) approximately. Use cbrt as conservative cap.
    const aHi = aLo + cbrt + 1n;
    for (let a = aLo; a <= aHi; a++) {
      const a2 = a * a;
      if (a2 < four_kn) continue;
      const b2 = a2 - four_kn;
      const b = isqrt(b2);
      if (b * b !== b2) continue;
      const g = gcd(a + b, N);
      if (g > 1n && g < N) return g;
      const g2 = gcd(a >= b ? a - b : b - a, N);
      if (g2 > 1n && g2 < N) return g2;
    }
  }
  return null;
}
