import { describe, it, expect } from 'vitest';
import { verifyCsrfTokenPair } from '../csrfTokenPair';

const TOK = 'abcdef0123456789ABCDEF';

describe('csrfTokenPair', () => {
  it('matching tokens -> valid', () => {
    expect(verifyCsrfTokenPair({ cookieToken: TOK, headerToken: TOK })).toEqual({ valid: true });
  });

  it('missing cookie', () => {
    const r = verifyCsrfTokenPair({ cookieToken: '', headerToken: TOK });
    expect(r).toEqual({ valid: false, reason: 'missing_cookie' });
  });

  it('null cookie', () => {
    const r = verifyCsrfTokenPair({ cookieToken: null, headerToken: TOK });
    expect((r as any).reason).toBe('missing_cookie');
  });

  it('missing header', () => {
    const r = verifyCsrfTokenPair({ cookieToken: TOK, headerToken: undefined });
    expect((r as any).reason).toBe('missing_header');
  });

  it('mismatch -> mismatch', () => {
    const r = verifyCsrfTokenPair({ cookieToken: TOK, headerToken: TOK.replace('a', 'b') });
    expect((r as any).reason).toBe('mismatch');
  });

  it('mismatch same length is constant-time (no early reason leak)', () => {
    const r = verifyCsrfTokenPair({ cookieToken: 'AAAAAAAAAAAAAAAA', headerToken: 'BBBBBBBBBBBBBBBB' });
    expect((r as any).reason).toBe('mismatch');
  });

  it('too short rejected', () => {
    const r = verifyCsrfTokenPair({ cookieToken: 'abc', headerToken: 'abc' });
    expect((r as any).reason).toBe('too_short');
  });

  it('too long rejected', () => {
    const long = 'a'.repeat(500);
    const r = verifyCsrfTokenPair({ cookieToken: long, headerToken: long });
    expect((r as any).reason).toBe('too_long');
  });

  it('bad charset rejected', () => {
    const t = 'abcd1234abcd1234!@#$';
    const r = verifyCsrfTokenPair({ cookieToken: t, headerToken: t });
    expect((r as any).reason).toBe('bad_charset');
  });

  it('different length -> mismatch (not bad_charset)', () => {
    const r = verifyCsrfTokenPair({ cookieToken: TOK, headerToken: TOK + 'XX' });
    expect((r as any).reason).toBe('mismatch');
  });

  it('custom min/max length honored', () => {
    const r = verifyCsrfTokenPair({
      cookieToken: 'abcd1234',
      headerToken: 'abcd1234',
      minLength: 4,
      maxLength: 16,
    });
    expect(r).toEqual({ valid: true });
  });
});
