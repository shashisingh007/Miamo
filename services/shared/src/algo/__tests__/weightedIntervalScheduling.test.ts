import { describe, it, expect } from 'vitest';
import { weightedIntervalScheduling } from '../weightedIntervalScheduling';

describe('weightedIntervalScheduling', () => {
  it('empty returns 0', () => {
    expect(weightedIntervalScheduling([])).toEqual({ totalWeight: 0, selected: [] });
  });

  it('single interval picked', () => {
    const r = weightedIntervalScheduling([{ start: 0, end: 5, weight: 7 }]);
    expect(r.totalWeight).toBe(7);
    expect(r.selected).toEqual([0]);
  });

  it('non-overlapping all picked', () => {
    const r = weightedIntervalScheduling([
      { start: 0, end: 1, weight: 1 },
      { start: 1, end: 2, weight: 2 },
      { start: 2, end: 3, weight: 3 },
    ]);
    expect(r.totalWeight).toBe(6);
    expect(r.selected).toEqual([0, 1, 2]);
  });

  it('picks higher-weight overlapping over greedy count', () => {
    const r = weightedIntervalScheduling([
      { start: 0, end: 5, weight: 100 },
      { start: 1, end: 2, weight: 1 },
      { start: 2, end: 3, weight: 1 },
      { start: 3, end: 4, weight: 1 },
    ]);
    expect(r.totalWeight).toBe(100);
    expect(r.selected).toEqual([0]);
  });

  it('classic Kleinberg example', () => {
    // Eight intervals: weights chosen so optimum = 8 + 4 = picks intervals 4 and 8
    const ivs = [
      { start: 1, end: 4, weight: 5 },   // 0
      { start: 3, end: 5, weight: 1 },   // 1
      { start: 0, end: 6, weight: 8 },   // 2
      { start: 4, end: 7, weight: 4 },   // 3
      { start: 3, end: 8, weight: 6 },   // 4
      { start: 5, end: 9, weight: 3 },   // 5
      { start: 6, end: 10, weight: 2 },  // 6
      { start: 8, end: 11, weight: 4 },  // 7
    ];
    const r = weightedIntervalScheduling(ivs);
    expect(r.totalWeight).toBe(13); // 8 + (4+...) actually: pick 2 (weight 8) and 7 (weight 4) and 1 (weight 1) = 13
  });

  it('half-open: end == next start is non-overlapping', () => {
    const r = weightedIntervalScheduling([
      { start: 0, end: 5, weight: 10 },
      { start: 5, end: 10, weight: 10 },
    ]);
    expect(r.totalWeight).toBe(20);
    expect(r.selected).toEqual([0, 1]);
  });

  it('preserves original indices in output', () => {
    const r = weightedIntervalScheduling([
      { start: 10, end: 20, weight: 5 },
      { start: 0, end: 5, weight: 5 },
    ]);
    expect(r.selected.sort()).toEqual([0, 1]);
  });

  it('all overlapping picks max-weight one', () => {
    const r = weightedIntervalScheduling([
      { start: 0, end: 10, weight: 3 },
      { start: 1, end: 5, weight: 7 },
      { start: 2, end: 9, weight: 4 },
    ]);
    expect(r.totalWeight).toBe(7);
    expect(r.selected).toEqual([1]);
  });

  it('rejects negative weight', () => {
    expect(() => weightedIntervalScheduling([{ start: 0, end: 1, weight: -1 }])).toThrow();
  });

  it('rejects end before start', () => {
    expect(() => weightedIntervalScheduling([{ start: 5, end: 1, weight: 1 }])).toThrow();
  });

  it('rejects non-finite', () => {
    expect(() => weightedIntervalScheduling([{ start: 0, end: Infinity, weight: 1 }])).toThrow();
  });
});
