import { describe, it, expect } from 'vitest';
import { encodeQueryString, decodeQueryString } from '../queryStringEncoder';

describe('queryStringEncoder', () => {
  it('encodes simple object', () => {
    expect(encodeQueryString({ a: '1', b: '2' })).toBe('a=1&b=2');
  });

  it('encodes space as + (form-urlencoded)', () => {
    expect(encodeQueryString({ q: 'hello world' })).toBe('q=hello+world');
  });

  it('percent-encodes reserved chars', () => {
    expect(encodeQueryString({ q: 'a&b=c' })).toBe('q=a%26b%3Dc');
  });

  it('encodes numbers/booleans/nullish', () => {
    expect(encodeQueryString({ n: 7, b: true, x: false })).toBe('n=7&b=true&x=false');
  });

  it('omits null/undefined by default', () => {
    expect(encodeQueryString({ a: 1, b: null, c: undefined })).toBe('a=1');
  });

  it('includes null/undefined when option set', () => {
    expect(encodeQueryString({ a: null, b: 'x' }, { includeNullish: true })).toBe('a=&b=x');
  });

  it('expands array as repeated keys', () => {
    expect(encodeQueryString({ tag: ['a', 'b', 'c'] })).toBe('tag=a&tag=b&tag=c');
  });

  it('skips empty arrays by default', () => {
    expect(encodeQueryString({ tag: [] as string[], q: 'x' })).toBe('q=x');
  });

  it('sortKeys yields stable output', () => {
    expect(encodeQueryString({ b: 1, a: 2 }, { sortKeys: true })).toBe('a=2&b=1');
  });

  it('skips non-finite numbers', () => {
    expect(encodeQueryString({ n: Infinity, m: NaN, ok: 1 })).toBe('ok=1');
  });

  it('encodes UTF-8 characters', () => {
    const r = encodeQueryString({ name: 'café' });
    expect(r).toBe('name=caf%C3%A9');
  });

  it('decodes simple query', () => {
    expect(decodeQueryString('a=1&b=2')).toEqual({ a: '1', b: '2' });
  });

  it('decodes plus as space', () => {
    expect(decodeQueryString('q=hello+world')).toEqual({ q: 'hello world' });
  });

  it('decodes percent-encoded value', () => {
    expect(decodeQueryString('q=a%26b%3Dc')).toEqual({ q: 'a&b=c' });
  });

  it('strips leading ?', () => {
    expect(decodeQueryString('?a=1')).toEqual({ a: '1' });
  });

  it('handles key without value', () => {
    expect(decodeQueryString('a&b=2')).toEqual({ a: '', b: '2' });
  });

  it('collapses repeated keys to array', () => {
    expect(decodeQueryString('tag=a&tag=b&tag=c')).toEqual({ tag: ['a', 'b', 'c'] });
  });

  it('skips malformed percent escapes', () => {
    const r = decodeQueryString('good=1&bad=%ZZ&ok=2');
    expect(r).toEqual({ good: '1', ok: '2' });
  });

  it('decodes UTF-8', () => {
    expect(decodeQueryString('name=caf%C3%A9')).toEqual({ name: 'café' });
  });

  it('empty string => empty object', () => {
    expect(decodeQueryString('')).toEqual({});
    expect(decodeQueryString('?')).toEqual({});
  });

  it('round-trips a non-array object', () => {
    const obj = { greeting: 'hello world', n: '42', f: 'a&b' };
    expect(decodeQueryString(encodeQueryString(obj))).toEqual(obj);
  });

  it('non-string input to decode throws', () => {
    expect(() => decodeQueryString(123 as any)).toThrow();
  });
});
