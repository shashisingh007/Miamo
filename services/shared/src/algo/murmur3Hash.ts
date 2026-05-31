// MurmurHash3 (32-bit) — Austin Appleby's algorithm. Pure TS port.

export function murmur3Hash32(input: string | Uint8Array, seed = 0): number {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  if (!(bytes instanceof Uint8Array)) throw new TypeError('input must be string or Uint8Array');
  if (!Number.isFinite(seed)) throw new TypeError('seed must be finite');
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  let h = seed >>> 0;
  const n = bytes.length;
  const nBlocks = n >>> 2;

  for (let i = 0; i < nBlocks; i++) {
    const j = i * 4;
    let k =
      (bytes[j] |
        (bytes[j + 1] << 8) |
        (bytes[j + 2] << 16) |
        (bytes[j + 3] << 24)) >>>
      0;
    k = Math.imul(k, c1) >>> 0;
    k = ((k << 15) | (k >>> 17)) >>> 0;
    k = Math.imul(k, c2) >>> 0;
    h = (h ^ k) >>> 0;
    h = ((h << 13) | (h >>> 19)) >>> 0;
    h = (Math.imul(h, 5) + 0xe6546b64) >>> 0;
  }

  // tail
  let k1 = 0;
  const tailStart = nBlocks * 4;
  const tail = n & 3;
  if (tail === 3) k1 ^= bytes[tailStart + 2] << 16;
  if (tail >= 2) k1 ^= bytes[tailStart + 1] << 8;
  if (tail >= 1) {
    k1 ^= bytes[tailStart];
    k1 = Math.imul(k1, c1) >>> 0;
    k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0;
    k1 = Math.imul(k1, c2) >>> 0;
    h = (h ^ k1) >>> 0;
  }

  // finalize
  h = (h ^ n) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}
