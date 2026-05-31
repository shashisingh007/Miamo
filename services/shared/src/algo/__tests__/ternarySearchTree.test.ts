import { describe, it, expect } from 'vitest';
import { ternarySearchTree, TernarySearchTree } from '../ternarySearchTree';

describe('ternarySearchTree', () => {
  it('empty tree has nothing', () => {
    const t = ternarySearchTree();
    expect(t.size()).toBe(0);
    expect(t.has('foo')).toBe(false);
  });

  it('insert + has', () => {
    const t = ternarySearchTree();
    t.insert('hello');
    t.insert('world');
    expect(t.has('hello')).toBe(true);
    expect(t.has('world')).toBe(true);
    expect(t.has('help')).toBe(false);
    expect(t.size()).toBe(2);
  });

  it('duplicates do not grow size', () => {
    const t = ternarySearchTree();
    t.insert('cat');
    t.insert('cat');
    expect(t.size()).toBe(1);
  });

  it('prefix in tree returns matches', () => {
    const t = ternarySearchTree();
    ['cat', 'car', 'cart', 'dog'].forEach((k) => t.insert(k));
    expect(t.keysWithPrefix('ca').sort()).toEqual(['car', 'cart', 'cat']);
  });

  it('exact key as prefix', () => {
    const t = ternarySearchTree();
    ['cat', 'cats'].forEach((k) => t.insert(k));
    expect(t.keysWithPrefix('cat').sort()).toEqual(['cat', 'cats']);
  });

  it('empty prefix => all keys', () => {
    const t = ternarySearchTree();
    ['a', 'ab', 'abc', 'b'].forEach((k) => t.insert(k));
    expect(t.keysWithPrefix('').sort()).toEqual(['a', 'ab', 'abc', 'b']);
  });

  it('missing prefix => empty', () => {
    const t = ternarySearchTree();
    t.insert('hello');
    expect(t.keysWithPrefix('xyz')).toEqual([]);
  });

  it('empty key not contained', () => {
    const t = ternarySearchTree();
    expect(t.has('')).toBe(false);
  });

  it('throws on insert empty', () => {
    const t = ternarySearchTree();
    expect(() => t.insert('')).toThrow();
  });

  it('factory and class equivalent', () => {
    const t = new TernarySearchTree();
    t.insert('a');
    expect(t.has('a')).toBe(true);
  });

  it('single-char keys', () => {
    const t = ternarySearchTree();
    ['a', 'b', 'c'].forEach((k) => t.insert(k));
    expect(t.size()).toBe(3);
    expect(t.has('b')).toBe(true);
    expect(t.has('d')).toBe(false);
  });
});
