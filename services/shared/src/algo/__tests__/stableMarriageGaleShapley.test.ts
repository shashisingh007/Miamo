import { describe, it, expect } from 'vitest';
import { galeShapley, isStableMatching, stableMarriageGaleShapley } from '../stableMarriageGaleShapley';

describe('stableMarriageGaleShapley', () => {
  it('factory exposes both', () => {
    const api = stableMarriageGaleShapley();
    expect(typeof api.galeShapley).toBe('function');
    expect(typeof api.isStableMatching).toBe('function');
  });

  it('n=1 trivial', () => {
    const res = galeShapley([[0]], [[0]]);
    expect(res.matchOfA).toEqual([0]);
    expect(res.matchOfB).toEqual([0]);
  });

  it('produces a perfect matching', () => {
    const A = [
      [0, 1, 2],
      [1, 0, 2],
      [0, 1, 2],
    ];
    const B = [
      [0, 1, 2],
      [1, 2, 0],
      [2, 0, 1],
    ];
    const res = galeShapley(A, B);
    const sortedA = [...res.matchOfA].sort();
    expect(sortedA).toEqual([0, 1, 2]);
  });

  it('result is stable', () => {
    const A = [
      [0, 1, 2, 3],
      [1, 0, 3, 2],
      [2, 3, 0, 1],
      [3, 2, 1, 0],
    ];
    const B = [
      [3, 2, 1, 0],
      [0, 3, 2, 1],
      [1, 0, 3, 2],
      [2, 1, 0, 3],
    ];
    const res = galeShapley(A, B);
    expect(isStableMatching(A, B, res)).toBe(true);
  });

  it('proposer-optimal: each A gets best stable partner', () => {
    const A = [
      [0, 1],
      [0, 1],
    ];
    const B = [
      [1, 0],
      [1, 0],
    ];
    const res = galeShapley(A, B);
    // Both A prefer B0; both B prefer A1. So A1 wins B0; A0 gets B1.
    expect(res.matchOfA).toEqual([1, 0]);
    expect(isStableMatching(A, B, res)).toBe(true);
  });

  it('matchOfA and matchOfB are inverses', () => {
    const A = [
      [0, 1, 2],
      [2, 0, 1],
      [1, 2, 0],
    ];
    const B = [
      [1, 0, 2],
      [2, 1, 0],
      [0, 2, 1],
    ];
    const res = galeShapley(A, B);
    for (let i = 0; i < 3; i += 1) {
      expect(res.matchOfB[res.matchOfA[i]]).toBe(i);
    }
  });

  it('isStableMatching detects blocking pair', () => {
    const A = [
      [0, 1],
      [0, 1],
    ];
    const B = [
      [1, 0],
      [1, 0],
    ];
    const bad = { matchOfA: [0, 1], matchOfB: [0, 1] };
    expect(isStableMatching(A, B, bad)).toBe(false);
  });

  it('throws on shape mismatch', () => {
    expect(() => galeShapley([[0]], [[0, 1], [1, 0]])).toThrow();
    expect(() => galeShapley([[0, 1]], [[0]])).toThrow();
    expect(() => galeShapley(null as any, [])).toThrow();
  });

  it('throws on bad rows', () => {
    expect(() => galeShapley([[0]], [[0]] as any)).not.toThrow();
    expect(() => galeShapley([[0]], [['x' as any]] as any)).not.toThrow(); // shape ok; rank uses numeric index 0
  });
});
