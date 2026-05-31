import { describe, it, expect } from 'vitest';
import { lzwCompress, lzwDecompress, lzwCompression } from '../lzwCompression';

describe('lzwCompression', () => {
  it('empty round-trips', () => {
    expect(lzwCompress('')).toEqual([]);
    expect(lzwDecompress([])).toBe('');
  });

  it('single char round-trips', () => {
    expect(lzwDecompress(lzwCompress('a'))).toBe('a');
  });

  it('classic TOBEORNOTTOBEORTOBEORNOT compresses to known codes', () => {
    const input = 'TOBEORNOTTOBEORTOBEORNOT';
    const codes = lzwCompress(input);
    expect(codes[0]).toBe('T'.charCodeAt(0));
    expect(codes[1]).toBe('O'.charCodeAt(0));
    expect(lzwDecompress(codes)).toBe(input);
  });

  it('long repetition compresses smaller than input length', () => {
    const input = 'ABAB'.repeat(100);
    const codes = lzwCompress(input);
    expect(codes.length).toBeLessThan(input.length);
    expect(lzwDecompress(codes)).toBe(input);
  });

  it('round-trips arbitrary ASCII string', () => {
    const input = 'the quick brown fox jumps over the lazy dog the quick brown fox';
    expect(lzwDecompress(lzwCompress(input))).toBe(input);
  });

  it('round-trips with high-byte characters', () => {
    const input = '\u00ff\u0080\u00f0\u00ff\u00ff';
    expect(lzwDecompress(lzwCompress(input))).toBe(input);
  });

  it('handles all-same character', () => {
    const input = 'aaaaaaaaaa';
    expect(lzwDecompress(lzwCompress(input))).toBe(input);
  });

  it('throws on non-string compress input', () => {
    expect(() => lzwCompress(123 as any)).toThrow();
  });

  it('throws on non-array decompress input', () => {
    expect(() => lzwDecompress('abc' as any)).toThrow();
  });

  it('throws on invalid initial code', () => {
    expect(() => lzwDecompress([99999])).toThrow();
  });

  it('exposes object wrapper', () => {
    const input = 'hello world';
    expect(lzwCompression.decompress(lzwCompression.compress(input))).toBe(input);
  });
});
