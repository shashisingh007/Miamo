import { describe, it, expect } from 'vitest';
import { expandUriTemplate, listUriTemplateVars } from '../urlTemplateExpander';

describe('urlTemplateExpander (RFC 6570)', () => {
  it('level 1 simple', () => {
    expect(expandUriTemplate('/users/{id}', { id: '42' })).toBe('/users/42');
  });

  it('omits undefined vars', () => {
    expect(expandUriTemplate('/x/{a}/{b}', { a: '1' })).toBe('/x/1/');
  });

  it('percent-encodes unreserved exception', () => {
    expect(expandUriTemplate('/q/{term}', { term: 'hello world' })).toBe('/q/hello%20world');
  });

  it('reserved operator + preserves reserved chars', () => {
    expect(expandUriTemplate('/{+path}', { path: '/foo/bar' })).toBe('//foo/bar');
  });

  it('fragment operator #', () => {
    expect(expandUriTemplate('/x{#frag}', { frag: 'top' })).toBe('/x#top');
  });

  it('label operator .', () => {
    expect(expandUriTemplate('file{.ext}', { ext: 'json' })).toBe('file.json');
  });

  it('path segment /', () => {
    expect(expandUriTemplate('{/a,b}', { a: 'x', b: 'y' })).toBe('/x/y');
  });

  it('path-style ;', () => {
    expect(expandUriTemplate('{;x,y}', { x: '1', y: '2' })).toBe(';x=1;y=2');
  });

  it('form-style query ?', () => {
    expect(expandUriTemplate('/q{?a,b}', { a: '1', b: '2' })).toBe('/q?a=1&b=2');
  });

  it('form continuation &', () => {
    expect(expandUriTemplate('/q?x=0{&a}', { a: '1' })).toBe('/q?x=0&a=1');
  });

  it('list comma-joined when not exploded', () => {
    expect(expandUriTemplate('{?list}', { list: ['a', 'b', 'c'] })).toBe('?list=a,b,c');
  });

  it('list exploded with named op', () => {
    expect(expandUriTemplate('{?list*}', { list: ['a', 'b'] })).toBe('?list=a&list=b');
  });

  it('list exploded with path op /', () => {
    expect(expandUriTemplate('{/list*}', { list: ['a', 'b'] })).toBe('/a/b');
  });

  it('assoc joined when not exploded', () => {
    expect(expandUriTemplate('{?obj}', { obj: { k1: 'v1', k2: 'v2' } })).toBe('?obj=k1,v1,k2,v2');
  });

  it('assoc exploded gives k=v pairs', () => {
    expect(expandUriTemplate('{?obj*}', { obj: { a: '1', b: '2' } })).toBe('?a=1&b=2');
  });

  it('prefix modifier :n truncates string', () => {
    expect(expandUriTemplate('/{name:3}', { name: 'abcdef' })).toBe('/abc');
  });

  it('omits empty array', () => {
    expect(expandUriTemplate('/x{?list}', { list: [] })).toBe('/x');
  });

  it('omits empty object', () => {
    expect(expandUriTemplate('/x{?obj}', { obj: {} })).toBe('/x');
  });

  it('multiple vars share separator', () => {
    expect(expandUriTemplate('{?a,b,c}', { a: '1', b: '2', c: '3' })).toBe('?a=1&b=2&c=3');
  });

  it('numeric values stringified', () => {
    expect(expandUriTemplate('/{n}', { n: 7 })).toBe('/7');
  });

  it('boolean values stringified', () => {
    expect(expandUriTemplate('{?on}', { on: true })).toBe('?on=true');
  });

  it('null treated as undefined', () => {
    expect(expandUriTemplate('/{a}', { a: null })).toBe('/');
  });

  it('empty value with form ? op produces ?a= (ifEmpty="=")', () => {
    expect(expandUriTemplate('{?a}', { a: '' })).toBe('?a=');
  });

  it('empty value with path-style ; op produces ;a (ifEmpty="")', () => {
    expect(expandUriTemplate('{;a}', { a: '' })).toBe(';a');
  });

  it('listUriTemplateVars extracts names', () => {
    expect(listUriTemplateVars('/{a}/{+b}{?c,d*,e:3}').sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('invalid prefix throws', () => {
    expect(() => expandUriTemplate('{a:abc}', { a: 'x' })).toThrow();
  });

  it('non-string template throws', () => {
    expect(() => expandUriTemplate(123 as any, {})).toThrow();
  });

  it('handles bare template without ops', () => {
    expect(expandUriTemplate('static/path', { x: '1' })).toBe('static/path');
  });
});
