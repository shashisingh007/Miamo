// Barrett reduction: fast modular reduction by a fixed modulus m, using a
// precomputed approximation of 1/m. We use BigInt for portability and choose
// k = bit length of m + a small slack so the standard Barrett correction
// requires at most one final subtraction.

export interface BarrettCtx {
  m: bigint;
  k: number;
  mu: bigint;
}

export function barrettSetup(modulus: bigint): BarrettCtx {
  if (typeof modulus !== 'bigint') throw new Error('barrettSetup: modulus must be bigint');
  if (modulus <= 0n) throw new Error('barrettSetup: modulus must be positive');
  let k = 0;
  let v = modulus;
  while (v > 0n) {
    k += 1;
    v >>= 1n;
  }
  const mu = (1n << BigInt(2 * k)) / modulus;
  return { m: modulus, k, mu };
}

export function barrettReduce(x: bigint, ctx: BarrettCtx): bigint {
  if (typeof x !== 'bigint') throw new Error('barrettReduce: x must be bigint');
  if (x < 0n) throw new Error('barrettReduce: x must be non-negative');
  const { m, k, mu } = ctx;
  const q = (x * mu) >> BigInt(2 * k);
  let r = x - q * m;
  while (r >= m) r -= m;
  return r;
}

export function barrettReduction() {
  return { barrettSetup, barrettReduce };
}
