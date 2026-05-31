import { describe, it, expect } from 'vitest';
import {
  cosineVectorSimilarity,
  cosineSparseSimilarity,
} from '../cosineVectorSimilarity';

describe('cosineVectorSimilarity', () => {
  it('rejects non-array', () => {
    expect(() => cosineVectorSimilarity('x' as any, [])).toThrow();
  });

  it('rejects mismatched length', () => {
    expect(() => cosineVectorSimilarity([1, 2], [1])).toThrow();
  });

  it('rejects non-number element', () => {
    expect(() => cosineVectorSimilarity([1, '2' as any], [1, 2])).toThrow();
  });

  it('empty => 0', () => {
    expect(cosineVectorSimilarity([], [])).toBe(0);
  });

  it('identical => 1', () => {
    expect(cosineVectorSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
  });

  it('opposite => -1', () => {
    expect(cosineVectorSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 10);
  });

  it('orthogonal => 0', () => {
    expect(cosineVectorSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });

  it('scale invariant', () => {
    expect(cosineVectorSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
  });

  it('zero vector => 0', () => {
    expect(cosineVectorSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it('known: [1,2,3] vs [4,5,6]', () => {
    // dot=32, |a|=sqrt(14), |b|=sqrt(77) -> 32 / (sqrt(14)*sqrt(77))
    expect(cosineVectorSimilarity([1, 2, 3], [4, 5, 6])).toBeCloseTo(
      32 / (Math.sqrt(14) * Math.sqrt(77)),
      10
    );
  });
});

describe('cosineSparseSimilarity', () => {
  it('rejects non-object', () => {
    expect(() => cosineSparseSimilarity(null as any, {})).toThrow();
  });

  it('rejects non-number value', () => {
    expect(() => cosineSparseSimilarity({ a: '1' as any }, { a: 1 })).toThrow();
  });

  it('empty => 0', () => {
    expect(cosineSparseSimilarity({}, {})).toBe(0);
  });

  it('identical sparse => 1', () => {
    expect(cosineSparseSimilarity({ a: 1, b: 2 }, { a: 1, b: 2 })).toBeCloseTo(1, 10);
  });

  it('disjoint => 0', () => {
    expect(cosineSparseSimilarity({ a: 1 }, { b: 1 })).toBe(0);
  });

  it('partial overlap', () => {
    // a: [1,2,0], b: [0,2,3] dot=4 |a|=sqrt(5) |b|=sqrt(13)
    const v = cosineSparseSimilarity({ x: 1, y: 2 }, { y: 2, z: 3 });
    expect(v).toBeCloseTo(4 / (Math.sqrt(5) * Math.sqrt(13)), 10);
  });

  it('zero-vector handled', () => {
    expect(cosineSparseSimilarity({ a: 0 }, { a: 1 })).toBe(0);
  });

  it('scale invariant', () => {
    expect(cosineSparseSimilarity({ a: 1, b: 2 }, { a: 3, b: 6 })).toBeCloseTo(1, 10);
  });

  it('handles large sparse', () => {
    const a: Record<string, number> = {};
    const b: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      a['k' + i] = 1;
      b['k' + i] = 1;
    }
    expect(cosineSparseSimilarity(a, b)).toBeCloseTo(1, 10);
  });
});
