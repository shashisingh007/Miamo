import { describe, it, expect } from 'vitest';
import { RadixTreePrefix } from '../radixTreePrefix';

describe('RadixTreePrefix', () => {
  it('empty tree returns undefined', () => {
    const t = new RadixTreePrefix<number>();
    expect(t.get('foo')).toBeUndefined();
  });

  it('insert and get', () => {
    const t = new RadixTreePrefix<number>();
    t.insert('hello', 1);
    expect(t.get('hello')).toBe(1);
  });

  it('insert two with common prefix', () => {
    const t = new RadixTreePrefix<number>();
    t.insert('test', 1);
    t.insert('team', 2);
    expect(t.get('test')).toBe(1);
    expect(t.get('team')).toBe(2);
    expect(t.get('te')).toBeUndefined();
  });

  it('overwrite existing key', () => {
    const t = new RadixTreePrefix<number>();
    t.insert('a', 1);
    t.insert('a', 2);
    expect(t.get('a')).toBe(2);
  });

  it('insert nested', () => {
    const t = new RadixTreePrefix<number>();
    t.insert('cat', 1);
    t.insert('cater', 2);
    expect(t.get('cat')).toBe(1);
    expect(t.get('cater')).toBe(2);
  });

  it('get non-existent', () => {
    const t = new RadixTreePrefix<number>();
    t.insert('foo', 1);
    expect(t.get('bar')).toBeUndefined();
    expect(t.get('foobar')).toBeUndefined();
  });

  it('hasPrefix', () => {
    const t = new RadixTreePrefix<number>();
    t.insert('hello', 1);
    expect(t.hasPrefix('hel')).toBe(true);
    expect(t.hasPrefix('hello')).toBe(true);
    expect(t.hasPrefix('hex')).toBe(false);
  });

  it('hasPrefix empty', () => {
    const t = new RadixTreePrefix<number>();
    t.insert('a', 1);
    expect(t.hasPrefix('')).toBe(true);
  });

  it('collectByPrefix returns all matching keys', () => {
    const t = new RadixTreePrefix<number>();
    t.insert('apple', 1);
    t.insert('app', 2);
    t.insert('application', 3);
    t.insert('banana', 4);
    const got = t.collectByPrefix('app').sort();
    expect(got).toEqual(['app', 'apple', 'application']);
  });

  it('collectByPrefix empty prefix returns all', () => {
    const t = new RadixTreePrefix<number>();
    t.insert('a', 1);
    t.insert('b', 2);
    t.insert('c', 3);
    expect(t.collectByPrefix('').sort()).toEqual(['a', 'b', 'c']);
  });

  it('collectByPrefix no match', () => {
    const t = new RadixTreePrefix<number>();
    t.insert('apple', 1);
    expect(t.collectByPrefix('xyz')).toEqual([]);
  });

  it('handles many keys', () => {
    const t = new RadixTreePrefix<number>();
    const keys = ['romane', 'romanus', 'romulus', 'rubens', 'ruber', 'rubicon', 'rubicundus'];
    keys.forEach((k, i) => t.insert(k, i));
    for (let i = 0; i < keys.length; i += 1) expect(t.get(keys[i])).toBe(i);
    expect(t.collectByPrefix('rub').sort()).toEqual(['rubens', 'ruber', 'rubicon', 'rubicundus']);
  });

  it('insert empty key', () => {
    const t = new RadixTreePrefix<number>();
    t.insert('', 99);
    expect(t.get('')).toBe(99);
  });

  it('split existing edge', () => {
    const t = new RadixTreePrefix<number>();
    t.insert('test', 1);
    t.insert('te', 2);
    expect(t.get('te')).toBe(2);
    expect(t.get('test')).toBe(1);
  });
});
