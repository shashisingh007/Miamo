import { describe, it, expect } from 'vitest';
import { wignerSemicircle } from '../wignerSemicircle';

describe('wignerSemicircle', () => {
  it('throws on bad R', () => {
    expect(() => wignerSemicircle(0)).toThrow();
    expect(() => wignerSemicircle(-1)).toThrow();
    expect(() => wignerSemicircle(NaN)).toThrow();
    expect(() => wignerSemicircle(Infinity)).toThrow();
  });

  it('R is exposed', () => {
    expect(wignerSemicircle(2).R).toBe(2);
  });

  it('pdf throws on non-finite x', () => {
    const d = wignerSemicircle(1);
    expect(() => d.pdf(NaN)).toThrow();
  });

  it('cdf throws on non-finite x', () => {
    const d = wignerSemicircle(1);
    expect(() => d.cdf(NaN)).toThrow();
  });

  it('pdf zero outside support', () => {
    const d = wignerSemicircle(1);
    expect(d.pdf(-1)).toBe(0);
    expect(d.pdf(1)).toBe(0);
    expect(d.pdf(2)).toBe(0);
    expect(d.pdf(-2)).toBe(0);
  });

  it('pdf at 0 = 2/(pi R)', () => {
    const d = wignerSemicircle(1);
    expect(d.pdf(0)).toBeCloseTo(2 / Math.PI, 12);
  });

  it('pdf symmetric', () => {
    const d = wignerSemicircle(2);
    expect(d.pdf(0.5)).toBeCloseTo(d.pdf(-0.5), 12);
  });

  it('cdf at -R = 0', () => {
    const d = wignerSemicircle(1);
    expect(d.cdf(-1)).toBe(0);
    expect(d.cdf(-5)).toBe(0);
  });

  it('cdf at R = 1', () => {
    const d = wignerSemicircle(1);
    expect(d.cdf(1)).toBe(1);
    expect(d.cdf(5)).toBe(1);
  });

  it('cdf at 0 = 0.5', () => {
    const d = wignerSemicircle(3);
    expect(d.cdf(0)).toBeCloseTo(0.5, 12);
  });

  it('cdf is monotonic', () => {
    const d = wignerSemicircle(2);
    let prev = -1;
    for (let x = -2; x <= 2; x += 0.1) {
      const c = d.cdf(x);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });

  it('mean is 0', () => {
    expect(wignerSemicircle(5).mean()).toBe(0);
  });

  it('variance = R^2/4', () => {
    expect(wignerSemicircle(2).variance()).toBeCloseTo(1, 12);
    expect(wignerSemicircle(4).variance()).toBeCloseTo(4, 12);
  });

  it('pdf integrates ~ 1 by trapezoid', () => {
    const d = wignerSemicircle(1);
    const N = 10000;
    const dx = 2 / N;
    let s = 0;
    for (let i = 0; i <= N; i++) {
      const x = -1 + i * dx;
      const w = i === 0 || i === N ? 0.5 : 1;
      s += w * d.pdf(x);
    }
    expect(s * dx).toBeCloseTo(1, 3);
  });

  it('cdf-pdf consistency via finite diff', () => {
    const d = wignerSemicircle(1);
    const x = 0.3;
    const h = 1e-5;
    const num = (d.cdf(x + h) - d.cdf(x - h)) / (2 * h);
    expect(num).toBeCloseTo(d.pdf(x), 3);
  });
});
