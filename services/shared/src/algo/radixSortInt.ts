// LSD radix sort for non-negative 32-bit integers, base 256.

export function radixSortInt(arr: ReadonlyArray<number>): number[] {
  if (!Array.isArray(arr)) throw new TypeError('arr must be an array');
  for (const v of arr) {
    if (!Number.isInteger(v)) throw new TypeError('values must be integers');
    if (v < 0 || v > 0xffffffff) throw new RangeError('values must be in [0, 2^32 - 1]');
  }
  if (arr.length <= 1) return arr.slice();

  const n = arr.length;
  let src = Uint32Array.from(arr);
  let dst = new Uint32Array(n);
  for (let shift = 0; shift < 32; shift += 8) {
    const counts = new Uint32Array(257);
    for (let i = 0; i < n; i++) {
      const byte = (src[i] >>> shift) & 0xff;
      counts[byte + 1]++;
    }
    for (let i = 1; i < 257; i++) counts[i] += counts[i - 1];
    for (let i = 0; i < n; i++) {
      const byte = (src[i] >>> shift) & 0xff;
      dst[counts[byte]++] = src[i];
    }
    const tmp = src;
    src = dst;
    dst = tmp;
  }
  return Array.from(src);
}
