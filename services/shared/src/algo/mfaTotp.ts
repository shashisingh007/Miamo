/**
 * mfaTotp \u2014 Phase 20 OWASP A07 RFC-6238 TOTP verifier (pure-ish).
 *
 * Uses node:crypto HMAC-SHA1 only \u2014 no clock reads, no DB. Caller passes
 * `nowMs` so the entire decision is deterministic & testable.
 *
 *   - period: 30s
 *   - digits: 6
 *   - skew window: \u00b11 step by default (\u00b130s)
 *   - secret is a base32 RFC-4648 string (alphabet A-Z2-7)
 */
import { createHmac } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(input: string): Buffer | null {
  if (typeof input !== 'string') return null;
  const clean = input.replace(/=+$/g, '').toUpperCase().replace(/\s/g, '');
  if (clean.length === 0) return null;
  const bits: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) return null;
    for (let i = 4; i >= 0; i--) bits.push((idx >> i) & 1);
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    bytes.push(b);
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number, digits: number): string {
  const buf = Buffer.alloc(8);
  // Counter is a 64-bit big-endian integer; JS safe-int limit easily covers
  // ~292 billion years at 30s steps, so high 32 bits stay zero.
  buf.writeUInt32BE(0, 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, '0');
}

export type TotpInputs = {
  secret: string;          // base32
  token: string;           // 6-digit string the user typed
  nowMs: number;
  periodSeconds?: number;  // default 30
  digits?: number;         // default 6
  skewSteps?: number;      // default 1
};

export type TotpResult =
  | { ok: true; step: number }   // step offset (\u22121, 0, +1)
  | { ok: false; reason: 'invalid_secret' | 'invalid_token' | 'no_match' };

export function generateTotp(secret: string, nowMs: number, periodSeconds = 30, digits = 6): string | null {
  const key = base32Decode(secret);
  if (!key) return null;
  const counter = Math.floor(Math.max(0, nowMs) / 1000 / periodSeconds);
  return hotp(key, counter, digits);
}

export function verifyTotp(inp: TotpInputs): TotpResult {
  const period = inp.periodSeconds ?? 30;
  const digits = inp.digits ?? 6;
  const skew = Math.max(0, inp.skewSteps ?? 1);
  const key = base32Decode(inp.secret);
  if (!key) return { ok: false, reason: 'invalid_secret' };
  if (typeof inp.token !== 'string' || !new RegExp(`^\\d{${digits}}$`).test(inp.token)) {
    return { ok: false, reason: 'invalid_token' };
  }
  const baseCounter = Math.floor(Math.max(0, inp.nowMs) / 1000 / period);
  for (let s = -skew; s <= skew; s++) {
    const code = hotp(key, baseCounter + s, digits);
    if (constantTimeEq(code, inp.token)) return { ok: true, step: s };
  }
  return { ok: false, reason: 'no_match' };
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
