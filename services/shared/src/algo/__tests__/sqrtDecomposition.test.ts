import { describe, it, expect } from 'vitest';
import { SqrtDecomposition } from '../sqrtDecomposition';

describe('SqrtDecomposition', () => {
  it('empty array ok', () => {
    const s = new SqrtDecomposition([]);
    expect(s.length).toBe(0);
    expect(s.rangeSum(0, 0)).toBe(0);
  });

  it('throws on non-finite construct', () => {
    expect(() => new SqrtDecomposition([1, NaN])).toThrow(TypeError);
    expect(() => new SqrtDecomposition([1, Infinity])).toThrow(TypeError);
  });

  it('get returns stored', () => {
    const s = new SqrtDecomposition([10, 20, 30]);
    expect(s.get(0)).toBe(10);
    expect(s.get(2)).toBe(30);
  });

  it('rangeSum full', () => {
    const s = new SqrtDecomposition([1, 2, 3, 4, 5]);
    expect(s.rangeSum(0, 5)).toBe(15);
  });

  it('rangeSum partial', () => {
    const s = new SqrtDecomposition([1, 2, 3, 4, 5]);
    expect(s.rangeSum(1, 4)).toBe(9);
  });

  it('rangeSum single index', () => {
    const s = new SqrtDecomposition([1, 2, 3]);
    expect(s.rangeSum(1, 2)).toBe(2);
  });

  it('rangeSum empty range', () => {
    const s = new SqrtDecomposition([1, 2, 3]);
    expect(s.rangeSum(1, 1)).toBe(0);
  });

  it('set updates value and block', () => {
    const s = new SqrtDecomposition([1, 2, 3, 4, 5]);
    s.set(2, 100);
    expect(s.get(2)).toBe(100);
    expect(s.rangeSum(0, 5)).toBe(1 + 2 + 100 + 4 + 5);
  });

  it('many sets and queries', () => {
    const arr = Array.from({ length: 50 }, (_, i) => i);
    const s = new SqrtDecomposition(arr);
    expect(s.rangeSum(0, 50)).toBe((49 * 50) / 2);
    for (let i = 0; i < 50; i += 1) s.set(i, 1);
    expect(s.rangeSum(0, 50)).toBe(50);
    expect(s.rangeSum(10, 20)).toBe(10);
  });

  it('throws on out-of-range get', () => {
    const s = new SqrtDecomposition([1, 2]);
    expect(() => s.get(-1)).toThrow(RangeError);
    expect(() => s.get(2)).toThrow(RangeError);
  });

  it('throws on out-of-range set', () => {
    const s = new SqrtDecomposition([1, 2]);
    expect(() => s.set(-1, 0)).toThrow(RangeError);
    expect(() => s.set(2, 0)).toThrow(RangeError);
  });

  it('throws on non-finite set value', () => {
    const s = new SqrtDecomposition([1]);
    expect(() => s.set(0, NaN)).toThrow(TypeError);
  });

  it('throws on inverted range', () => {
    const s = new SqrtDecomposition([1, 2, 3]);
    expect(() => s.rangeSum(2, 1)).toThrow(RangeError);
  });

  it('crosses many blocks correctly', () => {
    const arr = Array.from({ length: 100 }, () => 1);
    const s = new SqrtDecomposition(arr);
    expect(s.rangeSum(5, 95)).toBe(90);
  });
});
