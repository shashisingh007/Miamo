import { describe, it, expect } from 'vitest';
import { binaryToGray, grayToBinary } from '../grayCodeConverter';

describe('grayCodeConverter', () => {
  it('throws on non-integer n', () => {
    expect(() => binaryToGray(1.5)).toThrow(RangeError);
  });

  it('throws on negative n', () => {
    expect(() => binaryToGray(-1)).toThrow(RangeError);
  });

  it('throws on too large n', () => {
    expect(() => binaryToGray(2 ** 32)).toThrow(RangeError);
  });

  it('0 => 0', () => {
    expect(binaryToGray(0)).toBe(0);
    expect(grayToBinary(0)).toBe(0);
  });

  it('1 => 1', () => {
    expect(binaryToGray(1)).toBe(1);
  });

  it('2 => 3', () => {
    expect(binaryToGray(2)).toBe(3);
  });

  it('3 => 2', () => {
    expect(binaryToGray(3)).toBe(2);
  });

  it('4 => 6', () => {
    expect(binaryToGray(4)).toBe(6);
  });

  it('round-trip 0..255', () => {
    for (let i = 0; i < 256; i++) expect(grayToBinary(binaryToGray(i))).toBe(i);
  });

  it('adjacent codes differ by 1 bit', () => {
    const popcount = (x: number): number => {
      let c = 0; let v = x;
      while (v !== 0) { c += v & 1; v >>>= 1; }
      return c;
    };
    for (let i = 0; i + 1 < 256; i++) {
      const a = binaryToGray(i);
      const b = binaryToGray(i + 1);
      expect(popcount(a ^ b)).toBe(1);
    }
  });

  it('grayToBinary throws on non-integer', () => {
    expect(() => grayToBinary(1.5)).toThrow(RangeError);
  });

  it('grayToBinary throws on negative', () => {
    expect(() => grayToBinary(-1)).toThrow(RangeError);
  });

  it('large value round-trip', () => {
    const n = 0xabcdef01;
    expect(grayToBinary(binaryToGray(n))).toBe(n);
  });

  it('255 round-trip', () => {
    expect(grayToBinary(binaryToGray(255))).toBe(255);
  });
});
