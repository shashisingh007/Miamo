import { describe, it, expect } from 'vitest';
import { MonotonicDeque, slidingWindowMaximum } from '../monotonicDeque';

describe('MonotonicDeque', () => {
  it('empty starts empty', () => {
    const dq = new MonotonicDeque<string>('max');
    expect(dq.isEmpty()).toBe(true);
    expect(dq.size()).toBe(0);
    expect(dq.front()).toBeUndefined();
  });

  it('push max-mode evicts smaller keys', () => {
    const dq = new MonotonicDeque<string>('max');
    dq.push('a', 1);
    dq.push('b', 2);
    expect(dq.size()).toBe(1);
    expect(dq.front()!.value).toBe('b');
  });

  it('push max-mode keeps decreasing keys', () => {
    const dq = new MonotonicDeque<string>('max');
    dq.push('a', 5);
    dq.push('b', 3);
    dq.push('c', 1);
    expect(dq.size()).toBe(3);
    expect(dq.front()!.value).toBe('a');
  });

  it('push min-mode evicts larger keys', () => {
    const dq = new MonotonicDeque<string>('min');
    dq.push('a', 5);
    dq.push('b', 2);
    expect(dq.size()).toBe(1);
    expect(dq.front()!.value).toBe('b');
  });

  it('popFrontIf removes matching', () => {
    const dq = new MonotonicDeque<number>('max');
    dq.push(1, 10);
    dq.push(2, 8);
    dq.push(3, 5);
    dq.popFrontIf((v) => v < 3);
    expect(dq.size()).toBe(1);
    expect(dq.front()!.value).toBe(3);
  });

  it('rejects non-finite key', () => {
    const dq = new MonotonicDeque<string>('max');
    expect(() => dq.push('x', Infinity)).toThrow(TypeError);
    expect(() => dq.push('x', NaN)).toThrow(TypeError);
  });
});

describe('slidingWindowMaximum', () => {
  it('classic example', () => {
    expect(slidingWindowMaximum([1, 3, -1, -3, 5, 3, 6, 7], 3)).toEqual([3, 3, 5, 5, 6, 7]);
  });

  it('window size 1 => identity', () => {
    expect(slidingWindowMaximum([4, 2, 7, 1], 1)).toEqual([4, 2, 7, 1]);
  });

  it('window size = length', () => {
    expect(slidingWindowMaximum([1, 4, 2, 3], 4)).toEqual([4]);
  });

  it('all equal', () => {
    expect(slidingWindowMaximum([2, 2, 2, 2], 2)).toEqual([2, 2, 2]);
  });

  it('strictly increasing', () => {
    expect(slidingWindowMaximum([1, 2, 3, 4, 5], 3)).toEqual([3, 4, 5]);
  });

  it('strictly decreasing', () => {
    expect(slidingWindowMaximum([5, 4, 3, 2, 1], 3)).toEqual([5, 4, 3]);
  });

  it('throws on non-positive window', () => {
    expect(() => slidingWindowMaximum([1, 2, 3], 0)).toThrow(RangeError);
    expect(() => slidingWindowMaximum([1, 2, 3], -1)).toThrow(RangeError);
  });

  it('throws on non-integer window', () => {
    expect(() => slidingWindowMaximum([1, 2, 3], 1.5)).toThrow(RangeError);
  });

  it('empty input', () => {
    expect(slidingWindowMaximum([], 3)).toEqual([]);
  });
});
