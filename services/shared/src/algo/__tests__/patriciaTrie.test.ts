import { describe, it, expect } from 'vitest';
import { PatriciaTrie } from '../patriciaTrie';

describe('PatriciaTrie', () => {
  it('empty has size 0', () => {
    const t = new PatriciaTrie<number>();
    expect(t.size).toBe(0);
    expect(t.get('a')).toBeUndefined();
    expect(t.has('a')).toBe(false);
  });

  it('single insert', () => {
    const t = new PatriciaTrie<number>();
    t.set('hello', 1);
    expect(t.size).toBe(1);
    expect(t.get('hello')).toBe(1);
    expect(t.has('hello')).toBe(true);
  });

  it('update existing key', () => {
    const t = new PatriciaTrie<number>();
    t.set('a', 1);
    t.set('a', 2);
    expect(t.size).toBe(1);
    expect(t.get('a')).toBe(2);
  });

  it('two distinct keys', () => {
    const t = new PatriciaTrie<number>();
    t.set('apple', 1);
    t.set('banana', 2);
    expect(t.get('apple')).toBe(1);
    expect(t.get('banana')).toBe(2);
    expect(t.size).toBe(2);
  });

  it('many keys', () => {
    const t = new PatriciaTrie<string>();
    const words = ['cat', 'car', 'cart', 'card', 'care', 'dog', 'door', 'dorm'];
    words.forEach((w, i) => t.set(w, `v${i}`));
    for (let i = 0; i < words.length; i += 1) {
      expect(t.get(words[i])).toBe(`v${i}`);
    }
    expect(t.size).toBe(words.length);
  });

  it('missing key => undefined', () => {
    const t = new PatriciaTrie<number>();
    t.set('hello', 1);
    expect(t.get('world')).toBeUndefined();
    expect(t.has('world')).toBe(false);
  });

  it('keys() returns all', () => {
    const t = new PatriciaTrie<number>();
    const ws = ['ab', 'ac', 'ad', 'b', 'c'];
    ws.forEach((w, i) => t.set(w, i));
    expect(t.keys().sort()).toEqual(ws.sort());
  });

  it('prefix-sharing keys distinguish', () => {
    const t = new PatriciaTrie<number>();
    t.set('a', 1);
    t.set('ab', 2);
    t.set('abc', 3);
    expect(t.get('a')).toBe(1);
    expect(t.get('ab')).toBe(2);
    expect(t.get('abc')).toBe(3);
  });

  it('throws on non-string key', () => {
    const t = new PatriciaTrie<number>();
    expect(() => t.set(123 as any, 1)).toThrow(TypeError);
  });

  it('empty string key', () => {
    const t = new PatriciaTrie<number>();
    t.set('', 42);
    expect(t.get('')).toBe(42);
  });

  it('many random-ish keys', () => {
    const t = new PatriciaTrie<number>();
    const ks: string[] = [];
    for (let i = 0; i < 50; i += 1) {
      ks.push(`k${i}-${(i * 7) % 13}`);
      t.set(ks[i], i);
    }
    for (let i = 0; i < 50; i += 1) expect(t.get(ks[i])).toBe(i);
  });

  it('has lookups consistent', () => {
    const t = new PatriciaTrie<number>();
    t.set('alpha', 1);
    t.set('beta', 2);
    expect(t.has('alpha')).toBe(true);
    expect(t.has('beta')).toBe(true);
    expect(t.has('gamma')).toBe(false);
  });
});
