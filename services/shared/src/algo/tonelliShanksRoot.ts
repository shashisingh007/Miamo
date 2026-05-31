// Tonelli-Shanks: compute a square root of n modulo an odd prime p, i.e.
// returns r with r^2 ≡ n (mod p), or null if no such root exists.
// Implementation uses BigInt; supports arbitrary-precision primes.

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let b = ((base % mod) + mod) % mod;
  let e = exp;
  let r = 1n;
  while (e > 0n) {
    if (e & 1n) r = (r * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return r;
}

function legendreSymbol(a: bigint, p: bigint): bigint {
  return modPow(a, (p - 1n) / 2n, p);
}

export function tonelliShanksSqrt(n: bigint, p: bigint): bigint | null {
  if (typeof n !== 'bigint' || typeof p !== 'bigint') {
    throw new Error('tonelliShanksSqrt: inputs must be bigint');
  }
  if (p < 2n) throw new Error('tonelliShanksSqrt: p must be >= 2');
  const a = ((n % p) + p) % p;
  if (a === 0n) return 0n;
  if (p === 2n) return a;
  // Quadratic residue check via Euler.
  if (legendreSymbol(a, p) !== 1n) return null;
  if (p % 4n === 3n) {
    return modPow(a, (p + 1n) / 4n, p);
  }
  // Find Q, S such that p - 1 = Q * 2^S, Q odd.
  let q = p - 1n;
  let s = 0n;
  while ((q & 1n) === 0n) {
    q >>= 1n;
    s += 1n;
  }
  // Find a non-residue z.
  let z = 2n;
  while (legendreSymbol(z, p) !== p - 1n) {
    z += 1n;
  }
  let m = s;
  let c = modPow(z, q, p);
  let t = modPow(a, q, p);
  let r = modPow(a, (q + 1n) / 2n, p);
  while (true) {
    if (t === 1n) return r;
    // find least i with t^(2^i) = 1
    let i = 0n;
    let tmp = t;
    while (tmp !== 1n) {
      tmp = (tmp * tmp) % p;
      i += 1n;
      if (i === m) return null;
    }
    const b = modPow(c, 1n << (m - i - 1n), p);
    const b2 = (b * b) % p;
    m = i;
    c = b2;
    t = (t * b2) % p;
    r = (r * b) % p;
  }
}

export function tonelliShanksRoot() {
  return { tonelliShanksSqrt };
}
