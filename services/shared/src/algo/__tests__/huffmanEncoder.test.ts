import { describe, it, expect } from 'vitest';
import { huffmanEncode, huffmanDecode } from '../huffmanEncoder';

describe('huffmanEncoder', () => {
  it('empty input yields empty bits', () => {
    const r = huffmanEncode('');
    expect(r.bits).toBe('');
    expect(r.codes.size).toBe(0);
  });

  it('single-symbol input', () => {
    const r = huffmanEncode('aaaa');
    expect(r.codes.get('a')).toBeDefined();
    expect(r.bits.length).toBeGreaterThan(0);
    expect(huffmanDecode(r.bits, r.codes)).toBe('aaaa');
  });

  it('round-trip ASCII', () => {
    const s = 'hello world';
    const r = huffmanEncode(s);
    expect(huffmanDecode(r.bits, r.codes)).toBe(s);
  });

  it('round-trip with repeats', () => {
    const s = 'mississippi';
    const r = huffmanEncode(s);
    expect(huffmanDecode(r.bits, r.codes)).toBe(s);
  });

  it('every code is uniquely decodable (prefix property)', () => {
    const r = huffmanEncode('abcdefgh');
    const codes = Array.from(r.codes.values());
    for (let i = 0; i < codes.length; i++) {
      for (let j = 0; j < codes.length; j++) {
        if (i === j) continue;
        expect(codes[j].startsWith(codes[i])).toBe(false);
      }
    }
  });

  it('frequent symbols get short codes', () => {
    const s = 'aaaaaaaaabc';
    const r = huffmanEncode(s);
    expect(r.codes.get('a')!.length).toBeLessThanOrEqual(r.codes.get('b')!.length);
    expect(r.codes.get('a')!.length).toBeLessThanOrEqual(r.codes.get('c')!.length);
  });

  it('decodes with provided codes table', () => {
    const r = huffmanEncode('banana');
    expect(huffmanDecode(r.bits, r.codes)).toBe('banana');
  });

  it('two-symbol input', () => {
    const r = huffmanEncode('ab');
    expect(huffmanDecode(r.bits, r.codes)).toBe('ab');
  });

  it('two-symbol balanced uses 1 bit each', () => {
    const r = huffmanEncode('abab');
    expect(r.bits.length).toBe(4);
  });

  it('unicode strings round-trip', () => {
    const s = 'héllo wörld';
    const r = huffmanEncode(s);
    expect(huffmanDecode(r.bits, r.codes)).toBe(s);
  });

  it('long random repeats round-trip', () => {
    const chars = 'abcdef';
    let s = '';
    for (let i = 0; i < 200; i++) s += chars[i % chars.length];
    const r = huffmanEncode(s);
    expect(huffmanDecode(r.bits, r.codes)).toBe(s);
  });

  it('bits length never exceeds 8*len for short alphabet', () => {
    const s = 'aabbcc';
    const r = huffmanEncode(s);
    expect(r.bits.length).toBeLessThanOrEqual(8 * s.length);
  });

  it('all same char produces non-empty bits', () => {
    const r = huffmanEncode('zzzz');
    expect(r.bits.length).toBeGreaterThan(0);
  });

  it('three-symbol alphabet round-trip', () => {
    const s = 'abcabcabcabcabc';
    const r = huffmanEncode(s);
    expect(huffmanDecode(r.bits, r.codes)).toBe(s);
  });

  it('codes map size equals alphabet size', () => {
    const r = huffmanEncode('abcde');
    expect(r.codes.size).toBe(5);
  });

  it('whitespace and punctuation round-trip', () => {
    const s = 'a, b. c! d?';
    const r = huffmanEncode(s);
    expect(huffmanDecode(r.bits, r.codes)).toBe(s);
  });
});
