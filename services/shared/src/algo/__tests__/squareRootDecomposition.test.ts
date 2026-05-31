import { describe, it, expect } from 'vitest';
import { SqrtDecomposition, squareRootDecomposition } from '../squareRootDecomposition';

function bruteSum(a: number[], l: number, r: number): number {
  let s = 0;
  for (let i = l; i <= r; i += 1) s += a[i];
  return s;
}

describe('squareRootDecomposition', () => {
  it('factory returns instance', () => {
    expect(squareRootDecomposition([1, 2, 3])).toBeInstanceOf(SqrtDecomposition);
  });

  it('size matches input', () => {
    expect(new SqrtDecomposition([1, 2, 3, 4]).size()).toBe(4);
  });

  it('rangeSum equals brute on small arrays', () => {
    const arr = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];
    const d = new SqrtDecomposition(arr);
    for (let l = 0; l < arr.length; l += 1) {
      for (let r = l; r < arr.length; r += 1) {
        expect(d.rangeSum(l, r)).toBe(bruteSum(arr, l, r));
      }
    }
  });

  it('point update reflected in queries', () => {
    const d = new SqrtDecomposition([1, 2, 3, 4, 5]);
    d.set(2, 30);
    expect(d.get(2)).toBe(30);
    expect(d.rangeSum(0, 4)).toBe(1 + 2 + 30 + 4 + 5);
    expect(d.rangeSum(2, 2)).toBe(30);
  });

  it('single-element query', () => {
    const d = new SqrtDecomposition([10, 20, 30]);
    expect(d.rangeSum(1, 1)).toBe(20);
  });

  it('whole-array query', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const d = new SqrtDecomposition(arr);
    expect(d.rangeSum(0, 8)).toBe(45);
  });

  it('large array random spot checks', () => {
    const n = 200;
    const arr: number[] = [];
    for (let i = 0; i < n; i += 1) arr.push(i % 7);
    const d = new SqrtDecomposition(arr);
    for (const [l, r] of [[0, 199], [50, 150], [10, 11], [100, 100], [0, 99]]) {
      expect(d.rangeSum(l, r)).toBe(bruteSum(arr, l, r));
    }
  });

  it('throws on bad inputs', () => {
    expect(() => new SqrtDecomposition(null as any)).toThrow();
    expect(() => new SqrtDecomposition([NaN])).toThrow();
    const d = new SqrtDecomposition([1, 2, 3]);
    expect(() => d.set(-1, 5)).toThrow();
    expect(() => d.set(0, NaN)).toThrow();
    expect(() => d.get(99)).toThrow();
    expect(() => d.rangeSum(2, 1)).toThrow();
    expect(() => d.rangeSum(-1, 1)).toThrow();
    expect(() => d.rangeSum(1.5 as any, 2)).toThrow();
  });

  it('handles empty array', () => {
    const d = new SqrtDecomposition([]);
    expect(d.size()).toBe(0);
    expect(() => d.rangeSum(0, 0)).toThrow();
  });

  it('negative numbers ok', () => {
    const arr = [-1, -2, -3, -4];
    const d = new SqrtDecomposition(arr);
    expect(d.rangeSum(0, 3)).toBe(-10);
    d.set(1, 5);
    expect(d.rangeSum(0, 3)).toBe(-1 + 5 - 3 - 4);
  });

  it('updates twice on same index', () => {
    const d = new SqrtDecomposition([1, 1, 1, 1, 1]);
    d.set(2, 7);
    d.set(2, 10);
    expect(d.rangeSum(0, 4)).toBe(1 + 1 + 10 + 1 + 1);
  });
});
