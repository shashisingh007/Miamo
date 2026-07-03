/**
 * Tiny ulid generator — 26-char Crockford base32, monotonic within ms.
 * Inlined to avoid a runtime dep just for ids in the SDK bundle.
 */

const ENC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function getRandomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(out);
  } else {
    for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

function encodeTime(ms: number, len: number): string {
  let out = '';
  for (let i = len - 1; i >= 0; i--) {
    const mod = ms % 32;
    out = ENC[mod] + out;
    ms = (ms - mod) / 32;
  }
  return out;
}

function encodeRandom(len: number): string {
  const bytes = getRandomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ENC[bytes[i] % 32];
  return out;
}

export function ulid(now: number = Date.now()): string {
  return encodeTime(now, 10) + encodeRandom(16);
}
