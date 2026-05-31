import { describe, it, expect } from 'vitest';
import { VpTreeMetric } from '../vpTreeMetric';

const euclid = (a: [number, number], b: [number, number]): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('VpTreeMetric', () => {
  it('throws on bad input', () => {
    expect(() => new VpTreeMetric(null as any, euclid)).toThrow(TypeError);
    expect(() => new VpTreeMetric([], null as any)).toThrow(TypeError);
  });

  it('empty tree knn returns []', () => {
    const t = new VpTreeMetric<[number, number]>([], euclid);
    expect(t.knn([0, 0], 3)).toEqual([]);
  });

  it('knn throws on bad k', () => {
    const t = new VpTreeMetric<[number, number]>([[0, 0]], euclid);
    expect(() => t.knn([0, 0], 0)).toThrow(RangeError);
    expect(() => t.knn([0, 0], -1)).toThrow(RangeError);
    expect(() => t.knn([0, 0], 1.5)).toThrow(RangeError);
  });

  it('single point knn', () => {
    const t = new VpTreeMetric<[number, number]>([[1, 1]], euclid);
    const r = t.knn([0, 0], 3);
    expect(r).toHaveLength(1);
    expect(r[0].point).toEqual([1, 1]);
  });

  it('knn returns closest', () => {
    const pts: [number, number][] = [
      [0, 0],
      [10, 10],
      [1, 1],
      [5, 5],
    ];
    const t = new VpTreeMetric(pts, euclid, { rng: mulberry32(1) });
    const r = t.knn([0, 0], 2);
    expect(r[0].point).toEqual([0, 0]);
    expect(r[1].point).toEqual([1, 1]);
  });

  it('knn sorted by distance ascending', () => {
    const pts: [number, number][] = Array.from({ length: 50 }, (_, i) => [i, 0] as [number, number]);
    const t = new VpTreeMetric(pts, euclid, { rng: mulberry32(2) });
    const r = t.knn([0, 0], 10);
    for (let i = 1; i < r.length; i += 1) {
      expect(r[i].distance).toBeGreaterThanOrEqual(r[i - 1].distance);
    }
  });

  it('knn matches brute force', () => {
    const rng = mulberry32(3);
    const pts: [number, number][] = Array.from({ length: 60 }, () => [rng() * 100, rng() * 100]);
    const t = new VpTreeMetric(pts, euclid, { rng: mulberry32(4) });
    const q: [number, number] = [50, 50];
    const brute = pts
      .map((p) => ({ point: p, distance: euclid(q, p) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
    const tree = t.knn(q, 5);
    for (let i = 0; i < 5; i += 1) {
      expect(tree[i].distance).toBeCloseTo(brute[i].distance, 9);
    }
  });

  it('withinRadius throws on bad radius', () => {
    const t = new VpTreeMetric<[number, number]>([[0, 0]], euclid);
    expect(() => t.withinRadius([0, 0], -1)).toThrow(RangeError);
    expect(() => t.withinRadius([0, 0], NaN)).toThrow(RangeError);
  });

  it('withinRadius basic', () => {
    const pts: [number, number][] = [
      [0, 0],
      [1, 0],
      [10, 10],
      [-1, -1],
    ];
    const t = new VpTreeMetric(pts, euclid, { rng: mulberry32(5) });
    const r = t.withinRadius([0, 0], 2);
    expect(r.length).toBe(3);
  });

  it('withinRadius empty tree', () => {
    const t = new VpTreeMetric<[number, number]>([], euclid);
    expect(t.withinRadius([0, 0], 5)).toEqual([]);
  });

  it('size reflects build', () => {
    const t = new VpTreeMetric<[number, number]>([[1, 1], [2, 2]], euclid);
    expect(t.size).toBe(2);
  });

  it('knn with k > size returns all', () => {
    const pts: [number, number][] = [[0, 0], [1, 1]];
    const t = new VpTreeMetric(pts, euclid, { rng: mulberry32(6) });
    const r = t.knn([0, 0], 10);
    expect(r).toHaveLength(2);
  });

  it('handles duplicate points', () => {
    const pts: [number, number][] = [
      [0, 0],
      [0, 0],
      [0, 0],
      [1, 1],
    ];
    const t = new VpTreeMetric(pts, euclid, { rng: mulberry32(7) });
    const r = t.knn([0, 0], 4);
    expect(r).toHaveLength(4);
    expect(r[0].distance).toBe(0);
  });

  it('matches brute force on radius', () => {
    const rng = mulberry32(8);
    const pts: [number, number][] = Array.from({ length: 80 }, () => [rng() * 50, rng() * 50]);
    const t = new VpTreeMetric(pts, euclid, { rng: mulberry32(9) });
    const q: [number, number] = [25, 25];
    const radius = 10;
    const brute = pts.filter((p) => euclid(q, p) <= radius).length;
    const tree = t.withinRadius(q, radius).length;
    expect(tree).toBe(brute);
  });

  it('non-euclidean metric works (Manhattan)', () => {
    const man = (a: [number, number], b: [number, number]): number =>
      Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    const pts: [number, number][] = [[0, 0], [3, 4], [10, 10]];
    const t = new VpTreeMetric(pts, man, { rng: mulberry32(10) });
    const r = t.knn([0, 0], 2);
    expect(r[0].point).toEqual([0, 0]);
    expect(r[1].point).toEqual([3, 4]);
  });
});
