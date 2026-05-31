// CRC-32 (IEEE 802.3, polynomial 0xEDB88320, reflected) checksum.
// Lazy table init, supports strings (UTF-8 byte encoding) and Uint8Array.

let TABLE: Uint32Array | null = null;

function table(): Uint32Array {
  if (TABLE) return TABLE;
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c >>> 0;
  }
  TABLE = t;
  return t;
}

function toBytes(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (typeof input === 'string') return new TextEncoder().encode(input);
  throw new TypeError('input must be string or Uint8Array');
}

export function crc32(input: string | Uint8Array, seed = 0): number {
  if (!Number.isInteger(seed)) throw new Error('seed must be an integer');
  const t = table();
  const bytes = toBytes(input);
  let c = (~seed) >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    c = (c >>> 8) ^ t[(c ^ bytes[i]) & 0xff];
  }
  return (~c) >>> 0;
}

export function crc32Hex(input: string | Uint8Array, seed = 0): string {
  return crc32(input, seed).toString(16).padStart(8, '0');
}

// Streaming API
export class Crc32Stream {
  private c: number;
  constructor(seed = 0) {
    if (!Number.isInteger(seed)) throw new Error('seed must be an integer');
    this.c = (~seed) >>> 0;
  }
  update(input: string | Uint8Array): this {
    const t = table();
    const bytes = toBytes(input);
    let c = this.c;
    for (let i = 0; i < bytes.length; i++) {
      c = (c >>> 8) ^ t[(c ^ bytes[i]) & 0xff];
    }
    this.c = c;
    return this;
  }
  digest(): number {
    return (~this.c) >>> 0;
  }
  digestHex(): string {
    return this.digest().toString(16).padStart(8, '0');
  }
}
