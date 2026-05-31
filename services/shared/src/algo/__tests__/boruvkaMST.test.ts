import { describe, it, expect } from 'vitest';
import { boruvkaMST } from '../boruvkaMST';

describe('boruvkaMST', () => {
  it('throws on invalid vertices', () => {
    expect(() => boruvkaMST(0, [])).toThrow(RangeError);
    expect(() => boruvkaMST(-1, [])).toThrow(RangeError);
    expect(() => boruvkaMST(1.5, [])).toThrow(RangeError);
  });

  it('throws on out-of-range edge', () => {
    expect(() => boruvkaMST(2, [{ u: 0, v: 5, weight: 1 }])).toThrow(RangeError);
  });

  it('throws on non-finite weight', () => {
    expect(() => boruvkaMST(2, [{ u: 0, v: 1, weight: NaN }])).toThrow(TypeError);
  });

  it('single vertex => empty MST', () => {
    expect(boruvkaMST(1, [])).toEqual({ edges: [], totalWeight: 0 });
  });

  it('disconnected components yields forest', () => {
    const r = boruvkaMST(3, [{ u: 0, v: 1, weight: 5 }]);
    expect(r.totalWeight).toBe(5);
    expect(r.edges).toHaveLength(1);
  });

  it('classic small graph (textbook example)', () => {
    // 0-1=4, 0-2=3, 1-2=1, 1-3=2, 2-3=4
    const r = boruvkaMST(4, [
      { u: 0, v: 1, weight: 4 },
      { u: 0, v: 2, weight: 3 },
      { u: 1, v: 2, weight: 1 },
      { u: 1, v: 3, weight: 2 },
      { u: 2, v: 3, weight: 4 },
    ]);
    expect(r.totalWeight).toBe(1 + 2 + 3);
  });

  it('triangle picks 2 smallest', () => {
    const r = boruvkaMST(3, [
      { u: 0, v: 1, weight: 1 },
      { u: 1, v: 2, weight: 2 },
      { u: 0, v: 2, weight: 5 },
    ]);
    expect(r.totalWeight).toBe(3);
    expect(r.edges).toHaveLength(2);
  });

  it('chain MST is the entire chain', () => {
    const r = boruvkaMST(5, [
      { u: 0, v: 1, weight: 2 },
      { u: 1, v: 2, weight: 3 },
      { u: 2, v: 3, weight: 4 },
      { u: 3, v: 4, weight: 5 },
    ]);
    expect(r.totalWeight).toBe(14);
    expect(r.edges).toHaveLength(4);
  });

  it('MST has V-1 edges when connected', () => {
    const r = boruvkaMST(5, [
      { u: 0, v: 1, weight: 1 },
      { u: 1, v: 2, weight: 1 },
      { u: 2, v: 3, weight: 1 },
      { u: 3, v: 4, weight: 1 },
      { u: 0, v: 4, weight: 10 },
      { u: 1, v: 3, weight: 10 },
    ]);
    expect(r.edges).toHaveLength(4);
  });

  it('handles negative weights', () => {
    const r = boruvkaMST(3, [
      { u: 0, v: 1, weight: -5 },
      { u: 1, v: 2, weight: -3 },
      { u: 0, v: 2, weight: 4 },
    ]);
    expect(r.totalWeight).toBe(-8);
  });

  it('handles parallel edges (picks cheaper)', () => {
    const r = boruvkaMST(2, [
      { u: 0, v: 1, weight: 5 },
      { u: 0, v: 1, weight: 1 },
    ]);
    expect(r.totalWeight).toBe(1);
    expect(r.edges).toHaveLength(1);
  });

  it('star graph picks all star edges', () => {
    const r = boruvkaMST(5, [
      { u: 0, v: 1, weight: 1 },
      { u: 0, v: 2, weight: 2 },
      { u: 0, v: 3, weight: 3 },
      { u: 0, v: 4, weight: 4 },
    ]);
    expect(r.edges).toHaveLength(4);
    expect(r.totalWeight).toBe(10);
  });

  it('returned edges sorted by weight', () => {
    const r = boruvkaMST(4, [
      { u: 0, v: 1, weight: 10 },
      { u: 1, v: 2, weight: 5 },
      { u: 2, v: 3, weight: 2 },
    ]);
    for (let i = 1; i < r.edges.length; i += 1) {
      expect(r.edges[i].weight).toBeGreaterThanOrEqual(r.edges[i - 1].weight);
    }
  });

  it('K4 with distinct weights', () => {
    const r = boruvkaMST(4, [
      { u: 0, v: 1, weight: 1 },
      { u: 0, v: 2, weight: 2 },
      { u: 0, v: 3, weight: 3 },
      { u: 1, v: 2, weight: 4 },
      { u: 1, v: 3, weight: 5 },
      { u: 2, v: 3, weight: 6 },
    ]);
    expect(r.totalWeight).toBe(6);
  });

  it('empty edges => no MST edges', () => {
    const r = boruvkaMST(3, []);
    expect(r.edges).toHaveLength(0);
    expect(r.totalWeight).toBe(0);
  });

  it('self-loops never selected', () => {
    const r = boruvkaMST(2, [
      { u: 0, v: 0, weight: -100 },
      { u: 0, v: 1, weight: 5 },
    ]);
    expect(r.totalWeight).toBe(5);
    expect(r.edges).toHaveLength(1);
  });
});
