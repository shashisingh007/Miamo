import { describe, it, expect } from 'vitest';
import { integerPartitionCount, integerPartitions } from '../integerPartitions';

describe('integerPartitionCount', () => {
  it('throws on negative', () => {
    expect(() => integerPartitionCount(-1)).toThrow(RangeError);
  });

  it('throws on non-integer', () => {
    expect(() => integerPartitionCount(1.5)).toThrow(RangeError);
  });

  it('p(0)=1', () => {
    expect(integerPartitionCount(0)).toBe(1n);
  });

  it('p(1)=1', () => {
    expect(integerPartitionCount(1)).toBe(1n);
  });

  it('p(2)=2', () => {
    expect(integerPartitionCount(2)).toBe(2n);
  });

  it('p(3)=3', () => {
    expect(integerPartitionCount(3)).toBe(3n);
  });

  it('p(4)=5', () => {
    expect(integerPartitionCount(4)).toBe(5n);
  });

  it('p(5)=7', () => {
    expect(integerPartitionCount(5)).toBe(7n);
  });

  it('p(10)=42', () => {
    expect(integerPartitionCount(10)).toBe(42n);
  });

  it('p(20)=627', () => {
    expect(integerPartitionCount(20)).toBe(627n);
  });

  it('p(50)=204226', () => {
    expect(integerPartitionCount(50)).toBe(204226n);
  });
});

describe('integerPartitions', () => {
  it('p(0)=[[]]', () => {
    expect(integerPartitions(0)).toEqual([[]]);
  });

  it('p(4) enumerated', () => {
    expect(integerPartitions(4)).toEqual([
      [4],
      [3, 1],
      [2, 2],
      [2, 1, 1],
      [1, 1, 1, 1],
    ]);
  });

  it('count matches integerPartitionCount for small n', () => {
    for (let n = 0; n <= 12; n += 1) {
      expect(BigInt(integerPartitions(n).length)).toBe(integerPartitionCount(n));
    }
  });

  it('each partition sums to n', () => {
    for (const p of integerPartitions(7)) {
      expect(p.reduce((a, b) => a + b, 0)).toBe(7);
    }
  });

  it('each partition is non-increasing', () => {
    for (const p of integerPartitions(8)) {
      for (let i = 1; i < p.length; i += 1) expect(p[i - 1]).toBeGreaterThanOrEqual(p[i]);
    }
  });

  it('throws on negative', () => {
    expect(() => integerPartitions(-1)).toThrow(RangeError);
  });
});
