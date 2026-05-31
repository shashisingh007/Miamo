// Number Theoretic Transform (NTT) convolution mod a friendly prime.
// Uses prime p = 998244353 = 119 * 2^23 + 1 with primitive root g = 3.
// Polynomial convolution: convolveNTT(a, b) returns a *circular-free* product
// modulo p (length = next power of two >= a.length + b.length - 1, trimmed).
//
// Inputs are non-negative integers < p. Throws if not.

const MOD = 998244353n;
const G = 3n;

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let b = base % mod;
  if (b < 0n) b += mod;
  let e = exp;
  let result = 1n;
  while (e > 0n) {
    if ((e & 1n) === 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

function modInverse(x: bigint, mod: bigint): bigint {
  return modPow(x, mod - 2n, mod);
}

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

function nttInPlace(a: bigint[], invert: boolean): void {
  const n = a.length;
  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const w = invert
      ? modInverse(modPow(G, (MOD - 1n) / BigInt(len), MOD), MOD)
      : modPow(G, (MOD - 1n) / BigInt(len), MOD);
    for (let i = 0; i < n; i += len) {
      let wn = 1n;
      const half = len >> 1;
      for (let k = 0; k < half; k += 1) {
        const u = a[i + k];
        const v = (a[i + k + half] * wn) % MOD;
        a[i + k] = (u + v) % MOD;
        a[i + k + half] = (u - v + MOD) % MOD;
        wn = (wn * w) % MOD;
      }
    }
  }
  if (invert) {
    const nInv = modInverse(BigInt(n), MOD);
    for (let i = 0; i < n; i += 1) a[i] = (a[i] * nInv) % MOD;
  }
}

export function nttConvolution(a: number[] | bigint[], b: number[] | bigint[]): bigint[] {
  if (!Array.isArray(a) || !Array.isArray(b)) throw new TypeError('inputs must be arrays');
  if (a.length === 0 || b.length === 0) return [];
  const toBig = (x: number | bigint): bigint => {
    const v = typeof x === 'bigint' ? x : BigInt(x);
    if (v < 0n || v >= MOD) throw new RangeError(`value out of range [0, ${MOD})`);
    return v;
  };
  const A: bigint[] = (a as Array<number | bigint>).map(toBig);
  const B: bigint[] = (b as Array<number | bigint>).map(toBig);
  const resultLen = A.length + B.length - 1;
  let n = 1;
  while (n < resultLen) n <<= 1;
  while (A.length < n) A.push(0n);
  while (B.length < n) B.push(0n);
  nttInPlace(A, false);
  nttInPlace(B, false);
  for (let i = 0; i < n; i += 1) A[i] = (A[i] * B[i]) % MOD;
  nttInPlace(A, true);
  return A.slice(0, resultLen);
}

export const NTT_MODULUS = MOD;
export const NTT_PRIMITIVE_ROOT = G;
