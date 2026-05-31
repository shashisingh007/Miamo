import { describe, it, expect } from 'vitest';
import { percentEncode, percentDecode } from '../percentEncoder';

describe('percentEncoder', () => {
  it('encode empty', () => {
    expect(percentEncode('')).toBe('');
  });

  it('encode unreserved unchanged', () => {
    expect(percentEncode('abcXYZ09-._~')).toBe('abcXYZ09-._~');
  });

  it('encode space (component) => %20', () => {
    expect(percentEncode('a b')).toBe('a%20b');
  });

  it('encode reserved (component) escapes /', () => {
    expect(percentEncode('a/b')).toBe('a%2Fb');
  });

  it('path mode preserves /', () => {
    expect(percentEncode('a/b', 'path')).toBe('a/b');
  });

  it('query mode preserves /:@', () => {
    expect(percentEncode('a/b?c', 'query')).toBe('a/b%3Fc');
  });

  it('form mode encodes space as +', () => {
    expect(percentEncode('a b', 'form')).toBe('a+b');
  });

  it('rejects unknown mode', () => {
    expect(() => percentEncode('x', 'wat' as any)).toThrow();
  });

  it('rejects non-string', () => {
    expect(() => percentEncode(123 as any)).toThrow();
  });

  it('encodes UTF-8 multibyte', () => {
    expect(percentEncode('café')).toBe('caf%C3%A9');
  });

  it('encodes high codepoint', () => {
    expect(percentEncode('Привет')).toBe('%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82');
  });

  it('decode unreserved unchanged', () => {
    expect(percentDecode('abc')).toBe('abc');
  });

  it('decode %20 => space', () => {
    expect(percentDecode('a%20b')).toBe('a b');
  });

  it('decode UTF-8 multibyte', () => {
    expect(percentDecode('caf%C3%A9')).toBe('café');
  });

  it('decode lowercase hex', () => {
    expect(percentDecode('caf%c3%a9')).toBe('café');
  });

  it('decode rejects truncated', () => {
    expect(() => percentDecode('a%2')).toThrow();
  });

  it('decode rejects invalid hex', () => {
    expect(() => percentDecode('a%ZZ')).toThrow();
  });

  it('decode plus stays plus by default', () => {
    expect(percentDecode('a+b')).toBe('a+b');
  });

  it('decode plusAsSpace=true treats + as space', () => {
    expect(percentDecode('a+b', { plusAsSpace: true })).toBe('a b');
  });

  it('round-trip ASCII (component)', () => {
    const s = 'Hello, World!/?#&=+ ';
    expect(percentDecode(percentEncode(s))).toBe(s);
  });

  it('round-trip UTF-8 (component)', () => {
    const s = 'café — Привет 🎉';
    expect(percentDecode(percentEncode(s))).toBe(s);
  });

  it('round-trip form', () => {
    const s = 'foo bar+baz';
    expect(percentDecode(percentEncode(s, 'form'), { plusAsSpace: true })).toBe(s);
  });

  it('decode rejects non-string', () => {
    expect(() => percentDecode(123 as any)).toThrow();
  });

  it('encodes # always', () => {
    expect(percentEncode('a#b', 'path')).toBe('a%23b');
    expect(percentEncode('a#b', 'query')).toBe('a%23b');
  });

  it('encodes null byte', () => {
    expect(percentEncode('\u0000')).toBe('%00');
  });
});
