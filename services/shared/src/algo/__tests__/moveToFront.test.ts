import { describe, it, expect } from 'vitest';
import { moveToFrontEncode, moveToFrontDecode } from '../moveToFront';

describe('moveToFront', () => {
  it('empty input', () => {
    expect(moveToFrontEncode([], 4)).toEqual([]);
    expect(moveToFrontDecode([], 4)).toEqual([]);
  });

  it('single symbol equals its index', () => {
    expect(moveToFrontEncode([3], 5)).toEqual([3]);
  });

  it('repeated symbol becomes 0 after first', () => {
    expect(moveToFrontEncode([2, 2, 2], 4)).toEqual([2, 0, 0]);
  });

  it('round trip random sequences', () => {
    for (let t = 0; t < 30; t++) {
      const alpha = 1 + Math.floor(Math.random() * 16);
      const len = Math.floor(Math.random() * 40);
      const arr: number[] = [];
      for (let i = 0; i < len; i++) arr.push(Math.floor(Math.random() * alpha));
      expect(moveToFrontDecode(moveToFrontEncode(arr, alpha), alpha)).toEqual(arr);
    }
  });

  it('canonical example', () => {
    // alphabet 0..2, input [0,1,2,0,1,2]
    expect(moveToFrontEncode([0, 1, 2, 0, 1, 2], 3)).toEqual([0, 1, 2, 2, 2, 2]);
  });

  it('all same symbol', () => {
    const r = moveToFrontEncode([1, 1, 1, 1], 3);
    expect(r).toEqual([1, 0, 0, 0]);
    expect(moveToFrontDecode(r, 3)).toEqual([1, 1, 1, 1]);
  });

  it('alphabet of size 1', () => {
    expect(moveToFrontEncode([0, 0, 0], 1)).toEqual([0, 0, 0]);
  });

  it('rejects alphabetSize zero', () => {
    expect(() => moveToFrontEncode([], 0)).toThrow();
  });

  it('rejects out-of-range symbol', () => {
    expect(() => moveToFrontEncode([5], 4)).toThrow();
  });

  it('rejects out-of-range index on decode', () => {
    expect(() => moveToFrontDecode([4], 4)).toThrow();
  });

  it('encode then decode preserves identity for ascending alphabet', () => {
    const arr = [0, 1, 2, 3, 4];
    expect(moveToFrontDecode(moveToFrontEncode(arr, 5), 5)).toEqual(arr);
  });
});
