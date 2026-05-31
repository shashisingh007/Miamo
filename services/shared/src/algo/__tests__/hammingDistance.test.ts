import { describe, it, expect } from 'vitest';
import {
  hammingDistanceString,
  hammingDistanceBytes,
  hammingDistanceBigint,
} from '../hammingDistance';

describe('hammingDistanceString', () => {
  it('rejects non-string', () => {
    expect(() => hammingDistanceString(1 as any, '1')).toThrow();
  });

  it('rejects length mismatch', () => {
    expect(() => hammingDistanceString('a', 'ab')).toThrow();
  });

  it('identical => 0', () => {
    expect(hammingDistanceString('hello', 'hello')).toBe(0);
  });

  it('one diff', () => {
    expect(hammingDistanceString('hello', 'hellp')).toBe(1);
  });

  it('all diff', () => {
    expect(hammingDistanceString('abc', 'xyz')).toBe(3);
  });

  it('empty pair => 0', () => {
    expect(hammingDistanceString('', '')).toBe(0);
  });

  it('case sensitive', () => {
    expect(hammingDistanceString('Hi', 'hI')).toBe(2);
  });
});

describe('hammingDistanceBytes', () => {
  it('rejects non-Uint8Array', () => {
    expect(() => hammingDistanceBytes([1] as any, new Uint8Array([1]))).toThrow();
  });

  it('rejects length mismatch', () => {
    expect(() => hammingDistanceBytes(new Uint8Array(1), new Uint8Array(2))).toThrow();
  });

  it('identical => 0', () => {
    expect(hammingDistanceBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(0);
  });

  it('counts bit differences', () => {
    // 0x00 ^ 0xff = 0xff (8 bits)
    expect(hammingDistanceBytes(new Uint8Array([0]), new Uint8Array([0xff]))).toBe(8);
  });

  it('per-bit accuracy', () => {
    // 0b10101010 vs 0b01010101 => 8 bit differences
    expect(hammingDistanceBytes(new Uint8Array([0xaa]), new Uint8Array([0x55]))).toBe(8);
  });

  it('mixed bytes', () => {
    // [0x01, 0x02] vs [0x00, 0x03] => 1 bit + 1 bit = 2
    expect(hammingDistanceBytes(new Uint8Array([0x01, 0x02]), new Uint8Array([0x00, 0x03]))).toBe(2);
  });

  it('empty', () => {
    expect(hammingDistanceBytes(new Uint8Array(0), new Uint8Array(0))).toBe(0);
  });
});

describe('hammingDistanceBigint', () => {
  it('rejects non-bigint', () => {
    expect(() => hammingDistanceBigint(1 as any, 1n)).toThrow();
  });

  it('rejects negatives', () => {
    expect(() => hammingDistanceBigint(-1n, 0n)).toThrow();
  });

  it('identical => 0', () => {
    expect(hammingDistanceBigint(0xffn, 0xffn)).toBe(0);
  });

  it('one bit diff', () => {
    expect(hammingDistanceBigint(0n, 1n)).toBe(1);
  });

  it('full byte diff', () => {
    expect(hammingDistanceBigint(0n, 0xffn)).toBe(8);
  });

  it('large bigint', () => {
    expect(hammingDistanceBigint(0n, (1n << 128n) - 1n)).toBe(128);
  });

  it('partial overlap', () => {
    // 0b1010 vs 0b0101 = 4
    expect(hammingDistanceBigint(0b1010n, 0b0101n)).toBe(4);
  });
});
