import { describe, it, expect } from 'vitest';
import { isotonicRegression } from '../isotonicRegression';

function isMonotone(y: number[]): boolean {
  for (let i = 1; i < y.length; i++) if (y[i] < y[i - 1] - 1e-12) return false;
  return true;
}

describe('isotonicRegression', () => {
  it('throws on empty', () => {
    expect(() => isotonicRegression([])).toThrow();
  });

  it('throws on length mismatch', () => {
    expect(() => isotonicRegression([1, 2], [1])).toThrow();
  });

  it('throws on non-positive weights', () => {
    expect(() => isotonicRegression([1, 2], [1, 0])).toThrow();
    expect(() => isotonicRegression([1, 2], [-1, 1])).toThrow();
  });

  it('already monotone', () => {
    const y = isotonicRegression([1, 2, 3, 4]);
    expect(y).toEqual([1, 2, 3, 4]);
  });

  it('strictly decreasing => constant mean', () => {
    const y = isotonicRegression([4, 3, 2, 1]);
    for (const v of y) expect(v).toBeCloseTo(2.5, 10);
  });

  it('single violation pools', () => {
    const y = isotonicRegression([1, 3, 2, 4]);
    // 3 and 2 average to 2.5
    expect(y[0]).toBeCloseTo(1, 10);
    expect(y[1]).toBeCloseTo(2.5, 10);
    expect(y[2]).toBeCloseTo(2.5, 10);
    expect(y[3]).toBeCloseTo(4, 10);
  });

  it('output is monotone non-decreasing', () => {
    expect(isMonotone(isotonicRegression([5, 1, 4, 2, 3]))).toBe(true);
  });

  it('preserves length', () => {
    expect(isotonicRegression([3, 1, 2])).toHaveLength(3);
  });

  it('constant input', () => {
    const y = isotonicRegression([7, 7, 7]);
    for (const v of y) expect(v).toBe(7);
  });

  it('uses weights', () => {
    // [3, 1] with weights [1, 1] => mean 2, 2
    // [3, 1] with weights [3, 1] => weighted mean = (3*3 + 1*1)/4 = 2.5
    const y1 = isotonicRegression([3, 1], [1, 1]);
    expect(y1[0]).toBeCloseTo(2, 10);
    const y2 = isotonicRegression([3, 1], [3, 1]);
    expect(y2[0]).toBeCloseTo(2.5, 10);
  });

  it('does not mutate input', () => {
    const y = [3, 1, 2];
    const w = [1, 1, 1];
    const yref = y.slice();
    const wref = w.slice();
    isotonicRegression(y, w);
    expect(y).toEqual(yref);
    expect(w).toEqual(wref);
  });

  it('1-element', () => {
    expect(isotonicRegression([5])).toEqual([5]);
  });

  it('multi-block pool', () => {
    const y = isotonicRegression([1, 5, 4, 3, 2, 6]);
    // First the 5,4,3,2 must pool together with 1 if needed
    // With y=1,5,4,3,2,6: after 1 push 1; push 5 (mean 5); push 4 (4<5 merge) => mean 4.5;
    // push 3 (3<4.5 merge) => mean 4; push 2 (2<4 merge) => mean 3.5;
    // After: blocks [1], [5,4,3,2 mean 3.5]. But 3.5 > 1 so OK.
    // push 6: 6 > 3.5, push.
    expect(y[0]).toBeCloseTo(1, 10);
    for (let i = 1; i <= 4; i++) expect(y[i]).toBeCloseTo(3.5, 10);
    expect(y[5]).toBeCloseTo(6, 10);
  });

  it('idempotent on monotone data', () => {
    const y = [1, 2, 2, 3, 5];
    const r1 = isotonicRegression(y);
    const r2 = isotonicRegression(r1);
    for (let i = 0; i < y.length; i++) expect(r2[i]).toBeCloseTo(r1[i], 10);
  });

  it('handles negative values', () => {
    const y = isotonicRegression([-1, -5, -3]);
    expect(isMonotone(y)).toBe(true);
  });

  it('weighted reduces to mean of pool', () => {
    // [3, 1, 2] weights [1, 2, 1]: 
    // push 3; push 1 (1 < 3 merge) wsum=2*1+3=5, w=3, mean=5/3;
    // push 2 (2 > 5/3? 2 > 1.667 yes) — push.
    const y = isotonicRegression([3, 1, 2], [1, 2, 1]);
    expect(y[0]).toBeCloseTo(5 / 3, 10);
    expect(y[1]).toBeCloseTo(5 / 3, 10);
    expect(y[2]).toBeCloseTo(2, 10);
  });
});
