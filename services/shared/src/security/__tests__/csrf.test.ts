import { describe, it, expect } from 'vitest';
import { issueCsrfToken, verifyCsrfToken } from '../csrf';

const SECRET = 'a-very-long-secret-of-at-least-16-chars';
const SID = 'sess-abc-123';

describe('issueCsrfToken / verifyCsrfToken', () => {
  it('issues then verifies a fresh token successfully', () => {
    const now = 1_000_000;
    const t = issueCsrfToken(SECRET, SID, { nowSec: now });
    const r = verifyCsrfToken(SECRET, SID, t, { nowSec: now + 10 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.sessionId).toBe(SID);
  });

  it('rejects after expiry', () => {
    const now = 1_000_000;
    const t = issueCsrfToken(SECRET, SID, { nowSec: now, ttlSec: 60 });
    const r = verifyCsrfToken(SECRET, SID, t, { nowSec: now + 120 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('expired');
  });

  it('rejects when sessionId does not match', () => {
    const t = issueCsrfToken(SECRET, SID, { nowSec: 1000 });
    const r = verifyCsrfToken(SECRET, 'other-session', t, { nowSec: 1000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('session_mismatch');
  });

  it('rejects when signature is tampered', () => {
    const t = issueCsrfToken(SECRET, SID, { nowSec: 1000 });
    const tampered = t.slice(0, -2) + 'AA';
    const r = verifyCsrfToken(SECRET, SID, tampered, { nowSec: 1000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('bad_signature');
  });

  it('rejects when secret differs', () => {
    const t = issueCsrfToken(SECRET, SID, { nowSec: 1000 });
    const r = verifyCsrfToken('different-but-long-enough-secret', SID, t, { nowSec: 1000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('bad_signature');
  });

  it('rejects malformed tokens', () => {
    expect(verifyCsrfToken(SECRET, SID, '').ok).toBe(false);
    expect(verifyCsrfToken(SECRET, SID, 'not-a-token').ok).toBe(false);
    expect(verifyCsrfToken(SECRET, SID, 'a.b.c').ok).toBe(false);
  });

  it('throws on weak secret', () => {
    expect(() => issueCsrfToken('short', SID)).toThrow();
    expect(() => verifyCsrfToken('short', SID, 'x.y')).toThrow();
  });

  it('throws on empty sessionId', () => {
    expect(() => issueCsrfToken(SECRET, '')).toThrow();
  });

  it('two issued tokens differ (nonce randomness)', () => {
    const a = issueCsrfToken(SECRET, SID, { nowSec: 1000 });
    const b = issueCsrfToken(SECRET, SID, { nowSec: 1000 });
    expect(a).not.toBe(b);
  });
});
