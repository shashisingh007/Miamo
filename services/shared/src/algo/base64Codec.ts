// Base64 / Base64URL encoder & decoder (RFC 4648).
// Pure JS; operates on Uint8Array.

const STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const URL_SAFE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function buildLookup(alphabet: string): Int16Array {
  const t = new Int16Array(128);
  t.fill(-1);
  for (let i = 0; i < alphabet.length; i++) t[alphabet.charCodeAt(i)] = i;
  return t;
}

const STD_LOOKUP = buildLookup(STD);
const URL_LOOKUP = buildLookup(URL_SAFE);

export interface Base64EncodeOptions {
  urlSafe?: boolean;
  padding?: boolean; // default true for std, default false for urlSafe
}

export function base64Encode(bytes: Uint8Array, opts: Base64EncodeOptions = {}): string {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('bytes must be a Uint8Array');
  const urlSafe = opts.urlSafe ?? false;
  const padding = opts.padding ?? !urlSafe;
  const alpha = urlSafe ? URL_SAFE : STD;
  let out = '';
  let i = 0;
  for (; i + 3 <= bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const b3 = bytes[i + 2];
    out += alpha[b1 >> 2];
    out += alpha[((b1 & 0x03) << 4) | (b2 >> 4)];
    out += alpha[((b2 & 0x0f) << 2) | (b3 >> 6)];
    out += alpha[b3 & 0x3f];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const b1 = bytes[i];
    out += alpha[b1 >> 2];
    out += alpha[(b1 & 0x03) << 4];
    if (padding) out += '==';
  } else if (rem === 2) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    out += alpha[b1 >> 2];
    out += alpha[((b1 & 0x03) << 4) | (b2 >> 4)];
    out += alpha[(b2 & 0x0f) << 2];
    if (padding) out += '=';
  }
  return out;
}

export function base64Decode(input: string, opts: { urlSafe?: boolean } = {}): Uint8Array {
  if (typeof input !== 'string') throw new TypeError('input must be a string');
  const urlSafe = opts.urlSafe ?? false;
  const lookup = urlSafe ? URL_LOOKUP : STD_LOOKUP;
  // Strip padding
  let len = input.length;
  while (len > 0 && input.charCodeAt(len - 1) === 61) len--; // '='
  // Validate
  for (let i = 0; i < len; i++) {
    const code = input.charCodeAt(i);
    if (code >= 128 || lookup[code] === -1) {
      throw new Error(`invalid base64 character at index ${i}`);
    }
  }
  const out: number[] = [];
  let i = 0;
  for (; i + 4 <= len; i += 4) {
    const c1 = lookup[input.charCodeAt(i)];
    const c2 = lookup[input.charCodeAt(i + 1)];
    const c3 = lookup[input.charCodeAt(i + 2)];
    const c4 = lookup[input.charCodeAt(i + 3)];
    out.push((c1 << 2) | (c2 >> 4));
    out.push(((c2 & 0x0f) << 4) | (c3 >> 2));
    out.push(((c3 & 0x03) << 6) | c4);
  }
  const rem = len - i;
  if (rem === 1) throw new Error('invalid base64 length');
  if (rem === 2) {
    const c1 = lookup[input.charCodeAt(i)];
    const c2 = lookup[input.charCodeAt(i + 1)];
    out.push((c1 << 2) | (c2 >> 4));
  } else if (rem === 3) {
    const c1 = lookup[input.charCodeAt(i)];
    const c2 = lookup[input.charCodeAt(i + 1)];
    const c3 = lookup[input.charCodeAt(i + 2)];
    out.push((c1 << 2) | (c2 >> 4));
    out.push(((c2 & 0x0f) << 4) | (c3 >> 2));
  }
  return Uint8Array.from(out);
}

export function base64UrlEncode(bytes: Uint8Array): string {
  return base64Encode(bytes, { urlSafe: true, padding: false });
}

export function base64UrlDecode(input: string): Uint8Array {
  return base64Decode(input, { urlSafe: true });
}
