import { describe, it, expect } from 'vitest';
import {
  canonicalJsonStringify,
  canonicalJsonHash,
} from '../canonicalJsonHash';

describe('canonicalJsonHash', () => {
  it('stringifies primitives like JSON', () => {
    expect(canonicalJsonStringify(1)).toBe('1');
    expect(canonicalJsonStringify('x')).toBe('"x"');
    expect(canonicalJsonStringify(true)).toBe('true');
    expect(canonicalJsonStringify(null)).toBe('null');
  });

  it('undefined -> null', () => {
    expect(canonicalJsonStringify(undefined)).toBe('null');
  });

  it('non-finite numbers -> null', () => {
    expect(canonicalJsonStringify(NaN)).toBe('null');
    expect(canonicalJsonStringify(Infinity)).toBe('null');
  });

  it('bigint as decimal string', () => {
    expect(canonicalJsonStringify(BigInt(10))).toBe('"10"');
  });

  it('sorts object keys by default', () => {
    expect(canonicalJsonStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('preserves key order when sortKeys=false', () => {
    expect(canonicalJsonStringify({ b: 1, a: 2 }, { sortKeys: false })).toBe('{"b":1,"a":2}');
  });

  it('drops undefined object fields', () => {
    expect(canonicalJsonStringify({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it('arrays preserve order', () => {
    expect(canonicalJsonStringify([3, 1, 2])).toBe('[3,1,2]');
  });

  it('deep-sort nested objects', () => {
    expect(canonicalJsonStringify({ z: { b: 1, a: 2 }, a: [{ y: 1, x: 2 }] }))
      .toBe('{"a":[{"x":2,"y":1}],"z":{"a":2,"b":1}}');
  });

  it('hash deterministic across key reordering', () => {
    const h1 = canonicalJsonHash({ a: 1, b: [1, 2, 3], c: { x: 'y' } });
    const h2 = canonicalJsonHash({ c: { x: 'y' }, b: [1, 2, 3], a: 1 });
    expect(h1).toBe(h2);
  });

  it('hash differs for different content', () => {
    expect(canonicalJsonHash({ a: 1 })).not.toBe(canonicalJsonHash({ a: 2 }));
  });

  it('hash is 64-char hex', () => {
    expect(canonicalJsonHash({})).toMatch(/^[0-9a-f]{64}$/);
  });

  it('special non-plain objects fall back to string', () => {
    class Foo { toString() { return 'foo'; } }
    expect(canonicalJsonStringify(new Foo())).toBe('"foo"');
  });
});
