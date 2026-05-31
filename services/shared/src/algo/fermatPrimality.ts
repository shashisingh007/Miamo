// Fermat primality test using BigInt modular exponentiation. Probabilistic;
// returns true when n passes the test for all bases tried, false when n is
// definitely composite. Carmichael numbers can fool this test, which is why
// callers should still prefer Miller-Rabin for production. Bases are
// deterministic so the test result is reproducible.

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  let b = base % mod;
  if (b < 0n) b += mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    e >>= 1n;
    b = (b * b) % mod;
  }
  return result;
}

const DEFAULT_BASES: bigint[] = [2n, 3n, 5n, 7n, 11n, 13n];

export function fermatPrimality(n: bigint, bases: bigint[] = DEFAULT_BASES): boolean {
  if (n < 2n) return false;
  if (n === 2n || n === 3n) return true;
  if ((n & 1n) === 0n) return false;
  for (const a of bases) {
    if (a <= 1n) continue;
    if (a >= n) continue;
    if (modPow(a, n - 1n, n) !== 1n) return false;
  }
  return true;
}
