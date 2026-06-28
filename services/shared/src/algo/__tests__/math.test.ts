import { describe, it, expect } from 'vitest';
import { compose, cosine, cosTo01, expDecay, logScale, jaccard, clip01 } from '../math';
import { LRU } from '../lru';
import { consentTagFromScopes } from '../consent';

describe('math', () => {
  it('cosine: identical = 1, orthogonal = 0', () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([1, 0, 0]);
    const c = new Float32Array([0, 1, 0]);
    expect(cosine(a, b)).toBeCloseTo(1, 5);
    expect(cosine(a, c)).toBeCloseTo(0, 5);
  });
  it('cosTo01 maps [-1,1] → [0,1]', () => {
    expect(cosTo01(-1)).toBe(0);
    expect(cosTo01(0)).toBe(0.5);
    expect(cosTo01(1)).toBe(1);
  });
  it('expDecay halves at halfLife', () => {
    expect(expDecay(0, 10)).toBeCloseTo(1, 5);
    expect(expDecay(10, 10)).toBeCloseTo(0.5, 3);
    expect(expDecay(100, 10)).toBeLessThan(0.01);
  });
  it('logScale: 0→0, cap→1', () => {
    expect(logScale(0, 100)).toBe(0);
    expect(logScale(100, 100)).toBe(1);
    expect(logScale(10, 100)).toBeGreaterThan(0.3);
  });
  it('jaccard', () => {
    expect(jaccard(['a','b','c'], ['b','c','d'])).toBeCloseTo(2/4, 5);
    expect(jaccard([], [])).toBe(0);
  });
  it('clip01', () => {
    expect(clip01(-0.5)).toBe(0);
    expect(clip01(1.5)).toBe(1);
    expect(clip01(0.5)).toBe(0.5);
  });
  it('compose: full breakdown', () => {
    const s = compose({ a: 1, b: 0 }, { a: 0.5, b: 0.5 });
    expect(s).toBe(0.5);
  });
  it('compose: null signals drop and renormalise', () => {
    const s = compose({ a: 1, b: null }, { a: 0.5, b: 0.5 });
    expect(s).toBe(1); // a alone gets all the weight
  });
  it('compose: all null → 0', () => {
    const s = compose({ a: null, b: null }, { a: 0.5, b: 0.5 });
    expect(s).toBe(0);
  });
});

describe('LRU', () => {
  it('evicts oldest at capacity', () => {
    const c = new LRU<string, number>(2);
    c.set('a', 1); c.set('b', 2); c.set('c', 3);
    expect(c.get('a')).toBeUndefined();
    expect(c.get('b')).toBe(2);
    expect(c.get('c')).toBe(3);
  });
  it('bumps recency on get', () => {
    const c = new LRU<string, number>(2);
    c.set('a', 1); c.set('b', 2);
    c.get('a');
    c.set('c', 3); // evicts b, not a
    expect(c.get('a')).toBe(1);
    expect(c.get('b')).toBeUndefined();
  });
  it('expires by TTL', async () => {
    const c = new LRU<string, number>(2);
    c.set('a', 1, 1);
    await new Promise(r => setTimeout(r, 5));
    expect(c.get('a')).toBeUndefined();
  });
});

describe('consentTagFromScopes', () => {
  it('full when both analytics + personalization granted', () => {
    expect(consentTagFromScopes(new Set(['analytics','personalization']))).toBe('full');
  });
  it('personalization-only', () => {
    expect(consentTagFromScopes(new Set(['personalization']))).toBe('personalization-only');
  });
  it('analytics-only', () => {
    expect(consentTagFromScopes(new Set(['analytics']))).toBe('analytics-only');
  });
  it('none', () => {
    expect(consentTagFromScopes(new Set())).toBe('none');
  });
});
