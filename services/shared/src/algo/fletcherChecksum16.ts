// Fletcher-16 checksum: position-dependent rolling sum, weak but cheap.
// Operates on byte arrays (or UTF-8-encoded strings).

export function fletcher16Bytes(bytes: ArrayLike<number>): number {
  if (bytes == null || typeof (bytes as any).length !== 'number') {
    throw new Error('fletcher16Bytes: bytes must be array-like');
  }
  let sum1 = 0;
  let sum2 = 0;
  const n = (bytes as any).length;
  for (let i = 0; i < n; i += 1) {
    sum1 = (sum1 + ((bytes as any)[i] & 0xff)) % 255;
    sum2 = (sum2 + sum1) % 255;
  }
  return ((sum2 << 8) | sum1) >>> 0;
}

export function fletcher16String(s: string): number {
  if (typeof s !== 'string') throw new Error('fletcher16String: input must be string');
  return fletcher16Bytes(new TextEncoder().encode(s));
}

export function fletcherChecksum16() {
  return { fletcher16Bytes, fletcher16String };
}
