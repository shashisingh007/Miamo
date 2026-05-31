// Montgomery reduction: fast modular arithmetic for an odd modulus N.
// Setup: choose R = 2^k > N, compute Ninv such that N * Ninv ≡ -1 (mod R).
// To convert x into Montgomery form: x_mont = x * R mod N.
// montMul(a_mont, b_mont) = (a_mont * b_mont * R^{-1}) mod N.
// Implementation uses BigInt for portability.

export interface MontgomeryCtx {
  n: bigint;
  k: number;
  r: bigint;
  rMask: bigint;
  ninv: bigint;
  rSquaredModN: bigint;
}

function modInverse(a: bigint, m: bigint): bigint {
  // extended Euclidean for BigInt
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1n) throw new Error('modInverse: not invertible');
  return ((old_s % m) + m) % m;
}

export function montgomerySetup(n: bigint): MontgomeryCtx {
  if (typeof n !== 'bigint') throw new Error('montgomerySetup: n must be bigint');
  if (n <= 1n) throw new Error('montgomerySetup: n must be > 1');
  if ((n & 1n) === 0n) throw new Error('montgomerySetup: n must be odd');
  let k = 0;
  let v = n;
  while (v > 0n) {
    k += 1;
    v >>= 1n;
  }
  const r = 1n << BigInt(k);
  const rMask = r - 1n;
  // We need Ninv such that N * Ninv ≡ -1 (mod R), i.e. Ninv = -N^{-1} mod R.
  const nInvModR = modInverse(n % r, r);
  const ninv = (r - nInvModR) % r;
  const rSquaredModN = (r * r) % n;
  return { n, k, r, rMask, ninv, rSquaredModN };
}

export function montgomeryReduce(t: bigint, ctx: MontgomeryCtx): bigint {
  if (typeof t !== 'bigint') throw new Error('montgomeryReduce: t must be bigint');
  if (t < 0n) throw new Error('montgomeryReduce: t must be non-negative');
  const { n, k, rMask, ninv } = ctx;
  const m = ((t & rMask) * ninv) & rMask;
  let u = (t + m * n) >> BigInt(k);
  if (u >= n) u -= n;
  return u;
}

export function montgomeryMul(aMont: bigint, bMont: bigint, ctx: MontgomeryCtx): bigint {
  return montgomeryReduce(aMont * bMont, ctx);
}

export function montgomeryToForm(x: bigint, ctx: MontgomeryCtx): bigint {
  return montgomeryMul(x % ctx.n, ctx.rSquaredModN, ctx);
}

export function montgomeryFromForm(xMont: bigint, ctx: MontgomeryCtx): bigint {
  return montgomeryReduce(xMont, ctx);
}

export function montgomeryReduction() {
  return {
    montgomerySetup,
    montgomeryReduce,
    montgomeryMul,
    montgomeryToForm,
    montgomeryFromForm,
  };
}
