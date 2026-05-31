import { describe, it, expect } from 'vitest';
import { chanConvexHull } from '../chanConvexHull';

function setOf(pts: { x: number; y: number }[]): Set<string> {
  return new Set(pts.map((p) => `${p.x},${p.y}`));
}

describe('chanConvexHull', () => {
  it('1 point', () => {
    const r = chanConvexHull([{ x: 0, y: 0 }]);
    expect(r).toEqual([{ x: 0, y: 0 }]);
  });

  it('2 points', () => {
    const r = chanConvexHull([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    expect(r).toHaveLength(2);
  });

  it('triangle', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];
    const r = chanConvexHull(pts);
    expect(r).toHaveLength(3);
    expect(setOf(r)).toEqual(setOf(pts));
  });

  it('square hull', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 2, y: 2 }, // interior
    ];
    const r = chanConvexHull(pts);
    expect(r).toHaveLength(4);
    expect(setOf(r)).toEqual(setOf(pts.slice(0, 4)));
  });

  it('throws on empty', () => {
    expect(() => chanConvexHull([])).toThrow();
  });

  it('throws on non-array', () => {
    expect(() => chanConvexHull('hi' as any)).toThrow();
  });

  it('returns CCW order', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ];
    const r = chanConvexHull(pts);
    let signedArea = 0;
    for (let i = 0; i < r.length; i++) {
      const a = r[i];
      const b = r[(i + 1) % r.length];
      signedArea += a.x * b.y - b.x * a.y;
    }
    expect(signedArea).toBeGreaterThan(0);
  });

  it('collinear points keep only extremes', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ];
    const r = chanConvexHull(pts);
    expect(r.length).toBeGreaterThanOrEqual(2);
    expect(r.length).toBeLessThanOrEqual(2);
  });

  it('5 points pentagon hull', () => {
    const pts = Array.from({ length: 5 }, (_, k) => {
      const a = (k * 2 * Math.PI) / 5;
      return { x: Math.cos(a), y: Math.sin(a) };
    });
    const r = chanConvexHull(pts);
    expect(r).toHaveLength(5);
  });

  it('all interior points still produce hull', () => {
    const pts = [
      { x: -10, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
      { x: 0, y: -10 },
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: -1, y: -1 },
    ];
    const r = chanConvexHull(pts);
    expect(r).toHaveLength(4);
  });

  it('larger random cluster within bbox', () => {
    const pts: { x: number; y: number }[] = [];
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < 50; i++) {
      pts.push({ x: rand() * 100, y: rand() * 100 });
    }
    const r = chanConvexHull(pts);
    for (const p of pts) {
      // each point lies on or inside hull (signed area)
      let inside = true;
      for (let i = 0; i < r.length; i++) {
        const a = r[i];
        const b = r[(i + 1) % r.length];
        const c = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        if (c < -1e-9) {
          inside = false;
          break;
        }
      }
      expect(inside).toBe(true);
    }
  });

  it('preserves hull for repeated rotations', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 3 },
    ];
    const a = chanConvexHull(pts);
    const b = chanConvexHull(pts.slice().reverse());
    expect(setOf(a)).toEqual(setOf(b));
  });

  it('axis-aligned line', () => {
    const pts = [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
    ];
    const r = chanConvexHull(pts);
    expect(r.length).toBe(2);
  });

  it('contains all extreme points', () => {
    const pts = [
      { x: -5, y: -5 },
      { x: 5, y: -5 },
      { x: 5, y: 5 },
      { x: -5, y: 5 },
      { x: 0, y: 0 },
    ];
    const r = chanConvexHull(pts);
    const s = setOf(r);
    expect(s.has('-5,-5')).toBe(true);
    expect(s.has('5,-5')).toBe(true);
    expect(s.has('5,5')).toBe(true);
    expect(s.has('-5,5')).toBe(true);
  });

  it('handles negative & positive mix', () => {
    const pts = [
      { x: -3, y: -2 },
      { x: 4, y: -1 },
      { x: 5, y: 6 },
      { x: -2, y: 7 },
      { x: 1, y: 2 },
    ];
    const r = chanConvexHull(pts);
    expect(r).toHaveLength(4);
  });

  it('handles many collinear plus outlier', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 1, y: 5 },
    ];
    const r = chanConvexHull(pts);
    expect(r).toHaveLength(3);
  });
});
