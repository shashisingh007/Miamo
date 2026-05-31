import { describe, it, expect } from 'vitest';
import { FingerTreeSequence } from '../fingerTreeSequence';

describe('FingerTreeSequence', () => {
  it('empty has length 0', () => {
    const s = FingerTreeSequence.empty<number>();
    expect(s.length).toBe(0);
    expect(s.isEmpty()).toBe(true);
    expect(s.head()).toBeUndefined();
    expect(s.last()).toBeUndefined();
    expect(s.toArray()).toEqual([]);
  });

  it('single snoc', () => {
    const s = FingerTreeSequence.empty<number>().snoc(7);
    expect(s.length).toBe(1);
    expect(s.head()).toBe(7);
    expect(s.last()).toBe(7);
    expect(s.toArray()).toEqual([7]);
  });

  it('single cons', () => {
    const s = FingerTreeSequence.empty<number>().cons(9);
    expect(s.length).toBe(1);
    expect(s.head()).toBe(9);
    expect(s.last()).toBe(9);
  });

  it('snoc many keeps order', () => {
    let s = FingerTreeSequence.empty<number>();
    for (let i = 0; i < 20; i += 1) s = s.snoc(i);
    expect(s.length).toBe(20);
    expect(s.head()).toBe(0);
    expect(s.last()).toBe(19);
    expect(s.toArray()).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it('cons many keeps reverse order', () => {
    let s = FingerTreeSequence.empty<number>();
    for (let i = 0; i < 20; i += 1) s = s.cons(i);
    expect(s.length).toBe(20);
    expect(s.head()).toBe(19);
    expect(s.last()).toBe(0);
    expect(s.toArray()).toEqual(Array.from({ length: 20 }, (_, i) => 19 - i));
  });

  it('fromArray round-trips', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(FingerTreeSequence.fromArray(arr).toArray()).toEqual(arr);
  });

  it('immutability: snoc returns new', () => {
    const s = FingerTreeSequence.empty<number>().snoc(1);
    const t = s.snoc(2);
    expect(s.toArray()).toEqual([1]);
    expect(t.toArray()).toEqual([1, 2]);
  });

  it('immutability: cons returns new', () => {
    const s = FingerTreeSequence.empty<number>().snoc(1);
    const t = s.cons(0);
    expect(s.toArray()).toEqual([1]);
    expect(t.toArray()).toEqual([0, 1]);
  });

  it('snoc many triggers deep tree overflow', () => {
    let s = FingerTreeSequence.empty<number>();
    for (let i = 0; i < 100; i += 1) s = s.snoc(i);
    expect(s.toArray()).toEqual(Array.from({ length: 100 }, (_, i) => i));
  });

  it('mixed cons/snoc', () => {
    let s = FingerTreeSequence.empty<number>();
    s = s.snoc(2).snoc(3).cons(1).snoc(4).cons(0);
    expect(s.toArray()).toEqual([0, 1, 2, 3, 4]);
  });

  it('strings', () => {
    const s = FingerTreeSequence.fromArray(['a', 'b', 'c']);
    expect(s.head()).toBe('a');
    expect(s.last()).toBe('c');
  });

  it('fromArray empty', () => {
    expect(FingerTreeSequence.fromArray<number>([]).isEmpty()).toBe(true);
  });
});
