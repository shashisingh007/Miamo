import { describe, it, expect } from 'vitest';
import { savitzkyGolayFilter } from '../savitzkyGolayFilter';

describe('savitzkyGolayFilter', () => {
  it('empty => empty', () => {
    expect(savitzkyGolayFilter([])).toEqual([]);
  });

  it('short series passes through', () => {
    expect(savitzkyGolayFilter([1, 2], { windowSize: 5 })).toEqual([1, 2]);
  });

  it('constant signal unchanged', () => {
    const out = savitzkyGolayFilter([3, 3, 3, 3, 3, 3, 3]);
    for (const v of out) expect(v).toBeCloseTo(3, 10);
  });

  it('linear signal preserved (interior)', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const out = savitzkyGolayFilter(xs, { windowSize: 5, polyOrder: 2 });
    for (let i = 2; i < xs.length - 2; i += 1) expect(out[i]).toBeCloseTo(xs[i], 8);
  });

  it('quadratic exactly fits with polyOrder 2', () => {
    const xs: number[] = [];
    for (let i = 0; i < 9; i += 1) xs.push(i * i);
    const out = savitzkyGolayFilter(xs, { windowSize: 5, polyOrder: 2 });
    for (let i = 2; i < 7; i += 1) expect(out[i]).toBeCloseTo(xs[i], 8);
  });

  it('smooths noisy signal', () => {
    const truth: number[] = [];
    const noisy: number[] = [];
    for (let i = 0; i < 50; i += 1) {
      truth.push(i);
      noisy.push(i + (i % 2 === 0 ? 0.5 : -0.5));
    }
    const out = savitzkyGolayFilter(noisy, { windowSize: 5, polyOrder: 2 });
    let smooth = 0;
    let noisySum = 0;
    for (let i = 2; i < 48; i += 1) {
      smooth += (out[i] - truth[i]) ** 2;
      noisySum += (noisy[i] - truth[i]) ** 2;
    }
    expect(smooth).toBeLessThan(noisySum);
  });

  it('edges pass through unchanged', () => {
    const xs = [10, 20, 30, 40, 50, 60, 70];
    const out = savitzkyGolayFilter(xs, { windowSize: 5, polyOrder: 2 });
    expect(out[0]).toBe(10);
    expect(out[1]).toBe(20);
    expect(out[out.length - 1]).toBe(70);
  });

  it('throws on even window', () => {
    expect(() => savitzkyGolayFilter([1, 2, 3], { windowSize: 4 })).toThrow();
  });

  it('throws on window < 3', () => {
    expect(() => savitzkyGolayFilter([1, 2, 3], { windowSize: 1 })).toThrow();
  });

  it('throws on polyOrder >= window', () => {
    expect(() => savitzkyGolayFilter([1, 2, 3, 4, 5], { windowSize: 5, polyOrder: 5 })).toThrow();
  });

  it('throws on non-finite value', () => {
    expect(() => savitzkyGolayFilter([1, NaN, 3, 4, 5])).toThrow();
  });
});
