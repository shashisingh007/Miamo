// Lemire's fast bounded random uniform integer generation.
// See: "Fast Random Integer Generation in an Interval", Lemire 2018.
// Given a 64-bit RNG, generates an unbiased integer in [0, bound).

const MASK64 = (1n << 64n) - 1n;

export function lemireFastBoundedRandom(bound: number, next64: () => bigint): number {
  if (!Number.isInteger(bound)) throw new Error('lemireFastBoundedRandom: bound must be integer');
  if (bound <= 0) throw new Error('lemireFastBoundedRandom: bound must be > 0');
  const s = BigInt(bound);
  let x = next64() & MASK64;
  let m = x * s;
  let l = m & MASK64;
  if (l < s) {
    const t = ((-s) & MASK64) % s; // threshold
    while (l < t) {
      x = next64() & MASK64;
      m = x * s;
      l = m & MASK64;
    }
  }
  return Number(m >> 64n);
}

// Convenience helper: produce an array of n bounded samples.
export function lemireSampleArray(n: number, bound: number, next64: () => bigint): number[] {
  if (!Number.isInteger(n) || n < 0) throw new Error('lemireSampleArray: n must be non-negative integer');
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i += 1) out[i] = lemireFastBoundedRandom(bound, next64);
  return out;
}
