// Adler-32 checksum (RFC 1950) — sums two rolling mod-65521 accumulators.

const MOD_ADLER = 65521;

export function adler32Checksum(input: string | Uint8Array): number {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError('input must be a string or Uint8Array');
  }
  let a = 1;
  let b = 0;
  // Process in chunks to avoid overflow within signed 32-bit range.
  const CHUNK = 5552;
  let i = 0;
  while (i < bytes.length) {
    const end = Math.min(i + CHUNK, bytes.length);
    for (; i < end; i++) {
      a += bytes[i];
      b += a;
    }
    a %= MOD_ADLER;
    b %= MOD_ADLER;
  }
  return ((b << 16) | a) >>> 0;
}
