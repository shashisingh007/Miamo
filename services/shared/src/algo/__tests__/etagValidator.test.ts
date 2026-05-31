import { describe, it, expect } from 'vitest';
import {
  parseEtag,
  parseEtagList,
  etagStrongEquals,
  etagWeakEquals,
  ifMatchAllows,
  ifNoneMatchAllows,
} from '../etagValidator';

describe('etagValidator', () => {
  it('parses strong etag', () => {
    expect(parseEtag('"abc"')).toEqual({ raw: '"abc"', opaque: 'abc', weak: false });
  });

  it('parses weak etag', () => {
    expect(parseEtag('W/"abc"')).toEqual({ raw: 'W/"abc"', opaque: 'abc', weak: true });
  });

  it('rejects malformed etag', () => {
    expect(parseEtag('abc')).toBeNull();
    expect(parseEtag('"abc')).toBeNull();
    expect(parseEtag('')).toBeNull();
  });

  it('parses comma-separated list', () => {
    const list = parseEtagList('"a", W/"b", "c"');
    expect(list).toHaveLength(3);
    expect(list[1].weak).toBe(true);
  });

  it('ignores commas inside quoted opaque', () => {
    const list = parseEtagList('"a,b", "c"');
    expect(list).toHaveLength(2);
    expect(list[0].opaque).toBe('a,b');
  });

  it('strong equals requires both non-weak', () => {
    const a = parseEtag('"x"')!;
    const b = parseEtag('W/"x"')!;
    expect(etagStrongEquals(a, a)).toBe(true);
    expect(etagStrongEquals(a, b)).toBe(false);
  });

  it('weak equals ignores weak flag', () => {
    const a = parseEtag('"x"')!;
    const b = parseEtag('W/"x"')!;
    expect(etagWeakEquals(a, b)).toBe(true);
  });

  it('If-Match absent header allows', () => {
    expect(ifMatchAllows(undefined, parseEtag('"x"'))).toBe(true);
  });

  it('If-Match wildcard requires current resource', () => {
    expect(ifMatchAllows('*', parseEtag('"x"'))).toBe(true);
    expect(ifMatchAllows('*', null)).toBe(false);
  });

  it('If-Match uses strong comparison (weak tag never matches)', () => {
    const cur = parseEtag('"x"');
    expect(ifMatchAllows('"x"', cur)).toBe(true);
    expect(ifMatchAllows('W/"x"', cur)).toBe(false);
  });

  it('If-Match returns false when no current and not wildcard', () => {
    expect(ifMatchAllows('"x"', null)).toBe(false);
  });

  it('If-None-Match absent header allows', () => {
    expect(ifNoneMatchAllows(undefined, parseEtag('"x"'))).toBe(true);
  });

  it('If-None-Match wildcard blocks any existing resource', () => {
    expect(ifNoneMatchAllows('*', parseEtag('"x"'))).toBe(false);
    expect(ifNoneMatchAllows('*', null)).toBe(true);
  });

  it('If-None-Match uses weak comparison', () => {
    const cur = parseEtag('"x"');
    expect(ifNoneMatchAllows('W/"x"', cur)).toBe(false);
    expect(ifNoneMatchAllows('"y"', cur)).toBe(true);
  });

  it('If-None-Match allows when no current resource (non-wildcard)', () => {
    expect(ifNoneMatchAllows('"x"', null)).toBe(true);
  });
});
