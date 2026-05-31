import { describe, it, expect } from 'vitest';
import { KdTreeNearestNeighbor } from '../kdTreeNearestNeighbor';

describe('KdTreeNearestNeighbor', () => {
  it('throws on dim 0', () => {
    expect(() => new KdTreeNearestNeighbor([], 0)).toThrow(RangeError);
  });

  it('throws on point dim mismatch', () => {
    expect(() => new KdTreeNearestNeighbor([{ coords: [1, 2] }], 3)).toThrow(RangeError);
  });

  it('empty tree => null nearest', () => {
    const t = new KdTreeNearestNeighbor([], 2);
    expect(t.nearest([0, 0])).toBeNull();
  });

  it('single point', () => {
    const t = new KdTreeNearestNeighbor([{ coords: [3, 4] }], 2);
    const r = t.nearest([0, 0])!;
    expect(r.distance).toBeCloseTo(5);
  });

  it('finds nearest in 2D', () => {
    const t = new KdTreeNearestNeighbor([
      { coords: [2, 3] }, { coords: [5, 4] }, { coords: [9, 6] },
      { coords: [4, 7] }, { coords: [8, 1] }, { coords: [7, 2] },
    ], 2);
    const r = t.nearest([9, 2])!;
    expect(r.point.coords).toEqual([8, 1]);
  });

  it('3D nearest', () => {
    const t = new KdTreeNearestNeighbor([
      { coords: [0, 0, 0] }, { coords: [1, 1, 1] }, { coords: [5, 5, 5] },
    ], 3);
    const r = t.nearest([1.1, 1.1, 1.1])!;
    expect(r.point.coords).toEqual([1, 1, 1]);
  });

  it('throws on query dim mismatch', () => {
    const t = new KdTreeNearestNeighbor([{ coords: [1, 2] }], 2);
    expect(() => t.nearest([0])).toThrow(RangeError);
  });

  it('k=0 nearest => []', () => {
    const t = new KdTreeNearestNeighbor([{ coords: [1, 2] }], 2);
    expect(t.kNearest([0, 0], 0)).toEqual([]);
  });

  it('throws on negative k', () => {
    const t = new KdTreeNearestNeighbor([{ coords: [1, 2] }], 2);
    expect(() => t.kNearest([0, 0], -1)).toThrow(RangeError);
  });

  it('k=2 returns 2 sorted', () => {
    const t = new KdTreeNearestNeighbor([
      { coords: [0, 0] }, { coords: [1, 0] }, { coords: [10, 10] },
    ], 2);
    const r = t.kNearest([0.5, 0], 2);
    expect(r).toHaveLength(2);
    expect(r[0].distance).toBeLessThanOrEqual(r[1].distance);
  });

  it('k > size returns all', () => {
    const t = new KdTreeNearestNeighbor([
      { coords: [0, 0] }, { coords: [1, 0] },
    ], 2);
    expect(t.kNearest([0, 0], 10)).toHaveLength(2);
  });

  it('payload preserved', () => {
    const t = new KdTreeNearestNeighbor([
      { coords: [3, 4], payload: 'A' },
    ], 2);
    const r = t.nearest([3, 4])!;
    expect(r.point.payload).toBe('A');
  });

  it('coincident point => distance 0', () => {
    const t = new KdTreeNearestNeighbor([
      { coords: [1, 2] }, { coords: [3, 4] },
    ], 2);
    expect(t.nearest([3, 4])!.distance).toBe(0);
  });

  it('handles 50 random points correctly', () => {
    const pts = [] as { coords: number[] }[];
    let seed = 1234;
    for (let i = 0; i < 50; i++) {
      seed = (seed * 1103515245 + 12345) % (2 ** 31);
      const x = seed % 100;
      seed = (seed * 1103515245 + 12345) % (2 ** 31);
      const y = seed % 100;
      pts.push({ coords: [x, y] });
    }
    const t = new KdTreeNearestNeighbor(pts, 2);
    const q = [50, 50];
    const r = t.nearest(q)!;
    let bruteBest = Infinity;
    for (const p of pts) {
      const d = Math.hypot(p.coords[0] - q[0], p.coords[1] - q[1]);
      if (d < bruteBest) bruteBest = d;
    }
    expect(r.distance).toBeCloseTo(bruteBest, 9);
  });
});
