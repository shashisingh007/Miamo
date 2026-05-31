// Hex (base-16) codec for bytes/strings.

export function hexEncode(bytes: Uint8Array | string, upperCase = false): string {
  const buf = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  if (!(buf instanceof Uint8Array)) throw new TypeError('input must be Uint8Array or string');
  const digits = upperCase ? '0123456789ABCDEF' : '0123456789abcdef';
  let out = '';
  for (let i = 0; i < buf.length; i++) {
    out += digits[buf[i] >>> 4] + digits[buf[i] & 0x0f];
  }
  return out;
}

export function hexDecode(hex: string): Uint8Array {
  if (typeof hex !== 'string') throw new TypeError('input must be a string');
  if (hex.length % 2 !== 0) throw new Error('hex string must have even length');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const hi = hexNibble(hex.charCodeAt(i * 2));
    const lo = hexNibble(hex.charCodeAt(i * 2 + 1));
    if (hi < 0 || lo < 0) throw new Error('invalid hex character');
    out[i] = (hi << 4) | lo;
  }
  return out;
}

function hexNibble(c: number): number {
  if (c >= 48 && c <= 57) return c - 48;
  if (c >= 65 && c <= 70) return c - 55;
  if (c >= 97 && c <= 102) return c - 87;
  return -1;
}
