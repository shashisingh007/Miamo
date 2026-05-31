import { describe, it, expect } from 'vitest';
import { parseBearerToken } from '../bearerTokenParser';

describe('bearerTokenParser', () => {
  it('valid JWT-shaped bearer', () => {
    const r = parseBearerToken('Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig');
    expect(r).toEqual({ ok: true, token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig' });
  });

  it('case-insensitive scheme', () => {
    const r = parseBearerToken('bearer abc123def');
    expect(r.ok).toBe(true);
  });

  it('null/undefined/empty -> missing', () => {
    expect(parseBearerToken(null).ok).toBe(false);
    expect(parseBearerToken(undefined).ok).toBe(false);
    expect((parseBearerToken('') as any).reason).toBe('missing');
  });

  it('wrong scheme rejected', () => {
    const r = parseBearerToken('Basic dXNlcjpwYXNz');
    expect((r as any).reason).toBe('wrong_scheme');
  });

  it('no space -> malformed', () => {
    const r = parseBearerToken('BearerNoSpace');
    expect((r as any).reason).toBe('malformed');
  });

  it('empty token after scheme', () => {
    const r = parseBearerToken('Bearer   ');
    expect((r as any).reason).toBe('empty_token');
  });

  it('bad charset rejected', () => {
    const r = parseBearerToken('Bearer abc!def#ghi');
    expect((r as any).reason).toBe('bad_charset');
  });

  it('too short rejected', () => {
    const r = parseBearerToken('Bearer abc');
    expect((r as any).reason).toBe('too_short');
  });

  it('custom minLength honored', () => {
    const r = parseBearerToken('Bearer abc', { minLength: 3 });
    expect(r).toEqual({ ok: true, token: 'abc' });
  });

  it('base64-padded token allowed', () => {
    const r = parseBearerToken('Bearer aGVsbG8gd29ybGQ=');
    expect(r.ok).toBe(true);
  });

  it('surrounding whitespace tolerated', () => {
    const r = parseBearerToken('   Bearer    abcdefgh   ');
    expect(r).toEqual({ ok: true, token: 'abcdefgh' });
  });
});
