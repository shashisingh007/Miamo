import { describe, it, expect } from 'vitest';
import { generateTotp, verifyTotp } from '../mfaTotp';

// RFC 6238 test secret (ASCII "12345678901234567890" -> base32):
//   GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('mfaTotp', () => {
  it('generateTotp produces a 6-digit code', () => {
    const c = generateTotp(SECRET, 59_000);
    expect(c).toMatch(/^\d{6}$/);
  });

  it('verifyTotp accepts a fresh code (step 0)', () => {
    const now = 1_700_000_000_000;
    const code = generateTotp(SECRET, now)!;
    expect(verifyTotp({ secret: SECRET, token: code, nowMs: now })).toEqual({ ok: true, step: 0 });
  });

  it('accepts a code from the previous step (clock skew \u22121)', () => {
    const now = 1_700_000_000_000;
    const prev = generateTotp(SECRET, now - 30_000)!;
    expect(verifyTotp({ secret: SECRET, token: prev, nowMs: now })).toEqual({ ok: true, step: -1 });
  });

  it('accepts a code from the next step (clock skew +1)', () => {
    const now = 1_700_000_000_000;
    const nxt = generateTotp(SECRET, now + 30_000)!;
    expect(verifyTotp({ secret: SECRET, token: nxt, nowMs: now })).toEqual({ ok: true, step: 1 });
  });

  it('rejects a code from \u22122 steps with default skew', () => {
    const now = 1_700_000_000_000;
    const stale = generateTotp(SECRET, now - 60_000)!;
    expect(verifyTotp({ secret: SECRET, token: stale, nowMs: now })).toEqual({ ok: false, reason: 'no_match' });
  });

  it('skewSteps: 0 enforces exact step', () => {
    const now = 1_700_000_000_000;
    const prev = generateTotp(SECRET, now - 30_000)!;
    expect(verifyTotp({ secret: SECRET, token: prev, nowMs: now, skewSteps: 0 }).ok).toBe(false);
  });

  it('rejects malformed token', () => {
    expect(verifyTotp({ secret: SECRET, token: '12345', nowMs: 0 })).toEqual({ ok: false, reason: 'invalid_token' });
    expect(verifyTotp({ secret: SECRET, token: 'abcdef', nowMs: 0 })).toEqual({ ok: false, reason: 'invalid_token' });
    expect(verifyTotp({ secret: SECRET, token: '1234567', nowMs: 0 })).toEqual({ ok: false, reason: 'invalid_token' });
  });

  it('rejects invalid base32 secret', () => {
    expect(verifyTotp({ secret: '!!!', token: '000000', nowMs: 0 })).toEqual({ ok: false, reason: 'invalid_secret' });
    expect(verifyTotp({ secret: '', token: '000000', nowMs: 0 })).toEqual({ ok: false, reason: 'invalid_secret' });
    expect(generateTotp('not-base32!!', 0)).toBe(null);
  });

  it('matches RFC 6238 vector at T=59s -> 287082', () => {
    expect(generateTotp(SECRET, 59_000)).toBe('287082');
  });

  it('matches RFC 6238 vector at T=1111111109s -> 081804', () => {
    expect(generateTotp(SECRET, 1_111_111_109_000)).toBe('081804');
  });

  it('respects custom digits', () => {
    const code = generateTotp(SECRET, 59_000, 30, 8);
    expect(code).toMatch(/^\d{8}$/);
    expect(verifyTotp({ secret: SECRET, token: code!, nowMs: 59_000, digits: 8 }).ok).toBe(true);
  });
});
