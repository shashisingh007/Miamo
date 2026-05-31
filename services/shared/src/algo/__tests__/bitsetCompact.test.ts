import { describe, it, expect } from 'vitest';
import { BitsetCompact } from '../bitsetCompact';

describe('BitsetCompact', () => {
  it('rejects bad size', () => {
    expect(() => new BitsetCompact(-1)).toThrow();
    expect(() => new BitsetCompact(1.5)).toThrow();
  });

  it('size 0 ok', () => {
    const b = new BitsetCompact(0);
    expect(b.size).toBe(0);
  });

  it('all bits zero initially', () => {
    const b = new BitsetCompact(100);
    for (let i = 0; i < 100; i++) expect(b.get(i)).toBe(false);
  });

  it('set/get', () => {
    const b = new BitsetCompact(100);
    b.set(50);
    expect(b.get(50)).toBe(true);
    expect(b.get(49)).toBe(false);
    expect(b.get(51)).toBe(false);
  });

  it('clear', () => {
    const b = new BitsetCompact(100);
    b.set(50);
    b.clear(50);
    expect(b.get(50)).toBe(false);
  });

  it('toggle', () => {
    const b = new BitsetCompact(100);
    b.toggle(10);
    expect(b.get(10)).toBe(true);
    b.toggle(10);
    expect(b.get(10)).toBe(false);
  });

  it('out-of-range throws', () => {
    const b = new BitsetCompact(10);
    expect(() => b.set(10)).toThrow();
    expect(() => b.get(-1)).toThrow();
  });

  it('popcount', () => {
    const b = new BitsetCompact(100);
    for (let i = 0; i < 50; i++) b.set(i * 2);
    expect(b.popcount()).toBe(50);
  });

  it('setAll then popcount = size', () => {
    const b = new BitsetCompact(100);
    b.setAll();
    expect(b.popcount()).toBe(100);
  });

  it('setAll respects size at last word', () => {
    const b = new BitsetCompact(33);
    b.setAll();
    expect(b.popcount()).toBe(33);
  });

  it('clearAll', () => {
    const b = new BitsetCompact(100);
    b.setAll();
    b.clearAll();
    expect(b.popcount()).toBe(0);
  });

  it('and', () => {
    const a = new BitsetCompact(10);
    const b = new BitsetCompact(10);
    a.set(0); a.set(1); a.set(2);
    b.set(1); b.set(2); b.set(3);
    expect(a.and(b).toIndexArray()).toEqual([1, 2]);
  });

  it('or', () => {
    const a = new BitsetCompact(10);
    const b = new BitsetCompact(10);
    a.set(0);
    b.set(1);
    expect(a.or(b).toIndexArray()).toEqual([0, 1]);
  });

  it('xor', () => {
    const a = new BitsetCompact(10);
    const b = new BitsetCompact(10);
    a.set(0); a.set(1);
    b.set(1); b.set(2);
    expect(a.xor(b).toIndexArray()).toEqual([0, 2]);
  });

  it('size mismatch throws', () => {
    const a = new BitsetCompact(10);
    const b = new BitsetCompact(20);
    expect(() => a.and(b)).toThrow();
    expect(() => a.or(b)).toThrow();
    expect(() => a.xor(b)).toThrow();
  });

  it('toIndexArray empty', () => {
    expect(new BitsetCompact(10).toIndexArray()).toEqual([]);
  });

  it('handles cross-word bits', () => {
    const b = new BitsetCompact(100);
    b.set(31); b.set(32); b.set(63); b.set(64);
    expect(b.popcount()).toBe(4);
    expect(b.toIndexArray()).toEqual([31, 32, 63, 64]);
  });

  it('chainable', () => {
    const b = new BitsetCompact(10);
    b.set(1).set(2).set(3);
    expect(b.popcount()).toBe(3);
  });

  it('large bitset 10k', () => {
    const b = new BitsetCompact(10000);
    for (let i = 0; i < 10000; i += 7) b.set(i);
    expect(b.popcount()).toBe(Math.ceil(10000 / 7));
  });
});
