import { describe, it, expect } from 'vitest';
import { golombEncode, golombDecode, golombEncodeAll, golombDecodeAll, golombCoding } from '../golombCoding';

describe('golombCoding', () => {
  it('m=1 acts as unary on 0', () => {
    expect(golombEncode(0, 1)).toBe('0');
    expect(golombDecode('0', 1).value).toBe(0);
  });

  it('m=1 round-trips 0..20', () => {
    for (let n = 0; n <= 20; n += 1) {
      expect(golombDecode(golombEncode(n, 1), 1).value).toBe(n);
    }
  });

  it('m=4 (rice) round-trips 0..50', () => {
    for (let n = 0; n <= 50; n += 1) {
      expect(golombDecode(golombEncode(n, 4), 4).value).toBe(n);
    }
  });

  it('m=5 (non-power-of-two) round-trips 0..50', () => {
    for (let n = 0; n <= 50; n += 1) {
      expect(golombDecode(golombEncode(n, 5), 5).value).toBe(n);
    }
  });

  it('encodeAll/decodeAll', () => {
    const arr = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55];
    expect(golombDecodeAll(golombEncodeAll(arr, 4), 4)).toEqual(arr);
  });

  it('throws on negative n', () => {
    expect(() => golombEncode(-1, 4)).toThrow();
  });

  it('throws on non-integer m', () => {
    expect(() => golombEncode(0, 1.5)).toThrow();
  });

  it('throws on m < 1', () => {
    expect(() => golombEncode(0, 0)).toThrow();
  });

  it('decode throws on truncated unary', () => {
    expect(() => golombDecode('111', 4)).toThrow();
  });

  it('decode throws on truncated remainder', () => {
    expect(() => golombDecode('0', 4)).toThrow();
  });

  it('object wrapper', () => {
    const arr = [0, 7, 9, 100];
    expect(golombCoding.decodeAll(golombCoding.encodeAll(arr, 8), 8)).toEqual(arr);
  });
});
