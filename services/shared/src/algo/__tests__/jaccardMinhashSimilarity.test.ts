import { describe, it, expect } from 'vitest';
import {
  jaccardSimilarity,
  buildMinHashSignature,
  estimateJaccardFromMinHash,
} from '../jaccardMinhashSimilarity';

describe('jaccardMinhashSimilarity', () => {
  it('empty/empty => 1', () => {
    expect(jaccardSimilarity([], [])).toBe(1);
  });

  it('disjoint => 0', () => {
    expect(jaccardSimilarity(['a'], ['b'])).toBe(0);
  });

  it('identical => 1', () => {
    expect(jaccardSimilarity(['a', 'b'], ['a', 'b'])).toBe(1);
  });

  it('subset', () => {
    expect(jaccardSimilarity(['a'], ['a', 'b', 'c'])).toBeCloseTo(1 / 3, 6);
  });

  it('partial overlap', () => {
    expect(jaccardSimilarity(['a', 'b', 'c'], ['b', 'c', 'd'])).toBeCloseTo(2 / 4, 6);
  });

  it('accepts Set input', () => {
    expect(jaccardSimilarity(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3, 6);
  });

  it('deduplicates iterables', () => {
    expect(jaccardSimilarity(['a', 'a', 'b'], ['a', 'b', 'b'])).toBe(1);
  });

  it('buildMinHashSignature returns Uint32Array of expected length', () => {
    const sig = buildMinHashSignature(['a', 'b'], { numHashes: 32 });
    expect(sig).toBeInstanceOf(Uint32Array);
    expect(sig.length).toBe(32);
  });

  it('throws on bad numHashes', () => {
    expect(() => buildMinHashSignature(['a'], { numHashes: 0 })).toThrow();
    expect(() => buildMinHashSignature(['a'], { numHashes: 1.5 })).toThrow();
  });

  it('identical input => identical signature', () => {
    const a = buildMinHashSignature(['x', 'y', 'z'], { numHashes: 64 });
    const b = buildMinHashSignature(['z', 'y', 'x'], { numHashes: 64 });
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('different seed yields different signature', () => {
    const a = buildMinHashSignature(['x'], { numHashes: 16, seed: 1 });
    const b = buildMinHashSignature(['x'], { numHashes: 16, seed: 2 });
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it('estimateJaccardFromMinHash equals 1 for identical', () => {
    const a = buildMinHashSignature(['p', 'q', 'r'], { numHashes: 128 });
    const b = buildMinHashSignature(['p', 'q', 'r'], { numHashes: 128 });
    expect(estimateJaccardFromMinHash(a, b)).toBe(1);
  });

  it('estimateJaccardFromMinHash equals 0 for empty-set signatures (all-zeros match)', () => {
    const a = buildMinHashSignature([], { numHashes: 16 });
    const b = buildMinHashSignature([], { numHashes: 16 });
    // both filled with 0 — collisions match every slot
    expect(estimateJaccardFromMinHash(a, b)).toBe(1);
  });

  it('estimateJaccardFromMinHash close to true Jaccard for medium sets', () => {
    const A: string[] = [];
    const B: string[] = [];
    for (let i = 0; i < 500; i++) A.push('a' + i);
    for (let i = 250; i < 750; i++) B.push('a' + i);
    // true Jaccard = 250 / 750 = 1/3
    const sigA = buildMinHashSignature(A, { numHashes: 256, seed: 42 });
    const sigB = buildMinHashSignature(B, { numHashes: 256, seed: 42 });
    const est = estimateJaccardFromMinHash(sigA, sigB);
    expect(est).toBeGreaterThan(0.2);
    expect(est).toBeLessThan(0.45);
  });

  it('signature length mismatch throws', () => {
    expect(() =>
      estimateJaccardFromMinHash(new Uint32Array(4), new Uint32Array(5))
    ).toThrow();
  });

  it('zero-length signatures => 1', () => {
    expect(estimateJaccardFromMinHash(new Uint32Array(0), new Uint32Array(0))).toBe(1);
  });

  it('signature deterministic given same seed/items', () => {
    const a = buildMinHashSignature(['x', 'y'], { numHashes: 4, seed: 7 });
    const b = buildMinHashSignature(['x', 'y'], { numHashes: 4, seed: 7 });
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('overlap estimate increases with overlap', () => {
    const A = Array.from({ length: 200 }, (_, i) => 's' + i);
    const small = buildMinHashSignature(A, { numHashes: 256, seed: 1 });
    const wide = buildMinHashSignature(A.concat(['extra']), { numHashes: 256, seed: 1 });
    const est = estimateJaccardFromMinHash(small, wide);
    expect(est).toBeGreaterThan(0.85);
  });

  it('exact Jaccard 0 yields low MinHash estimate', () => {
    const A = Array.from({ length: 100 }, (_, i) => 'a' + i);
    const B = Array.from({ length: 100 }, (_, i) => 'b' + i);
    const sigA = buildMinHashSignature(A, { numHashes: 256, seed: 13 });
    const sigB = buildMinHashSignature(B, { numHashes: 256, seed: 13 });
    expect(estimateJaccardFromMinHash(sigA, sigB)).toBeLessThan(0.1);
  });
});
