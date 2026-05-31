import { describe, it, expect } from 'vitest';
import { bktreeFuzzy, BkTreeFuzzy } from '../bktreeFuzzy';

describe('bktreeFuzzy', () => {
  it('empty tree returns empty search', () => {
    const t = bktreeFuzzy();
    expect(t.search('hello', 1)).toEqual([]);
    expect(t.size()).toBe(0);
  });

  it('insert + size', () => {
    const t = bktreeFuzzy();
    ['cat', 'bat', 'rat'].forEach((s) => t.insert(s));
    expect(t.size()).toBe(3);
  });

  it('duplicates ignored', () => {
    const t = bktreeFuzzy();
    t.insert('cat');
    t.insert('cat');
    expect(t.size()).toBe(1);
  });

  it('search exact match distance 0', () => {
    const t = bktreeFuzzy();
    t.insert('hello');
    const r = t.search('hello', 0);
    expect(r).toEqual([{ value: 'hello', distance: 0 }]);
  });

  it('fuzzy within radius', () => {
    const t = bktreeFuzzy();
    ['kitten', 'sitting', 'kitten', 'kit', 'bitten'].forEach((s) => t.insert(s));
    const r = t.search('kitten', 1).map((x) => x.value).sort();
    expect(r).toContain('kitten');
    expect(r).toContain('bitten');
  });

  it('results sorted by distance', () => {
    const t = bktreeFuzzy();
    ['cat', 'bat', 'rat', 'cab', 'cot'].forEach((s) => t.insert(s));
    const r = t.search('cat', 2);
    for (let i = 1; i < r.length; i += 1) {
      expect(r[i].distance).toBeGreaterThanOrEqual(r[i - 1].distance);
    }
  });

  it('throws on negative radius', () => {
    const t = bktreeFuzzy();
    t.insert('a');
    expect(() => t.search('a', -1)).toThrow();
  });

  it('out of radius returns []', () => {
    const t = bktreeFuzzy();
    t.insert('hello');
    expect(t.search('world', 1)).toEqual([]);
  });

  it('factory and class', () => {
    const t = new BkTreeFuzzy<string>();
    t.insert('a');
    expect(t.search('a', 0)[0].value).toBe('a');
  });

  it('custom distance', () => {
    const t = bktreeFuzzy<number>((a, b) => Math.abs(a - b));
    [1, 5, 10, 12].forEach((n) => t.insert(n));
    const r = t.search(11, 2);
    expect(r.map((x) => x.value).sort((a, b) => a - b)).toEqual([10, 12]);
  });

  it('single insertion radius 0 finds it', () => {
    const t = bktreeFuzzy();
    t.insert('foo');
    expect(t.search('foo', 0).length).toBe(1);
  });

  it('large insertion bulk', () => {
    const t = bktreeFuzzy();
    const words = ['alpha', 'alpaca', 'aloha', 'apple', 'amphora', 'amber'];
    words.forEach((w) => t.insert(w));
    const r = t.search('apha', 2).map((x) => x.value).sort();
    expect(r).toContain('alpha');
  });
});
