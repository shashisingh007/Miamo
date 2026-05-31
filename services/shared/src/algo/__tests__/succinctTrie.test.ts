import { describe, it, expect } from 'vitest';
import { succinctTrie, SuccinctTrie } from '../succinctTrie';

describe('succinctTrie', () => {
  it('factory + class', () => {
    expect(succinctTrie() instanceof SuccinctTrie).toBe(true);
  });

  it('insert + has', () => {
    const t = succinctTrie();
    t.insert('cat');
    t.insert('car');
    expect(t.has('cat')).toBe(true);
    expect(t.has('car')).toBe(true);
    expect(t.has('ca')).toBe(false);
    expect(t.has('cats')).toBe(false);
  });

  it('hasPrefix', () => {
    const t = succinctTrie();
    t.insert('cat');
    expect(t.hasPrefix('ca')).toBe(true);
    expect(t.hasPrefix('cat')).toBe(true);
    expect(t.hasPrefix('cab')).toBe(false);
  });

  it('keysWithPrefix', () => {
    const t = succinctTrie();
    ['cat', 'car', 'card', 'dog'].forEach((k) => t.insert(k));
    expect(t.keysWithPrefix('ca').sort()).toEqual(['car', 'card', 'cat']);
    expect(t.keysWithPrefix('d')).toEqual(['dog']);
    expect(t.keysWithPrefix('z')).toEqual([]);
  });

  it('empty key terminal', () => {
    const t = succinctTrie();
    t.insert('');
    expect(t.has('')).toBe(true);
    expect(t.size()).toBe(1);
  });

  it('size counts unique terminals', () => {
    const t = succinctTrie();
    t.insert('a');
    t.insert('a');
    t.insert('b');
    expect(t.size()).toBe(2);
  });

  it('nodeCount grows', () => {
    const t = succinctTrie();
    const start = t.nodeCount();
    t.insert('abc');
    expect(t.nodeCount()).toBe(start + 3);
  });

  it('throws on non-string', () => {
    const t = succinctTrie();
    expect(() => t.insert(123 as any)).toThrow();
  });

  it('shared prefix reuses nodes', () => {
    const t = succinctTrie();
    t.insert('test');
    const after1 = t.nodeCount();
    t.insert('test');
    expect(t.nodeCount()).toBe(after1);
  });

  it('unicode keys supported', () => {
    const t = succinctTrie();
    t.insert('café');
    expect(t.has('café')).toBe(true);
    expect(t.hasPrefix('caf')).toBe(true);
  });

  it('keysWithPrefix empty prefix returns all', () => {
    const t = succinctTrie();
    ['a', 'ab', 'b'].forEach((k) => t.insert(k));
    expect(t.keysWithPrefix('').sort()).toEqual(['a', 'ab', 'b']);
  });
});
