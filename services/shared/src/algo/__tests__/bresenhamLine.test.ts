import { describe, it, expect } from 'vitest';
import { bresenhamLine } from '../bresenhamLine';

describe('bresenhamLine', () => {
  it('single point', () => {
    expect(bresenhamLine(3, 4, 3, 4)).toEqual([{ x: 3, y: 4 }]);
  });

  it('horizontal', () => {
    const r = bresenhamLine(0, 2, 4, 2);
    expect(r).toEqual([
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ]);
  });

  it('vertical', () => {
    const r = bresenhamLine(1, 0, 1, 3);
    expect(r).toEqual([
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
    ]);
  });

  it('diagonal +1', () => {
    const r = bresenhamLine(0, 0, 3, 3);
    expect(r).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]);
  });

  it('diagonal -1', () => {
    const r = bresenhamLine(0, 0, 3, -3);
    expect(r).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: -1 },
      { x: 2, y: -2 },
      { x: 3, y: -3 },
    ]);
  });

  it('reverse direction symmetric in length', () => {
    const f = bresenhamLine(0, 0, 7, 4);
    const b = bresenhamLine(7, 4, 0, 0);
    expect(f.length).toBe(b.length);
    expect(f[0]).toEqual({ x: 0, y: 0 });
    expect(f[f.length - 1]).toEqual({ x: 7, y: 4 });
    expect(b[0]).toEqual({ x: 7, y: 4 });
    expect(b[b.length - 1]).toEqual({ x: 0, y: 0 });
  });

  it('shallow line length is dx+1', () => {
    const r = bresenhamLine(0, 0, 5, 1);
    expect(r.length).toBe(6);
  });

  it('steep line length is dy+1', () => {
    const r = bresenhamLine(0, 0, 1, 5);
    expect(r.length).toBe(6);
  });

  it('all unit distances between consecutive pixels', () => {
    const r = bresenhamLine(0, 0, 6, 4);
    for (let i = 1; i < r.length; i++) {
      const dx = Math.abs(r[i].x - r[i - 1].x);
      const dy = Math.abs(r[i].y - r[i - 1].y);
      expect(dx).toBeLessThanOrEqual(1);
      expect(dy).toBeLessThanOrEqual(1);
      expect(dx + dy).toBeGreaterThan(0);
    }
  });

  it('rejects non-integer endpoints', () => {
    expect(() => bresenhamLine(0.5, 0, 1, 1)).toThrow();
  });

  it('mixed sign endpoints', () => {
    const r = bresenhamLine(-2, -1, 2, 3);
    expect(r[0]).toEqual({ x: -2, y: -1 });
    expect(r[r.length - 1]).toEqual({ x: 2, y: 3 });
  });
});
