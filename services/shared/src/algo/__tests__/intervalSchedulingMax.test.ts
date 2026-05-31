import { describe, it, expect } from 'vitest';
import { intervalSchedulingMax } from '../intervalSchedulingMax';

describe('intervalSchedulingMax', () => {
  it('empty input', () => {
    expect(intervalSchedulingMax([])).toEqual({ totalWeight: 0, selected: [] });
  });

  it('single interval', () => {
    const r = intervalSchedulingMax([{ start: 0, end: 5, weight: 10 }]);
    expect(r.totalWeight).toBe(10);
    expect(r.selected).toHaveLength(1);
  });

  it('non-overlapping all picked', () => {
    const r = intervalSchedulingMax([
      { start: 0, end: 1, weight: 1 },
      { start: 2, end: 3, weight: 2 },
      { start: 4, end: 5, weight: 3 },
    ]);
    expect(r.totalWeight).toBe(6);
    expect(r.selected).toHaveLength(3);
  });

  it('overlapping picks highest weight', () => {
    const r = intervalSchedulingMax([
      { start: 0, end: 5, weight: 10 },
      { start: 1, end: 3, weight: 2 },
      { start: 2, end: 4, weight: 3 },
    ]);
    expect(r.totalWeight).toBe(10);
  });

  it('two non-overlapping better than one big', () => {
    const r = intervalSchedulingMax([
      { start: 0, end: 10, weight: 5 },
      { start: 0, end: 4, weight: 4 },
      { start: 5, end: 10, weight: 4 },
    ]);
    expect(r.totalWeight).toBe(8);
    expect(r.selected).toHaveLength(2);
  });

  it('touching intervals (end == next start) are not overlapping', () => {
    const r = intervalSchedulingMax([
      { start: 0, end: 3, weight: 4 },
      { start: 3, end: 6, weight: 5 },
    ]);
    expect(r.totalWeight).toBe(9);
    expect(r.selected).toHaveLength(2);
  });

  it('selected sorted by end', () => {
    const r = intervalSchedulingMax([
      { start: 5, end: 7, weight: 5 },
      { start: 0, end: 2, weight: 3 },
      { start: 3, end: 4, weight: 4 },
    ]);
    for (let i = 1; i < r.selected.length; i += 1) {
      expect(r.selected[i].end).toBeGreaterThanOrEqual(r.selected[i - 1].end);
    }
  });

  it('zero weights handled', () => {
    const r = intervalSchedulingMax([
      { start: 0, end: 1, weight: 0 },
      { start: 2, end: 3, weight: 0 },
    ]);
    expect(r.totalWeight).toBe(0);
  });

  it('throws on non-finite', () => {
    expect(() => intervalSchedulingMax([{ start: NaN, end: 1, weight: 1 }])).toThrow(TypeError);
    expect(() =>
      intervalSchedulingMax([{ start: 0, end: 1, weight: Infinity }]),
    ).toThrow(TypeError);
  });

  it('throws on start > end', () => {
    expect(() => intervalSchedulingMax([{ start: 5, end: 1, weight: 1 }])).toThrow(RangeError);
  });

  it('many small beat one big when sum exceeds', () => {
    const arr = [
      { start: 0, end: 100, weight: 30 },
      { start: 0, end: 10, weight: 10 },
      { start: 10, end: 20, weight: 10 },
      { start: 20, end: 30, weight: 10 },
      { start: 30, end: 40, weight: 10 },
    ];
    const r = intervalSchedulingMax(arr);
    expect(r.totalWeight).toBe(40);
    expect(r.selected).toHaveLength(4);
  });

  it('classic textbook example', () => {
    const r = intervalSchedulingMax([
      { start: 1, end: 4, weight: 50 },
      { start: 3, end: 5, weight: 20 },
      { start: 0, end: 6, weight: 100 },
      { start: 5, end: 7, weight: 200 },
      { start: 3, end: 8, weight: 11 },
      { start: 8, end: 9, weight: 1 },
      { start: 5, end: 9, weight: 100 },
      { start: 6, end: 10, weight: 2 },
    ]);
    expect(r.totalWeight).toBe(50 + 200 + 1);
  });

  it('result intervals are non-overlapping', () => {
    const r = intervalSchedulingMax([
      { start: 0, end: 5, weight: 4 },
      { start: 2, end: 4, weight: 2 },
      { start: 6, end: 9, weight: 5 },
      { start: 7, end: 8, weight: 1 },
    ]);
    for (let i = 1; i < r.selected.length; i += 1) {
      expect(r.selected[i].start).toBeGreaterThanOrEqual(r.selected[i - 1].end);
    }
  });

  it('does not mutate input', () => {
    const arr = [
      { start: 5, end: 7, weight: 1 },
      { start: 0, end: 1, weight: 2 },
    ];
    const copy = arr.map((x) => ({ ...x }));
    intervalSchedulingMax(arr);
    expect(arr).toEqual(copy);
  });
});
