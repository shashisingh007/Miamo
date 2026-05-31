import { describe, it, expect } from 'vitest';
import {
  resolveJsonPointer,
  hasJsonPointer,
  escapeJsonPointerToken,
  buildJsonPointer,
  setJsonPointer,
} from '../jsonPointerResolver';

const RFC_DOC = {
  foo: ['bar', 'baz'],
  '': 0,
  'a/b': 1,
  'c%d': 2,
  'e^f': 3,
  'g|h': 4,
  'i\\j': 5,
  'k"l': 6,
  ' ': 7,
  'm~n': 8,
};

describe('jsonPointerResolver (RFC 6901)', () => {
  it('empty pointer returns whole doc', () => {
    expect(resolveJsonPointer(RFC_DOC, '')).toBe(RFC_DOC);
  });

  it('resolves /foo to array', () => {
    expect(resolveJsonPointer(RFC_DOC, '/foo')).toEqual(['bar', 'baz']);
  });

  it('resolves /foo/0', () => {
    expect(resolveJsonPointer(RFC_DOC, '/foo/0')).toBe('bar');
  });

  it('resolves empty key /', () => {
    expect(resolveJsonPointer(RFC_DOC, '/')).toBe(0);
  });

  it('resolves ~1 escape for /', () => {
    expect(resolveJsonPointer(RFC_DOC, '/a~1b')).toBe(1);
  });

  it('resolves ~0 escape for ~', () => {
    expect(resolveJsonPointer(RFC_DOC, '/m~0n')).toBe(8);
  });

  it('resolves special chars', () => {
    expect(resolveJsonPointer(RFC_DOC, '/c%d')).toBe(2);
    expect(resolveJsonPointer(RFC_DOC, '/e^f')).toBe(3);
    expect(resolveJsonPointer(RFC_DOC, '/g|h')).toBe(4);
    expect(resolveJsonPointer(RFC_DOC, '/i\\j')).toBe(5);
    expect(resolveJsonPointer(RFC_DOC, '/k"l')).toBe(6);
    expect(resolveJsonPointer(RFC_DOC, '/ ')).toBe(7);
  });

  it('returns undefined for missing key', () => {
    expect(resolveJsonPointer(RFC_DOC, '/missing')).toBeUndefined();
  });

  it('returns undefined for out-of-range index', () => {
    expect(resolveJsonPointer(RFC_DOC, '/foo/9')).toBeUndefined();
  });

  it('returns undefined for non-numeric on array', () => {
    expect(resolveJsonPointer(RFC_DOC, '/foo/bar')).toBeUndefined();
  });

  it('returns undefined for leading-zero index', () => {
    expect(resolveJsonPointer(RFC_DOC, '/foo/01')).toBeUndefined();
  });

  it('"-" on array returns undefined', () => {
    expect(resolveJsonPointer(RFC_DOC, '/foo/-')).toBeUndefined();
  });

  it('throws on pointer not starting with /', () => {
    expect(() => resolveJsonPointer(RFC_DOC, 'foo')).toThrow();
  });

  it('throws on non-string pointer', () => {
    expect(() => resolveJsonPointer(RFC_DOC, 123 as any)).toThrow();
  });

  it('cannot traverse through primitive', () => {
    expect(resolveJsonPointer(RFC_DOC, '//x')).toBeUndefined();
  });

  it('hasJsonPointer true/false', () => {
    expect(hasJsonPointer(RFC_DOC, '/foo/0')).toBe(true);
    expect(hasJsonPointer(RFC_DOC, '/nope')).toBe(false);
  });

  it('escapeJsonPointerToken', () => {
    expect(escapeJsonPointerToken('a/b~c')).toBe('a~1b~0c');
  });

  it('buildJsonPointer joins escaped tokens', () => {
    expect(buildJsonPointer(['a', 'b/c', '~x'])).toBe('/a/b~1c/~0x');
    expect(buildJsonPointer([])).toBe('');
  });

  it('setJsonPointer with empty pointer replaces root', () => {
    expect(setJsonPointer({ x: 1 } as any, '', { y: 2 } as any)).toEqual({ y: 2 });
  });

  it('setJsonPointer sets object key', () => {
    const d: any = { a: { b: 1 } };
    setJsonPointer(d, '/a/b', 9);
    expect(d.a.b).toBe(9);
  });

  it('setJsonPointer "-" appends to array', () => {
    const d: any = { xs: [1, 2] };
    setJsonPointer(d, '/xs/-', 3);
    expect(d.xs).toEqual([1, 2, 3]);
  });

  it('setJsonPointer throws on missing parent', () => {
    expect(() => setJsonPointer({} as any, '/a/b', 1)).toThrow();
  });

  it('setJsonPointer rejects negative array index', () => {
    expect(() => setJsonPointer({ xs: [1] } as any, '/xs/-1', 2)).toThrow();
  });

  it('escape round-trip via build/parse', () => {
    const p = buildJsonPointer(['weird/key~with', 'plain']);
    expect(resolveJsonPointer({ 'weird/key~with': { plain: 42 } } as any, p)).toBe(42);
  });
});
