import { describe, it, expect } from 'vitest';
import { loessSmooth } from '../loessSmooth';

describe('loessSmooth', () => {
  it('linear data => unchanged', () => {
    const x = Array.from({ length: 20 }, (_, i) => i);
    const y = x.map((v) => 2 * v + 1);
    const r = loessSmooth(x, y, { bandwidth: 0.5 });
    for (let i = 0; i < x.length; i++) {
      expect(r[i]).toBeCloseTo(y[i], 6);
    }
  });

  it('constant data => constant', () => {
    const x = Array.from({ length: 10 }, (_, i) => i);
    const y = x.map(() => 5);
    const r = loessSmooth(x, y, { bandwidth: 0.5 });
    for (const v of r) expect(v).toBeCloseTo(5, 9);
  });

  it('reduces noise on smooth signal', () => {
    const x = Array.from({ length: 50 }, (_, i) => i / 10);
    const truth = x.map((v) => Math.sin(v));
    const noise = x.map((_, i) => (i % 2 === 0 ? 0.2 : -0.2));
    const y = truth.map((t, i) => t + noise[i]);
    const r = loessSmooth(x, y, { bandwidth: 0.4 });
    let raw = 0;
    let smoothed = 0;
    for (let i = 0; i < x.length; i++) {
      raw += (y[i] - truth[i]) ** 2;
      smoothed += (r[i] - truth[i]) ** 2;
    }
    expect(smoothed).toBeLessThan(raw);
  });

  it('throws on length mismatch', () => {
    expect(() => loessSmooth([0, 1], [0])).toThrow();
  });

  it('throws on n<2', () => {
    expect(() => loessSmooth([0], [0])).toThrow();
  });

  it('throws on non-monotonic x', () => {
    expect(() => loessSmooth([0, 2, 1], [0, 1, 2])).toThrow();
  });

  it('throws on bad bandwidth (zero)', () => {
    expect(() => loessSmooth([0, 1], [0, 1], { bandwidth: 0 })).toThrow();
  });

  it('throws on bad bandwidth (>1)', () => {
    expect(() => loessSmooth([0, 1], [0, 1], { bandwidth: 1.1 })).toThrow();
  });

  it('throws on bad robustnessIters', () => {
    expect(() => loessSmooth([0, 1], [0, 1], { robustnessIters: -1 })).toThrow();
  });

  it('robustness iter reduces outlier impact', () => {
    const x = Array.from({ length: 21 }, (_, i) => i);
    const y = x.map((v) => v);
    y[10] = 100; // outlier
    const r = loessSmooth(x, y, { bandwidth: 0.4, robustnessIters: 3 });
    // After robustness, point 10 should be pulled near linear trend ~10
    expect(Math.abs(r[10] - 10)).toBeLessThan(20);
  });

  it('bandwidth=1 => global linear regression', () => {
    const x = Array.from({ length: 10 }, (_, i) => i);
    const y = x.map((v) => 3 * v - 2);
    const r = loessSmooth(x, y, { bandwidth: 1 });
    for (let i = 0; i < x.length; i++) expect(r[i]).toBeCloseTo(y[i], 6);
  });

  it('output length matches input', () => {
    const x = Array.from({ length: 7 }, (_, i) => i);
    const y = x.map((v) => v * v);
    const r = loessSmooth(x, y, { bandwidth: 0.5 });
    expect(r).toHaveLength(7);
  });

  it('passes through with bandwidth tiny gives close-to-y', () => {
    const x = Array.from({ length: 10 }, (_, i) => i);
    const y = [0, 1, 4, 9, 16, 25, 36, 49, 64, 81];
    const r = loessSmooth(x, y, { bandwidth: 0.2 });
    for (let i = 1; i < x.length - 1; i++) {
      expect(Math.abs(r[i] - y[i])).toBeLessThan(2);
    }
  });

  it('handles equal x ties', () => {
    const x = [0, 0, 1, 1, 2, 2];
    const y = [0, 1, 2, 3, 4, 5];
    const r = loessSmooth(x, y, { bandwidth: 0.6 });
    expect(r).toHaveLength(6);
    for (const v of r) expect(Number.isFinite(v)).toBe(true);
  });

  it('robustness=0 still works', () => {
    const x = [0, 1, 2, 3, 4];
    const y = [0, 1, 2, 3, 4];
    const r = loessSmooth(x, y, { bandwidth: 0.6, robustnessIters: 0 });
    for (let i = 0; i < x.length; i++) expect(r[i]).toBeCloseTo(y[i], 6);
  });

  it('symmetric data => symmetric output', () => {
    const x = [-2, -1, 0, 1, 2];
    const y = [4, 1, 0, 1, 4];
    const r = loessSmooth(x, y, { bandwidth: 0.8 });
    expect(r[0]).toBeCloseTo(r[4], 6);
    expect(r[1]).toBeCloseTo(r[3], 6);
  });
});
