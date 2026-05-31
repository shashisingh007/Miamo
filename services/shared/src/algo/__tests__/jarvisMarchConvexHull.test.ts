import { describe, it, expect } from 'vitest';
import { jarvisMarchConvexHull, Point2 } from '../jarvisMarchConvexHull';

function hullArea(hull: Point2[]): number {
  let s = 0;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    s += a.x * b.y - a.y * b.x;
  }
  return Math.abs(s) / 2;
}

describe('jarvisMarchConvexHull', () => {
  it('empty', () => {
    expect(jarvisMarchConvexHull([])).toEqual([]);
  });

  it('single point', () => {
    expect(jarvisMarchConvexHull([{ x: 1, y: 2 }])).toEqual([{ x: 1, y: 2 }]);
  });

  it('two points', () => {
    const r = jarvisMarchConvexHull([
      { x: 1, y: 1 },
      { x: 3, y: 3 },
    ]);
    expect(r).toHaveLength(2);
  });

  it('triangle', () => {
    const r = jarvisMarchConvexHull([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 },
    ]);
    expect(r).toHaveLength(3);
    expect(hullArea(r)).toBe(2);
  });

  it('square excludes interior', () => {
    const r = jarvisMarchConvexHull([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
      { x: 1, y: 1 },
    ]);
    expect(r).toHaveLength(4);
    expect(hullArea(r)).toBe(4);
  });

  it('collinear point excluded', () => {
    const r = jarvisMarchConvexHull([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 },
    ]);
    expect(r).toHaveLength(3);
  });

  it('handles duplicates', () => {
    const r = jarvisMarchConvexHull([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 },
    ]);
    expect(r).toHaveLength(3);
  });

  it('CCW orientation', () => {
    const r = jarvisMarchConvexHull([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ]);
    let s = 0;
    for (let i = 0; i < r.length; i++) {
      const a = r[i];
      const b = r[(i + 1) % r.length];
      s += a.x * b.y - a.y * b.x;
    }
    expect(s).toBeGreaterThan(0);
  });

  it('starts at lowest-leftmost', () => {
    const r = jarvisMarchConvexHull([
      { x: 0, y: 4 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 0 },
    ]);
    expect(r[0]).toEqual({ x: 0, y: 0 });
  });

  it('hexagon-ish', () => {
    const r = jarvisMarchConvexHull([
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 1 },
      { x: 3, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 1 },
    ]);
    expect(r).toHaveLength(6);
  });

  it('all collinear', () => {
    const r = jarvisMarchConvexHull([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
    expect(r.length).toBeGreaterThanOrEqual(1);
    expect(r.length).toBeLessThanOrEqual(2);
  });
});
