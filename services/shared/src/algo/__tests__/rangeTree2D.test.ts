import { describe, it, expect } from 'vitest';
import { rangeTree2D, RangeTree2D, type Point2D } from '../rangeTree2D';

const sample: Point2D[] = [
  { x: 1, y: 1 },
  { x: 2, y: 5 },
  { x: 3, y: 3 },
  { x: 4, y: 2 },
  { x: 5, y: 4 },
];

describe('rangeTree2D', () => {
  it('factory + class', () => {
    expect(rangeTree2D(sample) instanceof RangeTree2D).toBe(true);
  });

  it('throws on non-array', () => {
    expect(() => rangeTree2D(123 as any)).toThrow();
  });

  it('empty tree returns []/0', () => {
    const t = rangeTree2D([]);
    expect(t.rangeReport(0, 10, 0, 10)).toEqual([]);
    expect(t.rangeCount(0, 10, 0, 10)).toBe(0);
  });

  it('full-range report = all points', () => {
    const t = rangeTree2D(sample);
    const r = t.rangeReport(0, 10, 0, 10);
    expect(r).toHaveLength(5);
  });

  it('full-range count = n', () => {
    expect(rangeTree2D(sample).rangeCount(0, 10, 0, 10)).toBe(5);
  });

  it('exact point hit', () => {
    const t = rangeTree2D(sample);
    expect(t.rangeReport(3, 3, 3, 3)).toEqual([{ x: 3, y: 3 }]);
    expect(t.rangeCount(3, 3, 3, 3)).toBe(1);
  });

  it('partial box', () => {
    const t = rangeTree2D(sample);
    const r = t.rangeReport(2, 4, 2, 5);
    expect(r).toHaveLength(3);
    expect(t.rangeCount(2, 4, 2, 5)).toBe(3);
  });

  it('empty box', () => {
    const t = rangeTree2D(sample);
    expect(t.rangeReport(10, 20, 10, 20)).toEqual([]);
    expect(t.rangeCount(10, 20, 10, 20)).toBe(0);
  });

  it('inverted ranges => 0', () => {
    const t = rangeTree2D(sample);
    expect(t.rangeReport(5, 0, 0, 5)).toEqual([]);
    expect(t.rangeCount(0, 5, 5, 0)).toBe(0);
  });

  it('duplicate points', () => {
    const t = rangeTree2D([
      { x: 1, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
    expect(t.rangeCount(1, 1, 1, 1)).toBe(2);
  });

  it('matches brute force on 100 random points', () => {
    const pts: Point2D[] = [];
    for (let i = 0; i < 100; i += 1) {
      pts.push({ x: Math.floor(Math.random() * 50), y: Math.floor(Math.random() * 50) });
    }
    const t = rangeTree2D(pts);
    for (let q = 0; q < 20; q += 1) {
      const x1 = Math.floor(Math.random() * 50);
      const x2 = x1 + Math.floor(Math.random() * 20);
      const y1 = Math.floor(Math.random() * 50);
      const y2 = y1 + Math.floor(Math.random() * 20);
      const brute = pts.filter((p) => p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2).length;
      expect(t.rangeCount(x1, x2, y1, y2)).toBe(brute);
    }
  });
});
