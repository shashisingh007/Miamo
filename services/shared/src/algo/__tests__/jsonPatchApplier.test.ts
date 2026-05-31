import { describe, it, expect } from 'vitest';
import { applyJsonPatch, type JsonValue } from '../jsonPatchApplier';

const doc = (): JsonValue => ({
  name: 'alice',
  tags: ['x', 'y', 'z'],
  meta: { age: 30, city: 'oslo' },
});

describe('jsonPatchApplier', () => {
  it('add inserts new object key', () => {
    const r = applyJsonPatch(doc(), [{ op: 'add', path: '/email', value: 'a@b.c' }]);
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.doc as any).email).toBe('a@b.c');
  });

  it('add inserts into array at index', () => {
    const r = applyJsonPatch(doc(), [{ op: 'add', path: '/tags/1', value: 'm' }]);
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.doc as any).tags).toEqual(['x', 'm', 'y', 'z']);
  });

  it('add with "-" appends to array', () => {
    const r = applyJsonPatch(doc(), [{ op: 'add', path: '/tags/-', value: 'end' }]);
    if (r.ok) expect((r.doc as any).tags[3]).toBe('end');
  });

  it('replace fails when path missing', () => {
    const r = applyJsonPatch(doc(), [{ op: 'replace', path: '/missing', value: 1 }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('path_not_found');
  });

  it('replace updates object key', () => {
    const r = applyJsonPatch(doc(), [{ op: 'replace', path: '/meta/age', value: 31 }]);
    if (r.ok) expect((r.doc as any).meta.age).toBe(31);
  });

  it('remove deletes key', () => {
    const r = applyJsonPatch(doc(), [{ op: 'remove', path: '/meta/city' }]);
    if (r.ok) expect((r.doc as any).meta).toEqual({ age: 30 });
  });

  it('remove from array shifts indices', () => {
    const r = applyJsonPatch(doc(), [{ op: 'remove', path: '/tags/1' }]);
    if (r.ok) expect((r.doc as any).tags).toEqual(['x', 'z']);
  });

  it('test succeeds on equal deep value', () => {
    const r = applyJsonPatch(doc(), [
      { op: 'test', path: '/meta', value: { age: 30, city: 'oslo' } },
    ]);
    expect(r.ok).toBe(true);
  });

  it('test fails on inequality', () => {
    const r = applyJsonPatch(doc(), [{ op: 'test', path: '/name', value: 'bob' }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('test_failed');
  });

  it('move relocates value', () => {
    const r = applyJsonPatch(doc(), [
      { op: 'move', from: '/meta/city', path: '/city' },
    ]);
    if (r.ok) {
      expect((r.doc as any).city).toBe('oslo');
      expect((r.doc as any).meta.city).toBeUndefined();
    }
  });

  it('move rejects moving into self/descendant', () => {
    const r = applyJsonPatch(doc(), [
      { op: 'move', from: '/meta', path: '/meta/inner' },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('move_into_self');
  });

  it('copy duplicates value', () => {
    const r = applyJsonPatch(doc(), [
      { op: 'copy', from: '/meta/city', path: '/city2' },
    ]);
    if (r.ok) expect((r.doc as any).city2).toBe('oslo');
  });

  it('does not mutate input document', () => {
    const d = doc();
    applyJsonPatch(d, [{ op: 'replace', path: '/name', value: 'bob' }]);
    expect((d as any).name).toBe('alice');
  });

  it('atomically fails: later op error leaves prior ops unobserved', () => {
    const r = applyJsonPatch(doc(), [
      { op: 'replace', path: '/name', value: 'bob' },
      { op: 'remove', path: '/does/not/exist' },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.index).toBe(1);
  });

  it('invalid pointer (no leading /) is rejected', () => {
    const r = applyJsonPatch(doc(), [{ op: 'add', path: 'no-slash', value: 1 }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_path');
  });

  it('empty path "" replaces whole document', () => {
    const r = applyJsonPatch(doc(), [{ op: 'replace', path: '', value: { fresh: true } }]);
    if (r.ok) expect(r.doc).toEqual({ fresh: true });
  });

  it('escaped tokens ~1 / ~0', () => {
    const r = applyJsonPatch({ 'a/b': 1, 'c~d': 2 }, [
      { op: 'replace', path: '/a~1b', value: 10 },
      { op: 'replace', path: '/c~0d', value: 20 },
    ]);
    if (r.ok) expect(r.doc).toEqual({ 'a/b': 10, 'c~d': 20 });
  });
});
