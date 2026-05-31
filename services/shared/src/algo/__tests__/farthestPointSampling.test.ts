import { describe, it, expect } from 'vitest';
import { farthestPointSampling } from '../farthestPointSampling';

describe('farthestPointSampling', () => {
  it('k=0 returns empty', () => {
    expect(farthestPointSampling([{ x: 0, y: 0 }], 0)).toEqual([]);
  });

  it('k=1 returns startIndex', () => {
    expect(farthestPointSampling([{ x: 0, y: 0 }, { x: 1, y: 1 }], 1, 1)).toEqual([1]);
  });

  it('picks farthest second point on a line', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    ];
    const r = farthestPointSampling(pts, 2, 0);
    expect(r).toEqual([0, 3]);
  });

  it('picks square corners for k=4 from grid', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 5, y: 5 },
    ];
    const r = farthestPointSampling(pts, 4, 0);
    expect(new Set(r)).toEqual(new Set([0, 1, 2, 3]));
  });

  it('selected indices are unique', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
      { x: 3, y: 4 },
      { x: -2, y: -3 },
    ];
    const r = farthestPointSampling(pts, 4, 0);
    expect(new Set(r).size).toBe(4);
  });

  it('rejects negative k', () => {
    expect(() => farthestPointSampling([{ x: 0, y: 0 }], -1)).toThrow();
  });

  it('rejects k larger than n', () => {
    expect(() => farthestPointSampling([{ x: 0, y: 0 }], 5)).toThrow();
  });

  it('rejects bad start index', () => {
    expect(() => farthestPointSampling([{ x: 0, y: 0 }, { x: 1, y: 1 }], 1, 5)).toThrow();
  });

  it('greedy ordering: each new point increases coverage', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      { x: 50, y: 50 },
    ];
    const r = farthestPointSampling(pts, 3, 0);
    expect(r[0]).toBe(0);
    // Second pick must be a far corner.
    expect([1, 2, 3]).toContain(r[1]);
  });

  it('picks all points when k equals n', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ];
    const r = farthestPointSampling(pts, 3, 0);
    expect(new Set(r)).toEqual(new Set([0, 1, 2]));
  });

  it('default startIndex is 0', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
    ];
    expect(farthestPointSampling(pts, 1)).toEqual([0]);
  });
});
