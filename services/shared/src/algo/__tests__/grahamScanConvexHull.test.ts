import { describe, it, expect } from 'vitest';
import { grahamScanConvexHull, type Point2D } from '../grahamScanConvexHull';

describe('grahamScanConvexHull', () => {
  it('empty => []', () => {
    expect(grahamScanConvexHull([])).toEqual([]);
  });

  it('single point', () => {
    expect(grahamScanConvexHull([{ x: 1, y: 1 }])).toEqual([{ x: 1, y: 1 }]);
  });

  it('two points => both', () => {
    const h = grahamScanConvexHull([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    expect(h).toHaveLength(2);
  });

  it('triangle => 3 points', () => {
    const h = grahamScanConvexHull([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 2, y: 3 },
    ]);
    expect(h).toHaveLength(3);
  });

  it('square with interior point => 4', () => {
    const h = grahamScanConvexHull([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 2, y: 2 },
    ]);
    expect(h).toHaveLength(4);
  });

  it('collinear points keep only extremes', () => {
    const h = grahamScanConvexHull([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
    expect(h).toHaveLength(2);
  });

  it('duplicates collapsed', () => {
    const h = grahamScanConvexHull([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]);
    expect(h).toHaveLength(3);
  });

  it('starts at lowest-y, then lowest-x', () => {
    const h = grahamScanConvexHull([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 },
    ]);
    expect(h[0]).toEqual({ x: 0, y: 0 });
  });

  it('counterclockwise orientation', () => {
    const h = grahamScanConvexHull([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ]);
    expect(h).toHaveLength(4);
    let area = 0;
    for (let i = 0; i < h.length; i++) {
      const j = (i + 1) % h.length;
      area += h[i].x * h[j].y - h[j].x * h[i].y;
    }
    expect(area).toBeGreaterThan(0);
  });

  it('star pattern => 5 outer points', () => {
    const h = grahamScanConvexHull([
      { x: 0, y: 5 },
      { x: 2, y: 2 },
      { x: 5, y: 1 },
      { x: 2, y: -1 },
      { x: 0, y: -3 },
      { x: -2, y: -1 },
      { x: -5, y: 1 },
      { x: -2, y: 2 },
      { x: 0, y: 0 },
    ]);
    expect(h.length).toBeGreaterThanOrEqual(4);
  });

  it('large random-ish set returns subset', () => {
    const pts: Point2D[] = [];
    for (let i = 0; i < 50; i++) {
      pts.push({ x: Math.cos((i * Math.PI) / 25) * 10, y: Math.sin((i * Math.PI) / 25) * 10 });
    }
    pts.push({ x: 0, y: 0 });
    const h = grahamScanConvexHull(pts);
    expect(h.length).toBeGreaterThan(10);
    expect(h.find((p) => p.x === 0 && p.y === 0)).toBeUndefined();
  });
});
