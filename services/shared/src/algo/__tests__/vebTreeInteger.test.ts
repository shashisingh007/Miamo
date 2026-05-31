import { describe, it, expect } from 'vitest';
import { VebTreeInteger } from '../vebTreeInteger';

describe('VebTreeInteger', () => {
  it('throws on universe < 2', () => {
    expect(() => new VebTreeInteger(1)).toThrow(RangeError);
  });

  it('throws on non-integer universe', () => {
    expect(() => new VebTreeInteger(2.5)).toThrow(RangeError);
  });

  it('empty has no min/max', () => {
    const v = new VebTreeInteger(16);
    expect(v.getMin()).toBeNull();
    expect(v.getMax()).toBeNull();
  });

  it('single insert sets min=max', () => {
    const v = new VebTreeInteger(16);
    v.insert(7);
    expect(v.getMin()).toBe(7);
    expect(v.getMax()).toBe(7);
  });

  it('contains works for empty', () => {
    const v = new VebTreeInteger(16);
    expect(v.contains(5)).toBe(false);
  });

  it('contains inserted values', () => {
    const v = new VebTreeInteger(16);
    [3, 5, 8, 10, 12].forEach((x) => v.insert(x));
    expect(v.contains(5)).toBe(true);
    expect(v.contains(8)).toBe(true);
    expect(v.contains(10)).toBe(true);
    expect(v.contains(6)).toBe(false);
    expect(v.contains(11)).toBe(false);
  });

  it('successor returns next larger', () => {
    const v = new VebTreeInteger(16);
    [3, 5, 8, 10, 12].forEach((x) => v.insert(x));
    expect(v.successor(3)).toBe(5);
    expect(v.successor(5)).toBe(8);
    expect(v.successor(8)).toBe(10);
    expect(v.successor(10)).toBe(12);
  });

  it('successor of max => null', () => {
    const v = new VebTreeInteger(16);
    [3, 5, 8].forEach((x) => v.insert(x));
    expect(v.successor(8)).toBeNull();
  });

  it('successor of below-min => min', () => {
    const v = new VebTreeInteger(16);
    [5, 8].forEach((x) => v.insert(x));
    expect(v.successor(2)).toBe(5);
  });

  it('successor on empty => null', () => {
    const v = new VebTreeInteger(16);
    expect(v.successor(5)).toBeNull();
  });

  it('throws on out-of-universe insert', () => {
    const v = new VebTreeInteger(16);
    expect(() => v.insert(16)).toThrow(RangeError);
    expect(() => v.insert(-1)).toThrow(RangeError);
  });

  it('min/max update correctly', () => {
    const v = new VebTreeInteger(32);
    [10, 5, 25, 1, 30].forEach((x) => v.insert(x));
    expect(v.getMin()).toBe(1);
    expect(v.getMax()).toBe(30);
  });

  it('successor traverses across clusters', () => {
    const v = new VebTreeInteger(32);
    [2, 15, 17, 30].forEach((x) => v.insert(x));
    expect(v.successor(15)).toBe(17);
    expect(v.successor(2)).toBe(15);
  });

  it('larger universe', () => {
    const v = new VebTreeInteger(256);
    const vals = [3, 50, 100, 150, 200, 250];
    vals.forEach((x) => v.insert(x));
    for (const x of vals) expect(v.contains(x)).toBe(true);
    expect(v.contains(99)).toBe(false);
  });
});
