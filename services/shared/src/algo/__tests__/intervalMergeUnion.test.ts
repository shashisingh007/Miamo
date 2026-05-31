import { describe, it, expect } from 'vitest';
import {
  mergeIntervals,
  intersectIntervals,
  subtractIntervals,
  totalIntervalCoverage,
} from '../intervalMergeUnion';

describe('intervalMergeUnion', () => {
  it('mergeIntervals empty => []', () => {
    expect(mergeIntervals([])).toEqual([]);
  });

  it('mergeIntervals single', () => {
    expect(mergeIntervals([{ start: 0, end: 5 }])).toEqual([{ start: 0, end: 5 }]);
  });

  it('mergeIntervals overlapping', () => {
    expect(mergeIntervals([{ start: 0, end: 5 }, { start: 3, end: 7 }])).toEqual([
      { start: 0, end: 7 },
    ]);
  });

  it('mergeIntervals adjacent (touching)', () => {
    expect(mergeIntervals([{ start: 0, end: 5 }, { start: 5, end: 10 }])).toEqual([
      { start: 0, end: 10 },
    ]);
  });

  it('mergeIntervals disjoint preserved', () => {
    expect(mergeIntervals([{ start: 0, end: 1 }, { start: 5, end: 6 }])).toEqual([
      { start: 0, end: 1 },
      { start: 5, end: 6 },
    ]);
  });

  it('mergeIntervals out-of-order sorted', () => {
    expect(mergeIntervals([{ start: 5, end: 6 }, { start: 0, end: 1 }])).toEqual([
      { start: 0, end: 1 },
      { start: 5, end: 6 },
    ]);
  });

  it('mergeIntervals nested', () => {
    expect(mergeIntervals([{ start: 0, end: 10 }, { start: 3, end: 5 }])).toEqual([
      { start: 0, end: 10 },
    ]);
  });

  it('mergeIntervals zero-width skipped', () => {
    expect(mergeIntervals([{ start: 0, end: 0 }, { start: 1, end: 2 }])).toEqual([
      { start: 1, end: 2 },
    ]);
  });

  it('mergeIntervals throws on inverted', () => {
    expect(() => mergeIntervals([{ start: 5, end: 1 }])).toThrow();
  });

  it('mergeIntervals throws on non-finite', () => {
    expect(() => mergeIntervals([{ start: 0, end: Infinity }])).toThrow();
  });

  it('mergeIntervals throws on non-numeric', () => {
    expect(() => mergeIntervals([{ start: 'x' as any, end: 1 }])).toThrow();
  });

  it('intersectIntervals empty inputs => []', () => {
    expect(intersectIntervals([], [{ start: 0, end: 5 }])).toEqual([]);
  });

  it('intersectIntervals overlap', () => {
    expect(
      intersectIntervals([{ start: 0, end: 5 }], [{ start: 3, end: 10 }])
    ).toEqual([{ start: 3, end: 5 }]);
  });

  it('intersectIntervals disjoint => []', () => {
    expect(intersectIntervals([{ start: 0, end: 1 }], [{ start: 5, end: 6 }])).toEqual([]);
  });

  it('intersectIntervals multiple pieces', () => {
    expect(
      intersectIntervals(
        [{ start: 0, end: 10 }],
        [
          { start: 1, end: 3 },
          { start: 5, end: 7 },
        ]
      )
    ).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 7 },
    ]);
  });

  it('intersectIntervals adjacency yields no overlap', () => {
    expect(
      intersectIntervals([{ start: 0, end: 5 }], [{ start: 5, end: 10 }])
    ).toEqual([]);
  });

  it('subtractIntervals removes interior', () => {
    expect(
      subtractIntervals([{ start: 0, end: 10 }], [{ start: 3, end: 5 }])
    ).toEqual([
      { start: 0, end: 3 },
      { start: 5, end: 10 },
    ]);
  });

  it('subtractIntervals removes prefix', () => {
    expect(
      subtractIntervals([{ start: 0, end: 10 }], [{ start: 0, end: 4 }])
    ).toEqual([{ start: 4, end: 10 }]);
  });

  it('subtractIntervals removes suffix', () => {
    expect(
      subtractIntervals([{ start: 0, end: 10 }], [{ start: 7, end: 12 }])
    ).toEqual([{ start: 0, end: 7 }]);
  });

  it('subtractIntervals removes whole', () => {
    expect(
      subtractIntervals([{ start: 0, end: 10 }], [{ start: 0, end: 10 }])
    ).toEqual([]);
  });

  it('subtractIntervals removes nothing when disjoint', () => {
    expect(
      subtractIntervals([{ start: 0, end: 1 }], [{ start: 5, end: 6 }])
    ).toEqual([{ start: 0, end: 1 }]);
  });

  it('subtractIntervals across multiple base intervals', () => {
    expect(
      subtractIntervals(
        [
          { start: 0, end: 5 },
          { start: 10, end: 15 },
        ],
        [{ start: 3, end: 12 }]
      )
    ).toEqual([
      { start: 0, end: 3 },
      { start: 12, end: 15 },
    ]);
  });

  it('totalIntervalCoverage', () => {
    expect(
      totalIntervalCoverage([
        { start: 0, end: 5 },
        { start: 3, end: 10 },
        { start: 20, end: 21 },
      ])
    ).toBe(11);
  });

  it('totalIntervalCoverage empty => 0', () => {
    expect(totalIntervalCoverage([])).toBe(0);
  });
});
