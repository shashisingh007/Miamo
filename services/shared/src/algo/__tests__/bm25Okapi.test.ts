import { describe, it, expect } from 'vitest';
import { Bm25Okapi } from '../bm25Okapi';

describe('Bm25Okapi', () => {
  it('rejects bad k1', () => {
    expect(() => new Bm25Okapi({ k1: -1 })).toThrow(RangeError);
    expect(() => new Bm25Okapi({ k1: NaN })).toThrow(RangeError);
  });

  it('rejects bad b', () => {
    expect(() => new Bm25Okapi({ b: -1 })).toThrow(RangeError);
    expect(() => new Bm25Okapi({ b: 1.5 })).toThrow(RangeError);
  });

  it('addDocument rejects bad inputs', () => {
    const r = new Bm25Okapi();
    expect(() => r.addDocument('', ['x'])).toThrow(TypeError);
    expect(() => r.addDocument('a', 'x' as any)).toThrow(TypeError);
  });

  it('addDocument fails after seal', () => {
    const r = new Bm25Okapi();
    r.addDocument('a', ['x']);
    r.seal();
    expect(() => r.addDocument('b', ['y'])).toThrow();
  });

  it('scoring before seal throws', () => {
    const r = new Bm25Okapi();
    r.addDocument('a', ['x']);
    expect(() => r.rank(['x'])).toThrow();
  });

  it('empty corpus rank empty', () => {
    const r = new Bm25Okapi();
    r.seal();
    expect(r.rank(['anything'])).toEqual([]);
  });

  it('exact match outranks irrelevant', () => {
    const r = new Bm25Okapi();
    r.addDocument('a', ['cat', 'dog', 'fish']);
    r.addDocument('b', ['apple', 'pie']);
    r.seal();
    const ranked = r.rank(['cat']);
    expect(ranked[0].id).toBe('a');
    expect(ranked.length).toBe(1);
  });

  it('higher tf raises score within constant doc length', () => {
    const r = new Bm25Okapi();
    r.addDocument('a', ['cat', 'cat', 'cat', 'dog', 'fish']);
    r.addDocument('b', ['cat', 'dog', 'fish', 'pie', 'tea']);
    r.seal();
    const sA = r.scoreDocument('a', ['cat']);
    const sB = r.scoreDocument('b', ['cat']);
    expect(sA).toBeGreaterThan(sB);
  });

  it('IDF damps very common terms', () => {
    const r = new Bm25Okapi();
    for (let i = 0; i < 100; i += 1) r.addDocument(`d${i}`, ['the']);
    r.addDocument('rare', ['unicorn']);
    r.seal();
    const sCommon = r.scoreDocument('d0', ['the']);
    const sRare = r.scoreDocument('rare', ['unicorn']);
    expect(sRare).toBeGreaterThan(sCommon);
  });

  it('rank topK clamped', () => {
    const r = new Bm25Okapi();
    r.addDocument('a', ['x']);
    r.addDocument('b', ['x']);
    r.seal();
    expect(r.rank(['x'], 10).length).toBe(2);
  });

  it('rank rejects bad topK', () => {
    const r = new Bm25Okapi();
    r.addDocument('a', ['x']);
    r.seal();
    expect(() => r.rank(['x'], 0)).toThrow(RangeError);
    expect(() => r.rank(['x'], 1.5)).toThrow(RangeError);
  });

  it('rank sorted desc', () => {
    const r = new Bm25Okapi();
    r.addDocument('a', ['cat', 'cat', 'cat']);
    r.addDocument('b', ['cat', 'cat']);
    r.addDocument('c', ['cat']);
    r.seal();
    const ranked = r.rank(['cat']);
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });

  it('zero score docs excluded', () => {
    const r = new Bm25Okapi();
    r.addDocument('a', ['cat']);
    r.addDocument('b', ['dog']);
    r.seal();
    const ranked = r.rank(['fish']);
    expect(ranked.length).toBe(0);
  });

  it('size returns doc count', () => {
    const r = new Bm25Okapi();
    r.addDocument('a', ['x']);
    r.addDocument('b', ['y']);
    expect(r.size()).toBe(2);
  });

  it('unknown docId throws', () => {
    const r = new Bm25Okapi();
    r.addDocument('a', ['x']);
    r.seal();
    expect(() => r.scoreDocument('zzz', ['x'])).toThrow(RangeError);
  });

  it('long doc penalized vs short equally-relevant doc', () => {
    const r = new Bm25Okapi();
    r.addDocument('short', ['cat']);
    r.addDocument('long', ['cat', ...Array.from({ length: 100 }, () => 'filler')]);
    r.addDocument('other', ['dog']);
    r.seal();
    const sShort = r.scoreDocument('short', ['cat']);
    const sLong = r.scoreDocument('long', ['cat']);
    expect(sShort).toBeGreaterThan(sLong);
  });

  it('multi-term query sums scores', () => {
    const r = new Bm25Okapi();
    r.addDocument('a', ['cat', 'dog']);
    r.addDocument('b', ['cat', 'dog']);
    r.addDocument('c', ['fish']);
    r.seal();
    const sCat = r.scoreDocument('a', ['cat']);
    const sBoth = r.scoreDocument('a', ['cat', 'dog']);
    expect(sBoth).toBeGreaterThan(sCat);
  });
});
