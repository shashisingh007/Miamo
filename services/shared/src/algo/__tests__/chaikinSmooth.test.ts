import { describe, it, expect } from 'vitest';
import { chaikinSmooth } from '../chaikinSmooth';

describe('chaikinSmooth', () => {
  it('zero iterations returns copy', () => {
    const p = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    const r = chaikinSmooth(p, 0);
    expect(r).toEqual(p);
    expect(r).not.toBe(p);
  });

  it('single point unchanged', () => {
    expect(chaikinSmooth([{ x: 5, y: 5 }], 3)).toEqual([{ x: 5, y: 5 }]);
  });

  it('open polyline preserves endpoints', () => {
    const p = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    const r = chaikinSmooth(p, 2);
    expect(r[0]).toEqual({ x: 0, y: 0 });
    expect(r[r.length - 1]).toEqual({ x: 10, y: 10 });
  });

  it('open one iter doubles middle', () => {
    const p = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }];
    // Expected: keep [0,0]; segment 0->1: [(1,0),(3,0)]; segment 1->2: [(4,1),(4,3)]; keep [4,4].
    const r = chaikinSmooth(p, 1);
    expect(r).toHaveLength(6);
    expect(r[1]).toEqual({ x: 1, y: 0 });
    expect(r[2]).toEqual({ x: 3, y: 0 });
    expect(r[3]).toEqual({ x: 4, y: 1 });
    expect(r[4]).toEqual({ x: 4, y: 3 });
  });

  it('closed iteration doubles point count exactly', () => {
    const sq = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const r = chaikinSmooth(sq, 1, true);
    expect(r.length).toBe(8);
  });

  it('closed iteration smooths square corners', () => {
    const sq = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const r = chaikinSmooth(sq, 2, true);
    // No vertex equals the original sharp corners.
    for (const v of sq) {
      expect(r.some((p) => Math.abs(p.x - v.x) < 1e-9 && Math.abs(p.y - v.y) < 1e-9)).toBe(false);
    }
  });

  it('point count grows with iterations (open)', () => {
    const p = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
    const a = chaikinSmooth(p, 1).length;
    const b = chaikinSmooth(p, 2).length;
    expect(b).toBeGreaterThan(a);
  });

  it('rejects negative iterations', () => {
    expect(() => chaikinSmooth([{ x: 0, y: 0 }, { x: 1, y: 1 }], -1)).toThrow();
  });

  it('rejects non-integer iterations', () => {
    expect(() => chaikinSmooth([{ x: 0, y: 0 }, { x: 1, y: 1 }], 1.5)).toThrow();
  });

  it('output remains in convex hull of input (open)', () => {
    const p = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const r = chaikinSmooth(p, 3);
    for (const q of r) {
      expect(q.x).toBeGreaterThanOrEqual(-1e-9);
      expect(q.x).toBeLessThanOrEqual(10 + 1e-9);
      expect(q.y).toBeGreaterThanOrEqual(-1e-9);
      expect(q.y).toBeLessThanOrEqual(10 + 1e-9);
    }
  });

  it('two points one iter produces two interior points', () => {
    const r = chaikinSmooth([{ x: 0, y: 0 }, { x: 4, y: 0 }], 1);
    expect(r).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ]);
  });
});
