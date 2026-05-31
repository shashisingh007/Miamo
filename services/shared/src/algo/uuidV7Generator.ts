// UUID v7 generator (draft RFC 9562) — time-ordered 128-bit identifiers.
// Format: 48-bit Unix ms timestamp | 4-bit ver(7) | 12-bit rand_a | 2-bit var(10) | 62-bit rand_b
// Strictly monotonic across calls within the same millisecond by incrementing rand_a/rand_b.

export interface UuidV7Options {
  now?: () => number;
  random?: () => number; // 0..1 like Math.random
}

const HEX = '0123456789abcdef';

function toHex(byte: number): string {
  return HEX[(byte >> 4) & 0x0f] + HEX[byte & 0x0f];
}

function bytesToUuidString(b: Uint8Array): string {
  if (b.length !== 16) throw new Error('uuid must be 16 bytes');
  let s = '';
  for (let i = 0; i < 16; i++) {
    s += toHex(b[i]);
    if (i === 3 || i === 5 || i === 7 || i === 9) s += '-';
  }
  return s;
}

export class UuidV7Generator {
  private readonly nowFn: () => number;
  private readonly randFn: () => number;
  private lastMs = -1;
  private lastBytes: Uint8Array = new Uint8Array(16);

  constructor(opts: UuidV7Options = {}) {
    this.nowFn = opts.now ?? Date.now;
    this.randFn = opts.random ?? Math.random;
  }

  next(): string {
    return bytesToUuidString(this.nextBytes());
  }

  nextBytes(): Uint8Array {
    const now = this.nowFn();
    if (!Number.isFinite(now) || now < 0) throw new Error('clock returned invalid timestamp');
    const ms = Math.floor(now);
    if (ms === this.lastMs) {
      const next = bumpBytes(this.lastBytes);
      this.lastBytes = next;
      return next.slice();
    }
    this.lastMs = ms;
    const out = new Uint8Array(16);
    // 48-bit timestamp in bytes 0..5 (big-endian)
    const hi = Math.floor(ms / 2 ** 32);
    const lo = ms >>> 0;
    out[0] = (hi >>> 8) & 0xff;
    out[1] = hi & 0xff;
    out[2] = (lo >>> 24) & 0xff;
    out[3] = (lo >>> 16) & 0xff;
    out[4] = (lo >>> 8) & 0xff;
    out[5] = lo & 0xff;
    // 12-bit rand_a in bytes 6..7 with version=7 in high nibble of byte 6
    const rA = Math.floor(this.randFn() * 0x1000) & 0x0fff;
    out[6] = 0x70 | ((rA >> 8) & 0x0f);
    out[7] = rA & 0xff;
    // 62-bit rand_b in bytes 8..15 with variant=10 in top 2 bits of byte 8
    for (let i = 8; i < 16; i++) out[i] = Math.floor(this.randFn() * 256) & 0xff;
    out[8] = 0x80 | (out[8] & 0x3f);
    this.lastBytes = out;
    return out.slice();
  }
}

function bumpBytes(prev: Uint8Array): Uint8Array {
  const next = prev.slice();
  // Increment 74-bit (rand_a 12 + rand_b 62) embedded in bytes 6..15.
  // We treat bytes 6..15 as a big-endian 80-bit integer for increment purposes,
  // then restore version & variant nibbles.
  for (let i = 15; i >= 6; i--) {
    if (next[i] === 0xff) {
      next[i] = 0;
    } else {
      next[i]++;
      // Restore version bits in byte 6 high nibble.
      next[6] = 0x70 | (next[6] & 0x0f);
      // Restore variant bits in byte 8 top 2 bits.
      next[8] = 0x80 | (next[8] & 0x3f);
      return next;
    }
  }
  // Wrap-around: extremely unlikely.
  next[6] = 0x70;
  next[8] = 0x80;
  return next;
}

export function isUuidV7(s: string): boolean {
  if (typeof s !== 'string') return false;
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return re.test(s);
}

export function extractUuidV7Timestamp(s: string): number {
  if (!isUuidV7(s)) throw new Error('not a UUID v7');
  const hex = s.replace(/-/g, '').slice(0, 12);
  return parseInt(hex, 16);
}
