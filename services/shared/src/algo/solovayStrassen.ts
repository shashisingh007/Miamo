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

function jacobi(a: bigint, n: bigint): bigint {
  if (n <= 0n || (n & 1n) === 0n) throw new Error('solovayStrassen: jacobi requires odd positive n');
  let aa = a % n;
  if (aa < 0n) aa += n;
  let nn = n;
  let result = 1n;
  while (aa !== 0n) {
    while ((aa & 1n) === 0n) {
      aa >>= 1n;
      const r = nn % 8n;
      if (r === 3n || r === 5n) result = -result;
    }
    [aa, nn] = [nn, aa];
    if ((aa & 3n) === 3n && (nn & 3n) === 3n) result = -result;
    aa = aa % nn;
  }
  return nn === 1n ? result : 0n;
}

function randomBigInt(min: bigint, max: bigint, rng: () => number): bigint {
  const range = max - min + 1n;
  // use 32 bits per draw, combine deterministically
  const bits = range.toString(2).length;
  while (true) {
    let r = 0n;
    let drawn = 0;
    while (drawn < bits) {
      const chunk = BigInt(Math.floor(rng() * 0x100000000));
      r = (r << 32n) | chunk;
      drawn += 32;
    }
    r = r & ((1n << BigInt(bits)) - 1n);
    if (r < range) return min + r;
  }
}

export interface SolovayStrassenOptions {
  rounds?: number;
  rng?: () => number;
}

export function solovayStrassen(n: number | bigint, options: SolovayStrassenOptions = {}): boolean {
  const N = typeof n === 'bigint' ? n : BigInt(n);
  if (N < 2n) return false;
  if (N === 2n || N === 3n) return true;
  if ((N & 1n) === 0n) return false;
  const rounds = options.rounds ?? 20;
  if (!Number.isInteger(rounds) || rounds <= 0)
    throw new Error('solovayStrassen: rounds must be positive integer');
  const rng = options.rng ?? Math.random;
  const exp = (N - 1n) >> 1n;
  for (let i = 0; i < rounds; i++) {
    const a = randomBigInt(2n, N - 2n, rng);
    const j = jacobi(a, N);
    if (j === 0n) return false;
    const jMod = j === -1n ? N - 1n : j;
    const m = modPow(a, exp, N);
    if (m !== jMod) return false;
  }
  return true;
}
