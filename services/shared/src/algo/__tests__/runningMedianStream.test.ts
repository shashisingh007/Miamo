import { describe, it, expect } from 'vitest';
import { RunningMedianStream } from '../runningMedianStream';

describe('RunningMedianStream', () => {
  it('empty median undefined', () => {
    const s = new RunningMedianStream();
    expect(s.median()).toBeUndefined();
    expect(s.size()).toBe(0);
  });

  it('single value', () => {
    const s = new RunningMedianStream();
    s.add(5);
    expect(s.median()).toBe(5);
    expect(s.size()).toBe(1);
  });

  it('two values', () => {
    const s = new RunningMedianStream();
    s.add(5);
    s.add(15);
    expect(s.median()).toBe(10);
  });

  it('odd count', () => {
    const s = new RunningMedianStream();
    [3, 1, 5, 4, 2].forEach((v) => s.add(v));
    expect(s.median()).toBe(3);
  });

  it('even count', () => {
    const s = new RunningMedianStream();
    [3, 1, 5, 4].forEach((v) => s.add(v));
    expect(s.median()).toBe(3.5);
  });

  it('descending input', () => {
    const s = new RunningMedianStream();
    [9, 8, 7, 6, 5].forEach((v) => s.add(v));
    expect(s.median()).toBe(7);
  });

  it('all equal', () => {
    const s = new RunningMedianStream();
    [4, 4, 4, 4, 4].forEach((v) => s.add(v));
    expect(s.median()).toBe(4);
  });

  it('negative values', () => {
    const s = new RunningMedianStream();
    [-3, -1, -5, 2].forEach((v) => s.add(v));
    expect(s.median()).toBe(-2);
  });

  it('many random values', () => {
    const s = new RunningMedianStream();
    const arr: number[] = [];
    for (let i = 0; i < 100; i += 1) {
      const v = ((i * 17) % 97) - 40;
      arr.push(v);
      s.add(v);
    }
    arr.sort((a, b) => a - b);
    const expected = (arr[49] + arr[50]) / 2;
    expect(s.median()).toBe(expected);
    expect(s.size()).toBe(100);
  });

  it('throws on non-finite', () => {
    const s = new RunningMedianStream();
    expect(() => s.add(NaN)).toThrow(TypeError);
    expect(() => s.add(Infinity)).toThrow(TypeError);
  });

  it('median updates incrementally', () => {
    const s = new RunningMedianStream();
    s.add(2);
    expect(s.median()).toBe(2);
    s.add(4);
    expect(s.median()).toBe(3);
    s.add(1);
    expect(s.median()).toBe(2);
    s.add(3);
    expect(s.median()).toBe(2.5);
  });

  it('floats', () => {
    const s = new RunningMedianStream();
    [1.5, 2.5, 3.5].forEach((v) => s.add(v));
    expect(s.median()).toBe(2.5);
  });
});
