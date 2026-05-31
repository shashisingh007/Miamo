import { describe, it, expect } from 'vitest';
import { ransacLineFit, mulberry32 } from '../ransacLineFit';

describe('ransacLineFit', () => {
  it('fits clean line', () => {
    const pts = Array.from({ length: 50 }, (_, i) => ({ x: i, y: 2 * i + 1 }));
    const r = ransacLineFit(pts, { rng: mulberry32(1), threshold: 0.01 });
    expect(r.slope).toBeCloseTo(2, 9);
    expect(r.intercept).toBeCloseTo(1, 9);
    expect(r.inliers.length).toBe(50);
  });

  it('robust to outliers', () => {
    const clean = Array.from({ length: 80 }, (_, i) => ({ x: i, y: 0.5 * i - 3 }));
    const noise = [
      { x: 5, y: 100 },
      { x: 12, y: -50 },
      { x: 20, y: 80 },
      { x: 35, y: -30 },
      { x: 50, y: 90 },
    ];
    const r = ransacLineFit([...clean, ...noise], {
      iterations: 500,
      threshold: 0.5,
      rng: mulberry32(42),
    });
    expect(r.slope).toBeCloseTo(0.5, 6);
    expect(r.intercept).toBeCloseTo(-3, 6);
    expect(r.inliers.length).toBeGreaterThanOrEqual(80);
  });

  it('throws on empty input', () => {
    expect(() => ransacLineFit([], {})).toThrow();
  });

  it('throws when only 1 point', () => {
    expect(() => ransacLineFit([{ x: 0, y: 0 }], {})).toThrow();
  });

  it('throws on bad threshold', () => {
    expect(() => ransacLineFit([{ x: 0, y: 0 }, { x: 1, y: 1 }], { threshold: 0 })).toThrow();
  });

  it('throws on bad iterations', () => {
    expect(() => ransacLineFit([{ x: 0, y: 0 }, { x: 1, y: 1 }], { iterations: 0 })).toThrow();
  });

  it('throws on bad minInliers', () => {
    expect(() => ransacLineFit([{ x: 0, y: 0 }, { x: 1, y: 1 }], { minInliers: 1 })).toThrow();
  });

  it('throws when no model meets minInliers', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 100 },
      { x: 2, y: -100 },
    ];
    expect(() =>
      ransacLineFit(pts, {
        iterations: 50,
        threshold: 0.001,
        minInliers: 3,
        rng: mulberry32(7),
      }),
    ).toThrow();
  });

  it('handles 2 points exactly', () => {
    const r = ransacLineFit(
      [
        { x: 0, y: 0 },
        { x: 1, y: 3 },
      ],
      { rng: mulberry32(3) },
    );
    expect(r.slope).toBeCloseTo(3, 9);
    expect(r.intercept).toBeCloseTo(0, 9);
  });

  it('horizontal line', () => {
    const pts = Array.from({ length: 20 }, (_, i) => ({ x: i, y: 5 }));
    const r = ransacLineFit(pts, { rng: mulberry32(11), threshold: 0.001 });
    expect(r.slope).toBeCloseTo(0, 9);
    expect(r.intercept).toBeCloseTo(5, 9);
  });

  it('mulberry32 deterministic', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it('inliers indices are valid', () => {
    const pts = Array.from({ length: 30 }, (_, i) => ({ x: i, y: i }));
    const r = ransacLineFit(pts, { rng: mulberry32(9) });
    for (const idx of r.inliers) {
      expect(Number.isInteger(idx)).toBe(true);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(pts.length);
    }
  });

  it('seeded result reproducible', () => {
    const pts = [
      ...Array.from({ length: 30 }, (_, i) => ({ x: i, y: i + 0.1 * Math.sin(i) })),
      { x: 5, y: 50 },
    ];
    const a = ransacLineFit(pts, { iterations: 100, rng: mulberry32(99), threshold: 0.5 });
    const b = ransacLineFit(pts, { iterations: 100, rng: mulberry32(99), threshold: 0.5 });
    expect(a.slope).toBeCloseTo(b.slope, 12);
    expect(a.intercept).toBeCloseTo(b.intercept, 12);
  });
});
