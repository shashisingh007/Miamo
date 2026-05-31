import { describe, it, expect } from 'vitest';
import { QuadtreeSpatialIndex } from '../quadtreeSpatialIndex';

const B = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

describe('QuadtreeSpatialIndex', () => {
  it('throws on bad capacity', () => {
    expect(() => new QuadtreeSpatialIndex(B, 0)).toThrow(RangeError);
  });

  it('throws on bad bounds', () => {
    expect(() => new QuadtreeSpatialIndex({ minX: 5, minY: 0, maxX: 1, maxY: 1 })).toThrow(RangeError);
  });

  it('insert in bounds', () => {
    const q = new QuadtreeSpatialIndex(B);
    expect(q.insert({ x: 10, y: 10 })).toBe(true);
  });

  it('insert out of bounds => false', () => {
    const q = new QuadtreeSpatialIndex(B);
    expect(q.insert({ x: -1, y: 10 })).toBe(false);
    expect(q.insert({ x: 200, y: 10 })).toBe(false);
  });

  it('queryRange empty', () => {
    const q = new QuadtreeSpatialIndex(B);
    expect(q.queryRange(B)).toEqual([]);
  });

  it('queryRange entire bounds returns all', () => {
    const q = new QuadtreeSpatialIndex(B, 2);
    const pts = [
      { x: 1, y: 1 }, { x: 50, y: 50 }, { x: 99, y: 99 }, { x: 10, y: 80 },
    ];
    pts.forEach((p) => q.insert(p));
    const r = q.queryRange(B);
    expect(r.length).toBe(4);
  });

  it('queryRange disjoint => empty', () => {
    const q = new QuadtreeSpatialIndex(B, 2);
    q.insert({ x: 10, y: 10 });
    expect(q.queryRange({ minX: 50, minY: 50, maxX: 60, maxY: 60 })).toEqual([]);
  });

  it('queryRange filters correctly', () => {
    const q = new QuadtreeSpatialIndex(B, 2);
    for (let i = 0; i < 20; i++) q.insert({ x: i * 5, y: i * 5 });
    const r = q.queryRange({ minX: 20, minY: 20, maxX: 40, maxY: 40 });
    for (const p of r) {
      expect(p.x).toBeGreaterThanOrEqual(20);
      expect(p.x).toBeLessThanOrEqual(40);
      expect(p.y).toBeGreaterThanOrEqual(20);
      expect(p.y).toBeLessThanOrEqual(40);
    }
  });

  it('subdivision occurs after capacity', () => {
    const q = new QuadtreeSpatialIndex(B, 2);
    for (let i = 0; i < 10; i++) q.insert({ x: i, y: i });
    const r = q.queryRange(B);
    expect(r).toHaveLength(10);
  });

  it('handles 500 random-ish points', () => {
    const q = new QuadtreeSpatialIndex(B, 4);
    let seed = 1;
    let inserted = 0;
    for (let i = 0; i < 500; i++) {
      seed = (seed * 16807) % 2147483647;
      const x = seed % 100;
      seed = (seed * 16807) % 2147483647;
      const y = seed % 100;
      if (q.insert({ x, y })) inserted += 1;
    }
    expect(q.queryRange(B)).toHaveLength(inserted);
  });

  it('duplicates allowed', () => {
    const q = new QuadtreeSpatialIndex(B, 2);
    q.insert({ x: 5, y: 5 });
    q.insert({ x: 5, y: 5 });
    expect(q.queryRange({ minX: 4, minY: 4, maxX: 6, maxY: 6 })).toHaveLength(2);
  });

  it('point on boundary included', () => {
    const q = new QuadtreeSpatialIndex(B, 2);
    q.insert({ x: 0, y: 0 });
    q.insert({ x: 100, y: 100 });
    expect(q.queryRange(B)).toHaveLength(2);
  });

  it('points clustered in one quadrant', () => {
    const q = new QuadtreeSpatialIndex(B, 2);
    for (let i = 0; i < 30; i++) q.insert({ x: i % 25, y: i % 25 });
    const r = q.queryRange({ minX: 0, minY: 0, maxX: 50, maxY: 50 });
    expect(r).toHaveLength(30);
  });

  it('respects maxDepth (no infinite recursion on coincident points)', () => {
    const q = new QuadtreeSpatialIndex(B, 1, 4);
    for (let i = 0; i < 20; i++) q.insert({ x: 50, y: 50 });
    expect(q.queryRange(B)).toHaveLength(20);
  });
});
