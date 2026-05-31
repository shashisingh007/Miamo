import { describe, it, expect } from 'vitest';
import { TrieAutocomplete } from '../trieAutocomplete';

describe('TrieAutocomplete', () => {
  it('empty trie => no suggestions', () => {
    expect(new TrieAutocomplete().suggest('a')).toEqual([]);
  });

  it('insert + has', () => {
    const t = new TrieAutocomplete();
    t.insert('apple');
    expect(t.has('apple')).toBe(true);
    expect(t.has('app')).toBe(false);
  });

  it('count tracks distinct inserts', () => {
    const t = new TrieAutocomplete();
    t.insert('apple');
    t.insert('apply');
    t.insert('apple'); // dup
    expect(t.count).toBe(2);
  });

  it('suggest returns prefix matches', () => {
    const t = new TrieAutocomplete();
    t.insert('apple');
    t.insert('apply');
    t.insert('banana');
    expect(t.suggest('ap').sort()).toEqual(['apple', 'apply']);
  });

  it('suggest sorts by weight desc', () => {
    const t = new TrieAutocomplete();
    t.insert('apple', 1);
    t.insert('apply', 10);
    t.insert('apex', 5);
    expect(t.suggest('ap')).toEqual(['apply', 'apex', 'apple']);
  });

  it('suggest tie-breaks lex asc', () => {
    const t = new TrieAutocomplete();
    t.insert('banana', 5);
    t.insert('banjo', 5);
    t.insert('bandit', 5);
    expect(t.suggest('ban')).toEqual(['banana', 'bandit', 'banjo']);
  });

  it('respects limit', () => {
    const t = new TrieAutocomplete();
    for (const w of ['ab', 'abc', 'abd', 'abe']) t.insert(w, 1);
    expect(t.suggest('a', 2)).toHaveLength(2);
  });

  it('no prefix match => empty', () => {
    const t = new TrieAutocomplete();
    t.insert('apple');
    expect(t.suggest('z')).toEqual([]);
  });

  it('case-insensitive by default', () => {
    const t = new TrieAutocomplete();
    t.insert('Apple');
    expect(t.has('apple')).toBe(true);
    expect(t.suggest('APP')).toContain('Apple');
  });

  it('case-sensitive mode', () => {
    const t = new TrieAutocomplete({ caseSensitive: true });
    t.insert('Apple');
    expect(t.has('apple')).toBe(false);
    expect(t.has('Apple')).toBe(true);
  });

  it('rejects empty word', () => {
    expect(() => new TrieAutocomplete().insert('')).toThrow();
  });

  it('rejects non-string word', () => {
    expect(() => new TrieAutocomplete().insert(1 as any)).toThrow();
  });

  it('rejects non-finite weight', () => {
    expect(() => new TrieAutocomplete().insert('x', NaN)).toThrow();
  });

  it('rejects non-string prefix in suggest', () => {
    expect(() => new TrieAutocomplete().suggest(123 as any)).toThrow();
  });

  it('rejects bad limit', () => {
    const t = new TrieAutocomplete();
    t.insert('apple');
    expect(() => t.suggest('a', 0)).toThrow();
    expect(() => t.suggest('a', -1)).toThrow();
    expect(() => t.suggest('a', 1.5)).toThrow();
  });

  it('updates weight on re-insert', () => {
    const t = new TrieAutocomplete();
    t.insert('apple', 1);
    t.insert('apply', 2);
    t.insert('apple', 10);
    expect(t.suggest('ap')).toEqual(['apple', 'apply']);
  });

  it('exact match yields itself', () => {
    const t = new TrieAutocomplete();
    t.insert('apple');
    expect(t.suggest('apple')).toEqual(['apple']);
  });

  it('preserves original casing in output', () => {
    const t = new TrieAutocomplete();
    t.insert('AppLE');
    expect(t.suggest('app')).toEqual(['AppLE']);
  });

  it('unicode characters supported', () => {
    const t = new TrieAutocomplete();
    t.insert('café');
    t.insert('cap');
    expect(t.suggest('caf')).toEqual(['café']);
  });

  it('handles large word set', () => {
    const t = new TrieAutocomplete();
    for (let i = 0; i < 200; i++) t.insert('word' + i, i);
    const r = t.suggest('word', 5);
    expect(r).toHaveLength(5);
    expect(r[0]).toBe('word199');
  });

  it('prefix that equals stored word', () => {
    const t = new TrieAutocomplete();
    t.insert('go');
    t.insert('goal');
    t.insert('gone');
    expect(t.suggest('go').sort()).toEqual(['go', 'goal', 'gone']);
  });

  it('different prefixes yield independent results', () => {
    const t = new TrieAutocomplete();
    t.insert('cat');
    t.insert('cot');
    expect(t.suggest('ca')).toEqual(['cat']);
    expect(t.suggest('co')).toEqual(['cot']);
  });

  it('has returns false for partial prefix node', () => {
    const t = new TrieAutocomplete();
    t.insert('apple');
    expect(t.has('app')).toBe(false);
    expect(t.has('apple')).toBe(true);
  });
});
