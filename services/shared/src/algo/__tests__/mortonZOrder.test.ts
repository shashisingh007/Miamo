import { describe, it, expect } from 'vitest';
import { mortonEncode2D, mortonDecode2D } from '../mortonZOrder';

describe('mortonZOrder', () => {
  it('origin', () => {
    expect(mortonEncode2D(0, 0)).toBe(0);
    expect(mortonDecode2D(0)).toEqual({ x: 0, y: 0 });
  });

  it('(1,0) => 1', () => {
    expect(mortonEncode2D(1, 0)).toBe(1);
  });

  it('(0,1) => 2', () => {
    expect(mortonEncode2D(0, 1)).toBe(2);
  });

  it('(1,1) => 3', () => {
    expect(mortonEncode2D(1, 1)).toBe(3);
  });

  it('(2,0) => 4', () => {
    expect(mortonEncode2D(2, 0)).toBe(4);
  });

  it('round-trip small grid', () => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const c = mortonEncode2D(x, y);
      expect(mortonDecode2D(c)).toEqual({ x, y });
    }
  });

  it('round-trip 16-bit max', () => {
    const c = mortonEncode2D(0xffff, 0xffff);
    expect(c).toBe(0xffffffff >>> 0);
    expect(mortonDecode2D(c)).toEqual({ x: 0xffff, y: 0xffff });
  });

  it('throws on non-integer x', () => {
    expect(() => mortonEncode2D(1.5, 0)).toThrow(RangeError);
  });

  it('throws on negative', () => {
    expect(() => mortonEncode2D(-1, 0)).toThrow(RangeError);
  });

  it('throws when too large', () => {
    expect(() => mortonEncode2D(0x10000, 0)).toThrow(RangeError);
  });

  it('throws on negative code', () => {
    expect(() => mortonDecode2D(-1)).toThrow(RangeError);
  });

  it('throws on non-integer code', () => {
    expect(() => mortonDecode2D(1.5)).toThrow(RangeError);
  });

  it('encode is monotone within row of constant y', () => {
    for (let x = 0; x < 16; x++) {
      const c = mortonEncode2D(x, 0);
      const next = mortonEncode2D(x + 1, 0);
      expect(next).toBeGreaterThan(c);
    }
  });

  it('handles asymmetric coords', () => {
    const c = mortonEncode2D(7, 3);
    const d = mortonDecode2D(c);
    expect(d).toEqual({ x: 7, y: 3 });
  });
});
