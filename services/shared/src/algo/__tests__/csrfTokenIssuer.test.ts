import { describe, it, expect } from 'vitest';
import {
  issueCsrfToken,
  verifyCsrfToken,
  verifyCsrfTokenForSession,
} from '../csrfTokenIssuer';

const SECRET = 'super_secret_value';
const SID = 'session_xyz';
const NOW = 1_700_000_000_000;

describe('csrfTokenIssuer', () => {
  it('throws when secret missing', () => {
    expect(() => issueCsrfToken('', SID)).toThrow(RangeError);
  });

  it('throws when sessionId missing', () => {
    expect(() => issueCsrfToken(SECRET, '')).toThrow(RangeError);
  });

  it('throws on non-positive ttl', () => {
    expect(() => issueCsrfToken(SECRET, SID, { ttlMs: 0 })).toThrow(RangeError);
  });

  it('issued token has 3 dot-separated parts', () => {
    const r = issueCsrfToken(SECRET, SID, { nowMs: NOW });
    expect(r.token.split('.')).toHaveLength(3);
    expect(r.expiresAtMs).toBe(NOW + 60 * 60_000);
  });

  it('verify accepts freshly issued token', () => {
    const r = issueCsrfToken(SECRET, SID, { nowMs: NOW });
    const v = verifyCsrfToken(SECRET, SID, r.token, NOW + 1000);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.expiresAtMs).toBe(r.expiresAtMs);
  });

  it('verify rejects missing token', () => {
    expect(verifyCsrfToken(SECRET, SID, undefined).ok).toBe(false);
    expect(verifyCsrfToken(SECRET, SID, '').ok).toBe(false);
  });

  it('verify rejects malformed token', () => {
    const v = verifyCsrfToken(SECRET, SID, 'nope', NOW);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('malformed');
  });

  it('verify rejects expired token', () => {
    const r = issueCsrfToken(SECRET, SID, { nowMs: NOW, ttlMs: 1000 });
    const v = verifyCsrfToken(SECRET, SID, r.token, NOW + 5000);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('expired');
  });

  it('verify rejects when session differs', () => {
    const r = issueCsrfToken(SECRET, SID, { nowMs: NOW });
    const v = verifyCsrfToken(SECRET, 'other_session', r.token, NOW + 1000);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('signature_mismatch');
  });

  it('verify rejects when secret differs', () => {
    const r = issueCsrfToken(SECRET, SID, { nowMs: NOW });
    const v = verifyCsrfToken('other_secret', SID, r.token, NOW + 1000);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('signature_mismatch');
  });

  it('tampered mac fails', () => {
    const r = issueCsrfToken(SECRET, SID, { nowMs: NOW });
    const [n, e, m] = r.token.split('.');
    const flipped = m.slice(0, -1) + (m.slice(-1) === 'A' ? 'B' : 'A');
    const v = verifyCsrfToken(SECRET, SID, `${n}.${e}.${flipped}`, NOW + 1000);
    expect(v.ok).toBe(false);
  });

  it('tampered exp fails (mac no longer matches)', () => {
    const r = issueCsrfToken(SECRET, SID, { nowMs: NOW, ttlMs: 1000 });
    const [n, , m] = r.token.split('.');
    const v = verifyCsrfToken(SECRET, SID, `${n}.${NOW + 999_999_999}.${m}`, NOW);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('signature_mismatch');
  });

  it('explicit nonce is preserved in token', () => {
    const r = issueCsrfToken(SECRET, SID, { nowMs: NOW, nonce: 'abc123' });
    expect(r.token.startsWith('abc123.')).toBe(true);
  });

  it('two tokens issued back-to-back differ (random nonce)', () => {
    const a = issueCsrfToken(SECRET, SID, { nowMs: NOW });
    const b = issueCsrfToken(SECRET, SID, { nowMs: NOW });
    expect(a.token).not.toBe(b.token);
  });

  it('verifyCsrfTokenForSession accepts any matching session in list', () => {
    const r = issueCsrfToken(SECRET, 'old_session', { nowMs: NOW });
    const v = verifyCsrfTokenForSession(
      SECRET,
      ['new_session', 'old_session'],
      r.token,
      NOW + 1000
    );
    expect(v.ok).toBe(true);
  });

  it('verifyCsrfTokenForSession reports session_mismatch when none match', () => {
    const r = issueCsrfToken(SECRET, 'unknown', { nowMs: NOW });
    const v = verifyCsrfTokenForSession(SECRET, ['a', 'b'], r.token, NOW + 1000);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('session_mismatch');
  });
});
