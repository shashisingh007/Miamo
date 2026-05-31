// Pollard's p-1 factorization (BigInt).
// Returns a non-trivial factor of n, or null if the method does not find one
// within the given bound. Best for n whose factor p has (p-1) smooth.

function modPow(a: bigint, e: bigint, m: bigint): bigint {
  let r = 1n;
  a = a % m;
  while (e > 0n) {
    if (e & 1n) r = (r * a) % m;
    a = (a * a) % m;
    e >>= 1n;
  }
  return r;
}

function gcd(a: bigint, b: bigint): bigint {
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b !== 0n) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

const SMALL_PRIMES: number[] = [];
{
  const seen = new Uint8Array(200);
  for (let i = 2; i < 200; i++) {
    if (seen[i]) continue;
    SMALL_PRIMES.push(i);
    for (let j = i * i; j < 200; j += i) seen[j] = 1;
  }
}

export function pollardP1Factor(n: bigint, bound = 10000n, base = 2n): bigint | null {
  if (typeof n !== 'bigint') throw new Error('n must be a bigint');
  if (n < 2n) throw new Error('n must be >= 2');
  if (typeof bound !== 'bigint' || bound < 2n) throw new Error('bound must be a bigint >= 2');
  if (typeof base !== 'bigint' || base < 2n) throw new Error('base must be a bigint >= 2');
  if ((n & 1n) === 0n) return 2n;

  let a = base % n;
  if (a === 0n) return null;
  for (const p of SMALL_PRIMES) {
    if (BigInt(p) > bound) break;
    let pk = BigInt(p);
    while (pk * BigInt(p) <= bound) pk *= BigInt(p);
    a = modPow(a, pk, n);
    const d = gcd(a - 1n, n);
    if (d > 1n && d < n) return d;
    if (d === n) return null;
  }
  return null;
}
