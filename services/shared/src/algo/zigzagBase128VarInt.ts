// VarInt encoding (Protocol Buffers / LEB128 style) and ZigZag mapping for signed ints.

export function encodeVarUint(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('value must be a non-negative integer');
  }
  if (value > Number.MAX_SAFE_INTEGER) {
    throw new Error('value exceeds Number.MAX_SAFE_INTEGER');
  }
  const out: number[] = [];
  let v = value;
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v = Math.floor(v / 128);
  }
  out.push(v & 0x7f);
  return Uint8Array.from(out);
}

export interface VarUintDecoded {
  value: number;
  bytesRead: number;
}

export function decodeVarUint(bytes: Uint8Array, offset = 0): VarUintDecoded {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('bytes must be Uint8Array');
  if (!Number.isInteger(offset) || offset < 0 || offset >= bytes.length) {
    throw new RangeError('offset out of bounds');
  }
  let value = 0;
  let multiplier = 1;
  let i = offset;
  // Cap at 10 bytes (uint64 ceiling); we'll enforce MAX_SAFE_INTEGER overflow check.
  let bytesRead = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    const part = b & 0x7f;
    if (multiplier > 1 && part === 0 && (b & 0x80) === 0) {
      // valid (could legitimately be 0 in a multi-byte sequence)
    }
    const next = value + part * multiplier;
    if (next > Number.MAX_SAFE_INTEGER) {
      throw new Error('varint overflows Number.MAX_SAFE_INTEGER');
    }
    value = next;
    bytesRead++;
    i++;
    if ((b & 0x80) === 0) {
      return { value, bytesRead };
    }
    multiplier *= 128;
    if (bytesRead > 10) throw new Error('varint too long');
  }
  throw new Error('truncated varint');
}

export function zigZagEncode(value: number): number {
  if (!Number.isInteger(value)) throw new Error('value must be an integer');
  if (value >= 0) {
    return value * 2;
  }
  // -1 -> 1, -2 -> 3, ...
  return value * -2 - 1;
}

export function zigZagDecode(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('value must be a non-negative integer');
  }
  if (value % 2 === 0) return value / 2;
  return -((value + 1) / 2);
}

export function encodeVarInt(value: number): Uint8Array {
  return encodeVarUint(zigZagEncode(value));
}

export function decodeVarInt(bytes: Uint8Array, offset = 0): { value: number; bytesRead: number } {
  const { value, bytesRead } = decodeVarUint(bytes, offset);
  return { value: zigZagDecode(value), bytesRead };
}
