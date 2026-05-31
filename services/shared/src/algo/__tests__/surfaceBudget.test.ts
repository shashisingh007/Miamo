import { describe, it, expect } from 'vitest';
import { allocateBudget } from '../surfaceBudget';

describe('allocateBudget', () => {
  it('returns all zeros for totalSlots = 0', () => {
    expect(allocateBudget(0, { a: 1, b: 1 })).toEqual({ a: 0, b: 0 });
  });
  it('returns empty object for empty weights', () => {
    expect(allocateBudget(10, {})).toEqual({});
  });
  it('returns all zeros when all weights are <= 0', () => {
    expect(allocateBudget(10, { a: 0, b: -1 })).toEqual({ a: 0, b: 0 });
  });
  it('distributes evenly for equal weights', () => {
    expect(allocateBudget(10, { a: 1, b: 1 })).toEqual({ a: 5, b: 5 });
  });
  it('preserves total exactly via Hamilton remainders', () => {
    const out = allocateBudget(10, { a: 1, b: 1, c: 1 });
    const sum = out.a + out.b + out.c;
    expect(sum).toBe(10);
  });
  it('honours weighted ratios', () => {
    const out = allocateBudget(100, { forYou: 6, deepCompat: 3, notif: 1 });
    expect(out.forYou).toBe(60);
    expect(out.deepCompat).toBe(30);
    expect(out.notif).toBe(10);
  });
  it('tie-breaks remainders by key name (deterministic)', () => {
    const a = allocateBudget(7, { x: 1, y: 1, z: 1 });
    const b = allocateBudget(7, { z: 1, y: 1, x: 1 });
    expect(a).toEqual(b);
  });
  it('handles non-finite weights gracefully', () => {
    const out = allocateBudget(10, { a: NaN, b: 1, c: Infinity });
    expect(out.a).toBe(0);
    expect(out.c).toBe(0);
    expect(out.b).toBe(10);
  });
});
