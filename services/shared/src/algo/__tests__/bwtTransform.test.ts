import { describe, it, expect } from 'vitest';
import { bwtEncode, bwtDecode } from '../bwtTransform';

describe('bwtTransform', () => {
  it('encode rejects non-string', () => {
    expect(() => bwtEncode(42 as any)).toThrow(TypeError);
  });

  it('decode rejects non-string', () => {
    expect(() => bwtDecode(42 as any, 0)).toThrow(TypeError);
  });

  it('decode rejects bad primary', () => {
    expect(() => bwtDecode('abc', -1)).toThrow(RangeError);
    expect(() => bwtDecode('abc', 1.5)).toThrow(RangeError);
    expect(() => bwtDecode('abc', 5)).toThrow(RangeError);
  });

  it('empty round trip', () => {
    const r = bwtEncode('');
    expect(r.transformed).toBe('');
    expect(bwtDecode('', 0)).toBe('');
  });

  it('single char round trip', () => {
    const r = bwtEncode('x');
    expect(bwtDecode(r.transformed, r.primaryIndex)).toBe('x');
  });

  it('banana round trip', () => {
    const r = bwtEncode('banana');
    expect(bwtDecode(r.transformed, r.primaryIndex)).toBe('banana');
  });

  it('all distinct chars round trip', () => {
    const r = bwtEncode('abcdef');
    expect(bwtDecode(r.transformed, r.primaryIndex)).toBe('abcdef');
  });

  it('repeated chars round trip', () => {
    const r = bwtEncode('aaaaa');
    expect(bwtDecode(r.transformed, r.primaryIndex)).toBe('aaaaa');
  });

  it('mississippi round trip', () => {
    const r = bwtEncode('mississippi');
    expect(bwtDecode(r.transformed, r.primaryIndex)).toBe('mississippi');
  });

  it('binary string round trip', () => {
    const r = bwtEncode('0010110100');
    expect(bwtDecode(r.transformed, r.primaryIndex)).toBe('0010110100');
  });

  it('many random round trips', () => {
    for (let t = 0; t < 50; t += 1) {
      let s = '';
      const n = 1 + Math.floor(Math.random() * 30);
      for (let i = 0; i < n; i += 1) {
        s += 'abc'[Math.floor(Math.random() * 3)];
      }
      const r = bwtEncode(s);
      expect(bwtDecode(r.transformed, r.primaryIndex)).toBe(s);
    }
  });

  it('transformed has same length', () => {
    const r = bwtEncode('hello world');
    expect(r.transformed).toHaveLength('hello world'.length);
  });

  it('primaryIndex within range', () => {
    const r = bwtEncode('something');
    expect(r.primaryIndex).toBeGreaterThanOrEqual(0);
    expect(r.primaryIndex).toBeLessThan(r.transformed.length);
  });

  it('unicode round trip', () => {
    const s = 'αβγδα';
    const r = bwtEncode(s);
    expect(bwtDecode(r.transformed, r.primaryIndex)).toBe(s);
  });

  it('two-char strings', () => {
    for (const s of ['ab', 'ba', 'aa']) {
      const r = bwtEncode(s);
      expect(bwtDecode(r.transformed, r.primaryIndex)).toBe(s);
    }
  });

  it('canonical "abracadabra" round trip', () => {
    const s = 'abracadabra';
    const r = bwtEncode(s);
    expect(bwtDecode(r.transformed, r.primaryIndex)).toBe(s);
  });
});
