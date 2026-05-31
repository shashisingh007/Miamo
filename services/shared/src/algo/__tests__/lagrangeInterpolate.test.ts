import { describe, it, expect } from 'vitest';
import { lagrangeInterpolate } from '../lagrangeInterpolate';

describe('lagrangeInterpolate', () => {
  it('returns y at single point', () => {
    expect(lagrangeInterpolate([{ x: 3, y: 7 }], 3)).toBe(7);
  });

  it('linear two-point fit', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 2, y: 4 },
    ];
    expect(lagrangeInterpolate(pts, 1)).toBeCloseTo(2, 12);
  });

  it('passes through every node', () => {
    const pts = [
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 7 },
      { x: 3, y: 13 },
    ];
    for (const p of pts) {
      expect(lagrangeInterpolate(pts, p.x)).toBeCloseTo(p.y, 10);
    }
  });

  it('reproduces a quadratic exactly', () => {
    const f = (x: number) => 2 * x * x + 3 * x - 1;
    const pts = [-1, 0, 2].map((x) => ({ x, y: f(x) }));
    for (const xq of [0.5, 1.5, -0.7, 3.2]) {
      expect(lagrangeInterpolate(pts, xq)).toBeCloseTo(f(xq), 10);
    }
  });

  it('rejects empty input', () => {
    expect(() => lagrangeInterpolate([], 0)).toThrow();
  });

  it('rejects duplicate x values', () => {
    expect(() =>
      lagrangeInterpolate(
        [
          { x: 1, y: 2 },
          { x: 1, y: 3 },
        ],
        2
      )
    ).toThrow();
  });

  it('reproduces a cubic exactly', () => {
    const f = (x: number) => x ** 3 - 2 * x + 1;
    const pts = [-1, 0, 1, 2].map((x) => ({ x, y: f(x) }));
    expect(lagrangeInterpolate(pts, 1.5)).toBeCloseTo(f(1.5), 10);
  });

  it('handles negative xq', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
    ];
    expect(lagrangeInterpolate(pts, -1)).toBeCloseTo(1, 10);
  });

  it('order independent', () => {
    const a = lagrangeInterpolate(
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 4 },
      ],
      1.5
    );
    const b = lagrangeInterpolate(
      [
        { x: 2, y: 4 },
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      1.5
    );
    expect(a).toBeCloseTo(b, 12);
  });

  it('constant data returns constant', () => {
    const pts = [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 5, y: 5 },
    ];
    for (const xq of [-3, 0.5, 2.7, 100]) {
      expect(lagrangeInterpolate(pts, xq)).toBeCloseTo(5, 10);
    }
  });

  it('extrapolation works (uses polynomial value)', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    expect(lagrangeInterpolate(pts, 5)).toBeCloseTo(5, 10);
  });
});
