import { describe, it, expect } from 'vitest';
import { monotoneChainConvexHull, Point2 } from '../monotoneChainConvexHull';

function pointsEqual(a: Point2, b: Point2) {
  return a.x === b.x && a.y === b.y;
}

function hullArea(hull: Point2[]): number {
  let s = 0;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    s += a.x * b.y - a.y * b.x;
  }
  return Math.abs(s) / 2;
}

describe('monotoneChainConvexHull', () => {
  it('empty', () => {
    expect(monotoneChainConvexHull([])).toEqual([]);
  });

  it('single point', () => {
    expect(monotoneChainConvexHull([{ x: 1, y: 2 }])).toEqual([{ x: 1, y: 2 }]);
  });

  it('two points', () => {
    const r = monotoneChainConvexHull([
      { x: 1, y: 1 },
      { x: 3, y: 3 },
    ]);
    expect(r).toHaveLength(2);
  });

  it('triangle returns 3 vertices', () => {
    const r = monotoneChainConvexHull([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 },
    ]);
    expect(r).toHaveLength(3);
    expect(hullArea(r)).toBe(2);
  });

  it('square excludes interior point', () => {
    const r = monotoneChainConvexHull([
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
    const r = monotoneChainConvexHull([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 },
    ]);
    expect(r).toHaveLength(3);
  });

  it('handles duplicates', () => {
    const r = monotoneChainConvexHull([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 },
    ]);
    expect(r).toHaveLength(3);
  });

  it('counter-clockwise orientation', () => {
    const r = monotoneChainConvexHull([
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
    const r = monotoneChainConvexHull([
      { x: 0, y: 4 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 0 },
    ]);
    expect(pointsEqual(r[0], { x: 0, y: 0 })).toBe(true);
  });

  it('hexagon', () => {
    const r = monotoneChainConvexHull([
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

  it('all collinear -> two endpoints', () => {
    const r = monotoneChainConvexHull([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]);
    expect(r).toHaveLength(2);
  });
});
