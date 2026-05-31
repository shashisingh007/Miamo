import { describe, it, expect } from 'vitest';
import {
  SpaceSavingHeavyHitters,
  spaceSavingHeavyHitters,
} from '../spaceSavingHeavyHitters';

describe('SpaceSavingHeavyHitters', () => {
  it('throws on bad k', () => {
    expect(() => new SpaceSavingHeavyHitters(0)).toThrow();
    expect(() => new SpaceSavingHeavyHitters(-1)).toThrow();
    expect(() => new SpaceSavingHeavyHitters(1.5)).toThrow();
  });

  it('total tracks n', () => {
    const ss = new SpaceSavingHeavyHitters<string>(3);
    ['a', 'b', 'a'].forEach((x) => ss.add(x));
    expect(ss.total()).toBe(3);
  });

  it('exact when stream fits in k counters', () => {
    const ss = new SpaceSavingHeavyHitters<string>(3);
    ['a', 'a', 'b', 'c', 'a'].forEach((x) => ss.add(x));
    const top = ss.topK();
    expect(top[0]).toEqual({ item: 'a', count: 3 });
    expect(top.find((x) => x.item === 'b')?.count).toBe(1);
    expect(top.find((x) => x.item === 'c')?.count).toBe(1);
  });

  it('detects dominant heavy hitter', () => {
    const ss = new SpaceSavingHeavyHitters<string>(2);
    const stream: string[] = [];
    for (let i = 0; i < 100; i++) stream.push('A');
    for (let i = 0; i < 5; i++) stream.push('B');
    for (let i = 0; i < 5; i++) stream.push('C');
    stream.forEach((x) => ss.add(x));
    const top = ss.topK();
    expect(top[0].item).toBe('A');
    expect(top[0].count).toBeGreaterThanOrEqual(100);
  });

  it('topK length bounded by k', () => {
    const ss = new SpaceSavingHeavyHitters<string>(2);
    'abcdefg'.split('').forEach((x) => ss.add(x));
    expect(ss.topK().length).toBeLessThanOrEqual(2);
  });

  it('counts are upper bounds (>= true)', () => {
    const ss = new SpaceSavingHeavyHitters<string>(3);
    const stream = ['a', 'a', 'a', 'b', 'b', 'c', 'd', 'e', 'a', 'a'];
    stream.forEach((x) => ss.add(x));
    const top = ss.topK();
    const a = top.find((x) => x.item === 'a');
    expect(a).toBeDefined();
    expect(a!.count).toBeGreaterThanOrEqual(5);
  });

  it('descending order in topK', () => {
    const ss = new SpaceSavingHeavyHitters<string>(3);
    ['x', 'y', 'y', 'z', 'z', 'z'].forEach((s) => ss.add(s));
    const top = ss.topK();
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].count).toBeGreaterThanOrEqual(top[i].count);
    }
  });

  it('empty stream', () => {
    const ss = new SpaceSavingHeavyHitters<string>(3);
    expect(ss.topK()).toEqual([]);
    expect(ss.total()).toBe(0);
  });

  it('single repeated item', () => {
    const ss = new SpaceSavingHeavyHitters<string>(1);
    for (let i = 0; i < 10; i++) ss.add('x');
    expect(ss.topK()).toEqual([{ item: 'x', count: 10 }]);
  });

  it('k=1 with mixed items', () => {
    const ss = new SpaceSavingHeavyHitters<string>(1);
    ['a', 'b', 'a', 'c', 'a'].forEach((x) => ss.add(x));
    const top = ss.topK();
    expect(top.length).toBe(1);
    expect(top[0].item).toBe('a');
  });

  it('numeric items', () => {
    const top = spaceSavingHeavyHitters([1, 1, 2, 1, 3, 1], 2);
    expect(top[0].item).toBe(1);
  });

  it('helper function returns same shape', () => {
    const result = spaceSavingHeavyHitters(['a', 'b', 'a'], 2);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('item');
    expect(result[0]).toHaveProperty('count');
  });

  it('helper validates k', () => {
    expect(() => spaceSavingHeavyHitters(['a'], 0)).toThrow();
  });

  it('handles iterables', () => {
    function* gen() {
      yield 'a';
      yield 'b';
      yield 'a';
    }
    const top = spaceSavingHeavyHitters(gen(), 2);
    expect(top[0].item).toBe('a');
  });
});
