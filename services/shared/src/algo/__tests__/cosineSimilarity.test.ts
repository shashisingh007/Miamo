import { describe, it, expect } from 'vitest';
import { cosineSimilarity, cosineDistance } from '../cosineSimilarity';

describe('cosineSimilarity', () => {
  it('identical => 1', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 12);
  });

  it('orthogonal => 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 12);
  });

  it('opposite => -1', () => {
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1, 12);
  });

  it('symmetric', () => {
    const a = cosineSimilarity([1, 2, 3], [4, 5, 6]);
    const b = cosineSimilarity([4, 5, 6], [1, 2, 3]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('scale invariant', () => {
    const a = cosineSimilarity([1, 2, 3], [1, 2, 3]);
    const b = cosineSimilarity([1, 2, 3], [10, 20, 30]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('throws on length mismatch', () => {
    expect(() => cosineSimilarity([1, 2], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => cosineSimilarity([], [])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => cosineSimilarity([NaN, 1], [1, 2])).toThrow();
  });

  it('throws on zero vector', () => {
    expect(() => cosineSimilarity([0, 0], [1, 1])).toThrow();
  });

  it('bounded in [-1, 1]', () => {
    const v = cosineSimilarity([1, -2, 3], [4, 5, -6]);
    expect(v).toBeGreaterThanOrEqual(-1);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('cosineDistance is 1 - similarity', () => {
    expect(cosineDistance([1, 2], [3, 4])).toBeCloseTo(
      1 - cosineSimilarity([1, 2], [3, 4]),
      12
    );
  });

  it('cosineDistance identical => 0', () => {
    expect(cosineDistance([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 12);
  });

  it('cosineDistance opposite => 2', () => {
    expect(cosineDistance([1, 2], [-1, -2])).toBeCloseTo(2, 12);
  });

  it('larger vectors', () => {
    const v = cosineSimilarity([1, 0, 0, 0, 0], [0, 1, 0, 0, 0]);
    expect(v).toBeCloseTo(0, 12);
  });

  it('handles negatives', () => {
    const v = cosineSimilarity([-1, -2], [-2, -4]);
    expect(v).toBeCloseTo(1, 12);
  });
});
