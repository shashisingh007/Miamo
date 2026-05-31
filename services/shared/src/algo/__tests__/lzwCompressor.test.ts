import { describe, it, expect } from 'vitest';
import { lzwEncode, lzwDecode } from '../lzwCompressor';

describe('lzwCompressor', () => {
  it('empty round-trip', () => {
    expect(lzwEncode('')).toEqual([]);
    expect(lzwDecode([])).toBe('');
  });

  it('single-char round-trip', () => {
    const codes = lzwEncode('a');
    expect(codes).toEqual([97]);
    expect(lzwDecode(codes)).toBe('a');
  });

  it('round-trip hello world', () => {
    const s = 'hello world';
    expect(lzwDecode(lzwEncode(s))).toBe(s);
  });

  it('round-trip with repeats', () => {
    const s = 'TOBEORNOTTOBEORTOBEORNOT';
    expect(lzwDecode(lzwEncode(s))).toBe(s);
  });

  it('classic TOBEORNOTTOBEORTOBEORNOT encodes shorter than ASCII', () => {
    const s = 'TOBEORNOTTOBEORTOBEORNOT';
    const codes = lzwEncode(s);
    expect(codes.length).toBeLessThan(s.length);
  });

  it('long-repeat string compresses', () => {
    const s = 'aaaaaaaaaaaaaaaaaaaaaaa';
    const codes = lzwEncode(s);
    expect(codes.length).toBeLessThan(s.length);
    expect(lzwDecode(codes)).toBe(s);
  });

  it('handles KwKwK edge case (decoder sees code == dict.length)', () => {
    const s = 'ababababab';
    const codes = lzwEncode(s);
    expect(lzwDecode(codes)).toBe(s);
  });

  it('round-trip unicode-ascii subset', () => {
    const s = 'hello there general kenobi';
    expect(lzwDecode(lzwEncode(s))).toBe(s);
  });

  it('round-trip numerics', () => {
    const s = '1234567890123456789012345';
    expect(lzwDecode(lzwEncode(s))).toBe(s);
  });

  it('decoder throws on invalid initial code', () => {
    expect(() => lzwDecode([9999])).toThrow(RangeError);
  });

  it('decoder throws on out-of-range code', () => {
    expect(() => lzwDecode([97, 9999])).toThrow(RangeError);
  });

  it('two-char round-trip', () => {
    expect(lzwDecode(lzwEncode('ab'))).toBe('ab');
  });

  it('whitespace and punctuation', () => {
    const s = 'a, b. c! d?';
    expect(lzwDecode(lzwEncode(s))).toBe(s);
  });

  it('round-trip 500-char chunked text', () => {
    const chars = 'abcdef';
    let s = '';
    for (let i = 0; i < 500; i++) s += chars[i % chars.length];
    expect(lzwDecode(lzwEncode(s))).toBe(s);
  });

  it('round-trip mixed case', () => {
    const s = 'AbCdEfGhIjKlMnOp';
    expect(lzwDecode(lzwEncode(s))).toBe(s);
  });

  it('encoded codes are all integers ≥ 0', () => {
    const codes = lzwEncode('mississippi river');
    for (const c of codes) {
      expect(Number.isInteger(c)).toBe(true);
      expect(c).toBeGreaterThanOrEqual(0);
    }
  });
});
