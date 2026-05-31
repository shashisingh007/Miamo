import { describe, it, expect } from 'vitest';
import { bowyerWatsonDelaunay } from '../bowyerWatsonDelaunay';

describe('bowyerWatsonDelaunay', () => {
  it('triangle on 3 points => 1 triangle', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];
    const tris = bowyerWatsonDelaunay(pts);
    expect(tris).toHaveLength(1);
    const v = tris[0];
    expect(new Set(v)).toEqual(new Set([0, 1, 2]));
  });

  it('square => 2 triangles', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const tris = bowyerWatsonDelaunay(pts);
    expect(tris).toHaveLength(2);
  });

  it('all triangles are 3-valid indices', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
      { x: 0, y: 5 },
      { x: 2.5, y: 2.5 },
    ];
    const tris = bowyerWatsonDelaunay(pts);
    for (const t of tris) {
      expect(t).toHaveLength(3);
      for (const i of t) expect(i).toBeGreaterThanOrEqual(0);
      for (const i of t) expect(i).toBeLessThan(pts.length);
      const set = new Set(t);
      expect(set.size).toBe(3);
    }
  });

  it('throws on <3 points', () => {
    expect(() => bowyerWatsonDelaunay([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toThrow();
  });

  it('throws on duplicates', () => {
    expect(() =>
      bowyerWatsonDelaunay([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toThrow();
  });

  it('throws on collinear', () => {
    expect(() =>
      bowyerWatsonDelaunay([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]),
    ).toThrow();
  });

  it('throws on non-array', () => {
    expect(() => bowyerWatsonDelaunay('hi' as any)).toThrow();
  });

  it('Euler relation for triangulation: t = 2n - 2 - h (planar)', () => {
    // For 4 points in convex position, t=2, hull h=4 → 2n-2-h = 2. ✓
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const tris = bowyerWatsonDelaunay(pts);
    expect(tris.length).toBe(2 * 4 - 2 - 4);
  });

  it('5-point convex pentagon => 3 triangles', () => {
    const pts = Array.from({ length: 5 }, (_, k) => {
      const a = (k * 2 * Math.PI) / 5;
      return { x: Math.cos(a), y: Math.sin(a) };
    });
    const tris = bowyerWatsonDelaunay(pts);
    expect(tris).toHaveLength(3);
  });

  it('point + triangle interior => 3 triangles', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 2, y: 4 },
      { x: 2, y: 1 },
    ];
    const tris = bowyerWatsonDelaunay(pts);
    expect(tris).toHaveLength(3);
  });

  it('Delaunay property: no point inside any circumcircle', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 2, y: 3 },
    ];
    const tris = bowyerWatsonDelaunay(pts);
    for (const t of tris) {
      const A = pts[t[0]];
      const B = pts[t[1]];
      const C = pts[t[2]];
      // circumcircle test for each other point
      for (let k = 0; k < pts.length; k++) {
        if (k === t[0] || k === t[1] || k === t[2]) continue;
        const p = pts[k];
        const ax = A.x - p.x;
        const ay = A.y - p.y;
        const bx = B.x - p.x;
        const by = B.y - p.y;
        const cx = C.x - p.x;
        const cy = C.y - p.y;
        let det =
          (ax * ax + ay * ay) * (bx * cy - by * cx) -
          (bx * bx + by * by) * (ax * cy - ay * cx) +
          (cx * cx + cy * cy) * (ax * by - ay * bx);
        // ensure CCW orientation; if CW, det sign flips
        const orient = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
        if (orient < 0) det = -det;
        expect(det).toBeLessThanOrEqual(1e-9);
      }
    }
  });

  it('handles negative coords', () => {
    const pts = [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
    ];
    const tris = bowyerWatsonDelaunay(pts);
    expect(tris).toHaveLength(2);
  });

  it('linear point cloud handled (random with jitter)', () => {
    const pts = Array.from({ length: 8 }, (_, i) => ({ x: i, y: (i * 7) % 5 }));
    const tris = bowyerWatsonDelaunay(pts);
    for (const t of tris) {
      expect(new Set(t).size).toBe(3);
    }
  });

  it('triangle count consistent for 6 random hull points', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 8, y: 4 },
      { x: 6, y: 8 },
      { x: 0, y: 8 },
      { x: -2, y: 4 },
    ];
    const tris = bowyerWatsonDelaunay(pts);
    expect(tris).toHaveLength(2 * 6 - 2 - 6);
  });
});
