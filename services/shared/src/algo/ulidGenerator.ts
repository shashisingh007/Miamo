/**
 * ULID generator (Crockford base32, 26 chars).
 *
 *   01ARZ3NDEKTSV4RRFFQ69G5FAV
 *   |---ts (48 bit, ms)----| |---rand (80 bit)---|
 *
 * Monotonic mode: within the same millisecond, the random tail is
 * incremented so generated IDs strictly sort lexicographically.
 */

import { randomBytes } from 'node:crypto';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford
const TIME_LEN = 10;
const RAND_LEN = 16;
const TIME_MAX = 281_474_976_710_655; // 2^48 - 1

function encodeTime(ms: number): string {
  let n = ms;
  const out = new Array<string>(TIME_LEN);
  for (let i = TIME_LEN - 1; i >= 0; i--) {
    const rem = n % 32;
    out[i] = ALPHABET[rem];
    n = (n - rem) / 32;
  }
  return out.join('');
}

function encodeRandom(bytes: Buffer): string {
  // 16 chars × 5 bits = 80 bits; bytes has 10 bytes
  let bits = 0;
  let bitCount = 0;
  let i = 0;
  const out: string[] = [];
  while (out.length < RAND_LEN) {
    while (bitCount < 5) {
      bits = (bits << 8) | bytes[i++];
      bitCount += 8;
    }
    bitCount -= 5;
    const idx = (bits >> bitCount) & 0x1f;
    out.push(ALPHABET[idx]);
  }
  return out.join('');
}

export interface UlidState {
  lastMs: number;
  /** last 10-byte random tail (so we can increment on collisions) */
  lastRand: Buffer;
}

export function createUlidState(): UlidState {
  return { lastMs: -1, lastRand: Buffer.alloc(10) };
}

function bumpRandom(buf: Buffer): Buffer | null {
  const out = Buffer.from(buf);
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i] === 0xff) {
      out[i] = 0;
      continue;
    }
    out[i] += 1;
    return out;
  }
  return null; // overflow
}

export interface UlidOptions {
  nowMs?: number;
  /** rng returning a 10-byte Buffer; defaults to crypto.randomBytes(10) */
  randomBytesFn?: () => Buffer;
  state?: UlidState;
}

export function generateUlid(opts: UlidOptions = {}): string {
  const now = opts.nowMs ?? Date.now();
  if (!Number.isFinite(now) || now < 0 || now > TIME_MAX) {
    throw new RangeError(`timestamp out of range: ${now}`);
  }
  const ms = Math.floor(now);
  const state = opts.state;
  let randBuf: Buffer;
  if (state && state.lastMs === ms) {
    const bumped = bumpRandom(state.lastRand);
    if (!bumped) {
      throw new RangeError('ULID random tail overflow within one millisecond');
    }
    randBuf = bumped;
  } else {
    const rng = opts.randomBytesFn ?? (() => randomBytes(10));
    randBuf = Buffer.from(rng());
    if (randBuf.length !== 10) {
      throw new RangeError('randomBytesFn must return 10 bytes');
    }
  }
  if (state) {
    state.lastMs = ms;
    state.lastRand = randBuf;
  }
  return encodeTime(ms) + encodeRandom(randBuf);
}

const TIME_RE = new RegExp(`^[${ALPHABET}]{${TIME_LEN}}[${ALPHABET}]{${RAND_LEN}}$`);

export function isUlid(s: string): boolean {
  return typeof s === 'string' && s.length === TIME_LEN + RAND_LEN && TIME_RE.test(s);
}

export function decodeUlidTimestamp(s: string): number | null {
  if (!isUlid(s)) return null;
  let ms = 0;
  for (let i = 0; i < TIME_LEN; i++) {
    const idx = ALPHABET.indexOf(s[i]);
    if (idx < 0) return null;
    ms = ms * 32 + idx;
  }
  return ms;
}
