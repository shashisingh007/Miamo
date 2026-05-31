import { describe, it, expect } from 'vitest';
import { TfIdfRanker } from '../tfIdfRanker';

describe('TfIdfRanker', () => {
  it('empty ranker', () => {
    const r = new TfIdfRanker([]);
    expect(r.size()).toBe(0);
    expect(r.rank(['x'])).toEqual([]);
  });

  it('throws on duplicate doc id', () => {
    expect(() => new TfIdfRanker([
      { id: 'a', tokens: ['x'] },
      { id: 'a', tokens: ['y'] },
    ])).toThrow(RangeError);
  });

  it('single doc returns id', () => {
    const r = new TfIdfRanker([{ id: 'd1', tokens: ['cat', 'dog'] }]);
    const ranked = r.rank(['cat']);
    expect(ranked[0].id).toBe('d1');
    expect(ranked[0].score).toBeGreaterThan(0);
  });

  it('empty query => zero scores', () => {
    const r = new TfIdfRanker([{ id: 'd1', tokens: ['cat'] }]);
    expect(r.rank([])[0].score).toBe(0);
  });

  it('throws on negative topK', () => {
    const r = new TfIdfRanker([{ id: 'd1', tokens: ['cat'] }]);
    expect(() => r.rank(['cat'], -1)).toThrow(RangeError);
  });

  it('topK trims results', () => {
    const r = new TfIdfRanker([
      { id: 'a', tokens: ['cat'] },
      { id: 'b', tokens: ['cat'] },
      { id: 'c', tokens: ['cat'] },
    ]);
    expect(r.rank(['cat'], 2)).toHaveLength(2);
  });

  it('topK 0 => empty', () => {
    const r = new TfIdfRanker([{ id: 'a', tokens: ['cat'] }]);
    expect(r.rank(['cat'], 0)).toEqual([]);
  });

  it('rarer term wins', () => {
    const r = new TfIdfRanker([
      { id: 'rare', tokens: ['unicorn', 'common', 'common'] },
      { id: 'common', tokens: ['common', 'common', 'common'] },
    ]);
    const ranked = r.rank(['unicorn']);
    expect(ranked[0].id).toBe('rare');
  });

  it('term in all docs has low weight', () => {
    const r = new TfIdfRanker([
      { id: 'a', tokens: ['the', 'apple'] },
      { id: 'b', tokens: ['the', 'banana'] },
      { id: 'c', tokens: ['the', 'cherry'] },
    ]);
    const ranked = r.rank(['the']);
    expect(ranked.every((x) => x.score < r.rank(['apple'])[0].score)).toBe(true);
  });

  it('higher tf => higher score', () => {
    const r = new TfIdfRanker([
      { id: 'a', tokens: ['cat', 'dog', 'fish'] },
      { id: 'b', tokens: ['cat', 'cat', 'cat'] },
    ]);
    const ranked = r.rank(['cat']);
    expect(ranked[0].id).toBe('b');
  });

  it('zero-length doc gets 0', () => {
    const r = new TfIdfRanker([
      { id: 'empty', tokens: [] },
      { id: 'a', tokens: ['cat'] },
    ]);
    const ranked = r.rank(['cat']);
    expect(ranked.find((x) => x.id === 'empty')!.score).toBe(0);
  });

  it('unseen term has 0 contribution', () => {
    const r = new TfIdfRanker([{ id: 'a', tokens: ['cat'] }]);
    expect(r.rank(['xyz'])[0].score).toBe(0);
  });

  it('descending score ordering', () => {
    const r = new TfIdfRanker([
      { id: 'a', tokens: ['cat'] },
      { id: 'b', tokens: ['cat', 'cat', 'dog'] },
      { id: 'c', tokens: ['dog', 'dog', 'dog'] },
    ]);
    const ranked = r.rank(['cat']);
    for (let i = 0; i + 1 < ranked.length; i++) {
      expect(ranked[i].score).toBeGreaterThanOrEqual(ranked[i + 1].score);
    }
  });

  it('ties broken by id ascending', () => {
    const r = new TfIdfRanker([
      { id: 'b', tokens: ['cat'] },
      { id: 'a', tokens: ['cat'] },
    ]);
    const ranked = r.rank(['cat']);
    expect(ranked[0].id).toBe('a');
  });

  it('size matches', () => {
    const r = new TfIdfRanker([
      { id: 'a', tokens: ['x'] }, { id: 'b', tokens: ['y'] },
    ]);
    expect(r.size()).toBe(2);
  });
});
