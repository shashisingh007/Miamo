import { describe, it, expect } from 'vitest';
import { knapsack01 } from '../knapsack01';

describe('knapsack01', () => {
  it('empty items => 0', () => {
    expect(knapsack01([], 10)).toEqual({ maxValue: 0, selected: [] });
  });

  it('zero capacity => 0', () => {
    expect(knapsack01([{ weight: 1, value: 10 }], 0)).toEqual({ maxValue: 0, selected: [] });
  });

  it('single item fits', () => {
    const r = knapsack01([{ weight: 3, value: 5 }], 5);
    expect(r.maxValue).toBe(5);
    expect(r.selected).toEqual([0]);
  });

  it('single item too heavy', () => {
    const r = knapsack01([{ weight: 10, value: 5 }], 5);
    expect(r.maxValue).toBe(0);
    expect(r.selected).toEqual([]);
  });

  it('classic example', () => {
    const r = knapsack01([
      { weight: 2, value: 3 },
      { weight: 3, value: 4 },
      { weight: 4, value: 5 },
      { weight: 5, value: 6 },
    ], 5);
    expect(r.maxValue).toBe(7);
  });

  it('picks highest-value combination', () => {
    const r = knapsack01([
      { weight: 1, value: 1 },
      { weight: 2, value: 6 },
      { weight: 5, value: 18 },
      { weight: 6, value: 22 },
      { weight: 7, value: 28 },
    ], 11);
    expect(r.maxValue).toBe(40);
  });

  it('selected items sum within capacity', () => {
    const items = [
      { weight: 1, value: 1 },
      { weight: 2, value: 6 },
      { weight: 5, value: 18 },
      { weight: 6, value: 22 },
      { weight: 7, value: 28 },
    ];
    const r = knapsack01(items, 11);
    const totalW = r.selected.reduce((s, i) => s + items[i].weight, 0);
    expect(totalW).toBeLessThanOrEqual(11);
  });

  it('all items fit', () => {
    const r = knapsack01([
      { weight: 1, value: 1 },
      { weight: 2, value: 2 },
      { weight: 3, value: 3 },
    ], 100);
    expect(r.maxValue).toBe(6);
    expect(r.selected).toEqual([0, 1, 2]);
  });

  it('zero weight items always taken', () => {
    const r = knapsack01([
      { weight: 0, value: 5 },
      { weight: 3, value: 4 },
    ], 3);
    expect(r.maxValue).toBe(9);
  });

  it('zero value items not taken (when others exist)', () => {
    const r = knapsack01([
      { weight: 1, value: 0 },
      { weight: 1, value: 5 },
    ], 1);
    expect(r.maxValue).toBe(5);
    expect(r.selected).toEqual([1]);
  });

  it('throws on negative capacity', () => {
    expect(() => knapsack01([], -1)).toThrow(RangeError);
  });

  it('throws on non-integer capacity', () => {
    expect(() => knapsack01([], 1.5)).toThrow(RangeError);
  });

  it('throws on negative weight', () => {
    expect(() => knapsack01([{ weight: -1, value: 1 }], 5)).toThrow(RangeError);
  });

  it('throws on negative value', () => {
    expect(() => knapsack01([{ weight: 1, value: -1 }], 5)).toThrow(RangeError);
  });

  it('duplicate items handled independently', () => {
    const r = knapsack01([
      { weight: 2, value: 3 },
      { weight: 2, value: 3 },
    ], 4);
    expect(r.maxValue).toBe(6);
    expect(r.selected).toEqual([0, 1]);
  });

  it('large capacity', () => {
    const items = [];
    for (let i = 0; i < 20; i++) items.push({ weight: i + 1, value: (i + 1) * 2 });
    const r = knapsack01(items, 50);
    expect(r.maxValue).toBeGreaterThan(0);
  });
});
