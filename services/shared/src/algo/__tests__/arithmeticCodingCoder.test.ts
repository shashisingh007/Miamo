import { describe, it, expect } from 'vitest';
import {
  arithmeticCodingEncode,
  arithmeticCodingDecode,
  arithmeticCodingCoder,
} from '../arithmeticCodingCoder';

describe('arithmeticCodingCoder', () => {
  const freq = { a: 3, b: 2, c: 1 };

  it('encode empty => length 0', () => {
    const r = arithmeticCodingEncode('', freq);
    expect(r).toEqual({ value: 0n, length: 0, total: 6n });
  });

  it('encode/decode single symbol', () => {
    const e = arithmeticCodingEncode('a', freq);
    expect(arithmeticCodingDecode(e, freq)).toBe('a');
  });

  it('encode/decode short string', () => {
    const e = arithmeticCodingEncode('abc', freq);
    expect(arithmeticCodingDecode(e, freq)).toBe('abc');
  });

  it('round-trip multiple repetitions', () => {
    const e = arithmeticCodingEncode('aabbcca', freq);
    expect(arithmeticCodingDecode(e, freq)).toBe('aabbcca');
  });

  it('round-trip 50-char string', () => {
    const s = 'ababcabcabcaaabbcccabcabcabcabcabcaabbccaabbccaaab';
    const e = arithmeticCodingEncode(s, freq);
    expect(arithmeticCodingDecode(e, freq)).toBe(s);
  });

  it('throws on missing symbol', () => {
    expect(() => arithmeticCodingEncode('x', freq)).toThrow();
  });

  it('throws on non-string input', () => {
    expect(() => arithmeticCodingEncode(123 as any, freq)).toThrow();
  });

  it('throws on empty frequency table', () => {
    expect(() => arithmeticCodingEncode('a', {})).toThrow();
  });

  it('throws on non-positive frequency', () => {
    expect(() => arithmeticCodingEncode('a', { a: 0 })).toThrow();
  });

  it('decode throws on frequency total mismatch', () => {
    const e = arithmeticCodingEncode('abc', freq);
    expect(() => arithmeticCodingDecode(e, { a: 1, b: 1, c: 1 })).toThrow();
  });

  it('object wrapper round-trips', () => {
    const e = arithmeticCodingCoder.encode('cba', freq);
    expect(arithmeticCodingCoder.decode(e, freq)).toBe('cba');
  });
});
