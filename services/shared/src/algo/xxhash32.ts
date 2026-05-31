// xxHash32 — Yann Collet's algorithm. Pure TS port.

const PRIME32_1 = 0x9e3779b1;
const PRIME32_2 = 0x85ebca77;
const PRIME32_3 = 0xc2b2ae3d;
const PRIME32_4 = 0x27d4eb2f;
const PRIME32_5 = 0x165667b1;

function rotl(x: number, r: number): number {
  return ((x << r) | (x >>> (32 - r))) >>> 0;
}

export function xxhash32(input: string | Uint8Array, seed = 0): number {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  if (!(bytes instanceof Uint8Array)) throw new TypeError('input must be string or Uint8Array');
  if (!Number.isFinite(seed)) throw new TypeError('seed must be finite');
  const n = bytes.length;
  let i = 0;
  let h32: number;

  if (n >= 16) {
    let v1 = ((seed + PRIME32_1) >>> 0) + PRIME32_2;
    v1 >>>= 0;
    let v2 = (seed + PRIME32_2) >>> 0;
    let v3 = seed >>> 0;
    let v4 = (seed - PRIME32_1) >>> 0;
    do {
      v1 = round(v1, read32(bytes, i)); i += 4;
      v2 = round(v2, read32(bytes, i)); i += 4;
      v3 = round(v3, read32(bytes, i)); i += 4;
      v4 = round(v4, read32(bytes, i)); i += 4;
    } while (i <= n - 16);
    h32 = (rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18)) >>> 0;
  } else {
    h32 = (seed + PRIME32_5) >>> 0;
  }

  h32 = (h32 + n) >>> 0;

  while (i <= n - 4) {
    h32 = (h32 + Math.imul(read32(bytes, i), PRIME32_3)) >>> 0;
    h32 = (Math.imul(rotl(h32, 17), PRIME32_4)) >>> 0;
    i += 4;
  }
  while (i < n) {
    h32 = (h32 + Math.imul(bytes[i], PRIME32_5)) >>> 0;
    h32 = (Math.imul(rotl(h32, 11), PRIME32_1)) >>> 0;
    i++;
  }

  h32 ^= h32 >>> 15;
  h32 = Math.imul(h32, PRIME32_2) >>> 0;
  h32 ^= h32 >>> 13;
  h32 = Math.imul(h32, PRIME32_3) >>> 0;
  h32 ^= h32 >>> 16;
  return h32 >>> 0;
}

function round(acc: number, input: number): number {
  acc = (acc + Math.imul(input, PRIME32_2)) >>> 0;
  acc = rotl(acc, 13);
  acc = Math.imul(acc, PRIME32_1) >>> 0;
  return acc;
}

function read32(b: Uint8Array, i: number): number {
  return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
}
