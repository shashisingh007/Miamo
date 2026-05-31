import { describe, it, expect } from 'vitest';
import { topK, topPercent } from '../topK';

const items = [
  { id: 'a', score: 50 }, { id: 'b', score: 90 }, { id: 'c', score: 70 },
  { id: 'd', score: 90 }, { id: 'e', score: 30 },
];

describe('topK', () => {
  it('returns top-k in descending order by default', () => {
    const out = topK(items, 3);
    expect(out.map((x) => x.score)).toEqual([90, 90, 70]);
  });

  it('breaks ties by id ascending (deterministic)', () => {
    const out = topK(items, 2);
    expect(out.map((x) => x.id)).toEqual(['b', 'd']);
  });

  it('honours k=0 \u2192 empty', () => {
    expect(topK(items, 0)).toEqual([]);
  });

  it('returns all when k > length', () => {
    expect(topK(items, 100)).toHaveLength(items.length);
  });

  it('drops items below minScore', () => {
    const out = topK(items, 5, { minScore: 60 });
    expect(out.every((x) => x.score >= 60)).toBe(true);
    expect(out).toHaveLength(3);
  });

  it('ascending mode reverses order', () => {
    const out = topK(items, 2, { ascending: true });
    expect(out.map((x) => x.score)).toEqual([30, 50]);
  });

  it('drops NaN / -Infinity scores', () => {
    const dirty = [...items, { id: 'nan', score: Number.NaN }, { id: 'neg', score: -Infinity }];
    const out = topK(dirty, 10);
    expect(out.find((x) => x.id === 'nan')).toBeUndefined();
    expect(out.find((x) => x.id === 'neg')).toBeUndefined();
  });

  it('does not mutate input', () => {
    const snap = JSON.stringify(items);
    topK(items, 2);
    expect(JSON.stringify(items)).toBe(snap);
  });
});

describe('topPercent', () => {
  it('returns top 20% (ceil)', () => {
    const out = topPercent(items, 0.2); // ceil(5*0.2)=1
    expect(out).toHaveLength(1);
  });

  it('returns >=1 when items present and pct>0', () => {
    expect(topPercent(items, 0.0001)).toHaveLength(1);
  });

  it('caps at items.length when pct>=1', () => {
    expect(topPercent(items, 2)).toHaveLength(items.length);
  });

  it('returns [] for empty input or non-positive pct', () => {
    expect(topPercent([], 0.5)).toEqual([]);
    expect(topPercent(items, 0)).toEqual([]);
    expect(topPercent(items, -1)).toEqual([]);
  });
});
