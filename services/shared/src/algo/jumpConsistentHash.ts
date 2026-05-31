// Google's Jump Consistent Hash (Lamping & Veach, 2014).
// Maps a 64-bit key + bucket count to a bucket index in [0, numBuckets).
// O(log n) time, no memory, minimal disruption on bucket count change.

// Use BigInt for the 64-bit LCG because JS Number cannot hold 2^63.
const A = 2862933555777941757n;
const C = 1n;
const POW32 = 0x100000000n;
const POW31 = 0x80000000n;
const MASK64 = (1n << 64n) - 1n;

export function jumpConsistentHash(key: bigint | number, numBuckets: number): number {
  if (!Number.isInteger(numBuckets) || numBuckets <= 0) {
    throw new RangeError('numBuckets must be a positive integer');
  }
  let k: bigint;
  if (typeof key === 'number') {
    if (!Number.isFinite(key) || !Number.isInteger(key) || key < 0) {
      throw new TypeError('key must be a non-negative integer or bigint');
    }
    k = BigInt(key);
  } else {
    if (key < 0n) throw new RangeError('key must be non-negative');
    k = key & MASK64;
  }
  let b = -1n;
  let j = 0n;
  const n = BigInt(numBuckets);
  while (j < n) {
    b = j;
    k = (k * A + C) & MASK64;
    // double = (b + 1) * (2^31 / ((k >>> 33) + 1))
    const top = (k >> 33n) + 1n;
    j = ((b + 1n) * POW31) / top;
  }
  return Number(b);
}
