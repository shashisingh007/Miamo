import { describe, it, expect } from 'vitest';
import { weakEtag, matchesIfNoneMatch } from '../etagWeak';

describe('etagWeak', () => {
  it('produces a W/-prefixed quoted token', () => {
    expect(weakEtag({ a: 1 })).toMatch(/^W\/"[0-9a-f]+-[0-9a-f]+"$/);
  });

  it('is stable for equal objects regardless of key order', () => {
    expect(weakEtag({ a: 1, b: 2 })).toBe(weakEtag({ b: 2, a: 1 }));
  });

  it('changes when payload changes', () => {
    expect(weakEtag({ a: 1 })).not.toBe(weakEtag({ a: 2 }));
    expect(weakEtag([1, 2])).not.toBe(weakEtag([1, 2, 3]));
  });

  it('handles strings, arrays, nulls', () => {
    expect(weakEtag('hello')).toMatch(/^W\//);
    expect(weakEtag(null)).toMatch(/^W\//);
    expect(weakEtag([])).toMatch(/^W\//);
  });

  it('matchesIfNoneMatch: exact match (with/without W/ prefix)', () => {
    const tag = weakEtag({ x: 1 });
    expect(matchesIfNoneMatch(tag, tag)).toBe(true);
    expect(matchesIfNoneMatch(tag, tag.replace(/^W\//, ''))).toBe(true);
  });

  it('matchesIfNoneMatch: wildcard', () => {
    expect(matchesIfNoneMatch(weakEtag({}), '*')).toBe(true);
  });

  it('matchesIfNoneMatch: comma list', () => {
    const tag = weakEtag({ q: 1 });
    expect(matchesIfNoneMatch(tag, `W/"deadbeef-1", ${tag}, W/"cafebabe-2"`)).toBe(true);
  });

  it('matchesIfNoneMatch: no match', () => {
    expect(matchesIfNoneMatch(weakEtag({ a: 1 }), weakEtag({ a: 2 }))).toBe(false);
    expect(matchesIfNoneMatch(weakEtag({}), null)).toBe(false);
    expect(matchesIfNoneMatch(weakEtag({}), undefined)).toBe(false);
    expect(matchesIfNoneMatch(weakEtag({}), '')).toBe(false);
  });

  it('nested key-order independence', () => {
    expect(weakEtag({ a: { x: 1, y: 2 } })).toBe(weakEtag({ a: { y: 2, x: 1 } }));
  });
});
