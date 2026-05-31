// RFC 4648 base32 codec — additive infra. New symbols only.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DECODE: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) DECODE[ALPHABET[i]] = i;

export interface Base32EncodeOptions {
  padding?: boolean; // default true
}

export function encodeBase32(input: Uint8Array | ArrayBuffer, opts: Base32EncodeOptions = {}): string {
  const padding = opts.padding ?? true;
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < bytes.length; i++) {
    buffer = (buffer << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      const idx = (buffer >>> bits) & 0x1f;
      out += ALPHABET[idx];
    }
  }
  if (bits > 0) {
    const idx = (buffer << (5 - bits)) & 0x1f;
    out += ALPHABET[idx];
  }
  if (padding) {
    while (out.length % 8 !== 0) out += '=';
  }
  return out;
}

export function decodeBase32(input: string): Uint8Array {
  if (typeof input !== 'string') throw new Error('input must be a string');
  // strip whitespace, uppercase
  const s = input.replace(/\s+/g, '').toUpperCase();
  if (s === '') return new Uint8Array(0);
  // strip padding
  const stripped = s.replace(/=+$/g, '');
  // validate chars
  for (let i = 0; i < stripped.length; i++) {
    if (!(stripped[i] in DECODE)) throw new Error('invalid base32 character at index ' + i);
  }
  // validate padding count if present
  if (s.includes('=')) {
    if (s.length % 8 !== 0) throw new Error('invalid base32 padding length');
    const padCount = s.length - stripped.length;
    if (![0, 1, 3, 4, 6].includes(padCount)) throw new Error('invalid base32 padding count');
  }
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < stripped.length; i++) {
    buffer = (buffer << 5) | DECODE[stripped[i]];
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >>> bits) & 0xff);
    }
  }
  // Validate that leftover bits are zero (well-formed input)
  if (bits > 0 && ((buffer << (8 - bits)) & 0xff) !== 0) {
    // non-canonical trailing bits — tolerate but ignore
  }
  return new Uint8Array(out);
}

export function isValidBase32(input: string): boolean {
  try {
    decodeBase32(input);
    return true;
  } catch {
    return false;
  }
}
