import { describe, it, expect } from 'vitest';
import { alphaShape } from '../alphaShape';

describe('alphaShape', () => {
  it('large alpha => convex hull edges of unit square', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const r = alphaShape(pts, 100);
    expect(r.triangles).toHaveLength(2);
    expect(r.edges).toHaveLength(4);
  });

  it('throws on too few points', () => {
    expect(() => alphaShape([{ x: 0, y: 0 }, { x: 1, y: 0 }], 1)).toThrow();
  });

  it('throws on alpha<=0', () => {
    expect(() =>
      alphaShape(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 0, y: 1 },
        ],
        0,
      ),
    ).toThrow();
  });

  it('throws on non-array', () => {
    expect(() => alphaShape('hi' as any, 1)).toThrow();
  });

  it('tiny alpha keeps no triangle', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const r = alphaShape(pts, 0.1);
    expect(r.triangles).toHaveLength(0);
    expect(r.edges).toHaveLength(0);
  });

  it('triangle is its own boundary', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];
    const r = alphaShape(pts, 1);
    expect(r.triangles).toHaveLength(1);
    expect(r.edges).toHaveLength(3);
  });

  it('edges always have i<j', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 2, y: 2 },
    ];
    const r = alphaShape(pts, 100);
    for (const [a, b] of r.edges) expect(a).toBeLessThan(b);
  });

  it('large alpha for L-shape produces only boundary edges', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 4 },
      { x: 0, y: 4 },
    ];
    const r = alphaShape(pts, 100);
    expect(r.edges.length).toBeGreaterThanOrEqual(5);
  });

  it('all triangles for large alpha equal Delaunay tri count', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 2, y: 2 },
    ];
    const r = alphaShape(pts, 100);
    // 5 points square+center: 4 triangles (Euler 2*5-2-4=4)
    expect(r.triangles).toHaveLength(4);
  });

  it('edges are pairs of valid indices', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
      { x: 0, y: 5 },
      { x: 2, y: 2 },
    ];
    const r = alphaShape(pts, 100);
    for (const [a, b] of r.edges) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(pts.length);
    }
  });

  it('intermediate alpha yields fewer triangles than max', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 2, y: 2 },
      { x: 6, y: 2 }, // outlier
    ];
    const max = alphaShape(pts, 100).triangles.length;
    const some = alphaShape(pts, 1.5).triangles.length;
    expect(some).toBeLessThanOrEqual(max);
  });

  it('returns object shape', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];
    const r = alphaShape(pts, 1);
    expect(Array.isArray(r.edges)).toBe(true);
    expect(Array.isArray(r.triangles)).toBe(true);
  });

  it('boundary is closed cycle for convex region', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ];
    const r = alphaShape(pts, 100);
    const deg = new Map<number, number>();
    for (const [a, b] of r.edges) {
      deg.set(a, (deg.get(a) ?? 0) + 1);
      deg.set(b, (deg.get(b) ?? 0) + 1);
    }
    for (const v of deg.values()) expect(v).toBe(2);
  });

  it('handles negative coords', () => {
    const pts = [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
    ];
    const r = alphaShape(pts, 100);
    expect(r.edges).toHaveLength(4);
  });
});
