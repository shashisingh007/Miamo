const PRIME0 = 0xa0761d6478bd642fn;
const PRIME1 = 0xe7037ed1a0b428dbn;
const PRIME2 = 0x8ebc6af09c88c6e3n;
const PRIME3 = 0x589965cc75374cc3n;
const MASK64 = (1n << 64n) - 1n;

function mum(a: bigint, b: bigint): bigint {
  const prod = (a * b) & ((1n << 128n) - 1n);
  return (prod ^ (prod >> 64n)) & MASK64;
}

function read64(view: DataView, offset: number): bigint {
  const lo = BigInt(view.getUint32(offset, true));
  const hi = BigInt(view.getUint32(offset + 4, true));
  return ((hi << 32n) | lo) & MASK64;
}

function read32(view: DataView, offset: number): bigint {
  return BigInt(view.getUint32(offset, true));
}

function readSmall(bytes: Uint8Array, len: number): bigint {
  if (len >= 4) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const a = read32(view, 0);
    const b = read32(view, len - 4);
    return (a << 32n) | b;
  }
  if (len === 0) return 0n;
  const a = BigInt(bytes[0]);
  const b = BigInt(bytes[len >> 1]);
  const c = BigInt(bytes[len - 1]);
  return (a << 16n) | (b << 8n) | c;
}

export function wyhash64(input: Uint8Array | string, seed: bigint = 0n): bigint {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const len = bytes.length;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let h = (seed ^ PRIME0) & MASK64;
  let i = 0;
  if (len <= 16) {
    if (len >= 4) {
      const a = (read32(view, 0) << 32n) | read32(view, len >> 3);
      const b = (read32(view, len - 4) << 32n) | read32(view, len - 4 - (len >> 3));
      h = mum(a ^ PRIME1, b ^ h);
    } else if (len > 0) {
      h = mum(readSmall(bytes, len) ^ PRIME1, h);
    }
  } else {
    let remaining = len;
    while (remaining > 48) {
      h = mum(read64(view, i) ^ PRIME1, read64(view, i + 8) ^ h);
      h ^= mum(read64(view, i + 16) ^ PRIME2, read64(view, i + 24) ^ h);
      h ^= mum(read64(view, i + 32) ^ PRIME3, read64(view, i + 40) ^ h);
      i += 48;
      remaining -= 48;
    }
    while (remaining > 16) {
      h = mum(read64(view, i) ^ PRIME1, read64(view, i + 8) ^ h);
      i += 16;
      remaining -= 16;
    }
    if (remaining > 0) {
      const tail = bytes.subarray(len - 16);
      const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
      h = mum(read64(tailView, 0) ^ PRIME1, read64(tailView, 8) ^ h);
    }
  }
  return mum(h ^ BigInt(len), PRIME0) & MASK64;
}

export function wyhash64Hex(input: Uint8Array | string, seed: bigint = 0n): string {
  return wyhash64(input, seed).toString(16).padStart(16, '0');
}
