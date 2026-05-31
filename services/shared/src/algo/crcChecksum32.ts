// CRC-32 (IEEE 802.3, polynomial 0xEDB88320 reflected) checksum over byte arrays
// and UTF-8-encoded strings. Implementation uses a precomputed 256-entry table.

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[i] = c >>> 0;
  }
  return t;
})();

export function crc32Bytes(bytes: ArrayLike<number>): number {
  if (bytes == null || typeof (bytes as any).length !== 'number') {
    throw new Error('crc32Bytes: bytes must be array-like');
  }
  let crc = 0xffffffff;
  for (let i = 0; i < (bytes as any).length; i += 1) {
    const b = (bytes as any)[i] & 0xff;
    crc = (TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function crc32String(s: string): number {
  if (typeof s !== 'string') throw new Error('crc32String: input must be string');
  const bytes = new TextEncoder().encode(s);
  return crc32Bytes(bytes);
}

export function crcChecksum32() {
  return { crc32Bytes, crc32String };
}
