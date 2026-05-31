import { describe, it, expect } from 'vitest';
import { DifferenceArray2D } from '../differenceArray2D';

describe('DifferenceArray2D', () => {
  it('throws on non-positive dims', () => {
    expect(() => new DifferenceArray2D(0, 1)).toThrow(RangeError);
    expect(() => new DifferenceArray2D(1, 0)).toThrow(RangeError);
    expect(() => new DifferenceArray2D(-1, 1)).toThrow(RangeError);
  });

  it('throws on non-integer dims', () => {
    expect(() => new DifferenceArray2D(2.5, 1)).toThrow(RangeError);
  });

  it('zero before any add', () => {
    const d = new DifferenceArray2D(3, 3);
    expect(d.get(0, 0)).toBe(0);
    expect(d.get(2, 2)).toBe(0);
  });

  it('single cell rect', () => {
    const d = new DifferenceArray2D(3, 3);
    d.addRect(1, 1, 1, 1, 5);
    expect(d.get(1, 1)).toBe(5);
    expect(d.get(0, 0)).toBe(0);
    expect(d.get(2, 2)).toBe(0);
  });

  it('full grid rect', () => {
    const d = new DifferenceArray2D(2, 2);
    d.addRect(0, 0, 1, 1, 7);
    expect(d.get(0, 0)).toBe(7);
    expect(d.get(1, 1)).toBe(7);
  });

  it('overlapping rects sum', () => {
    const d = new DifferenceArray2D(3, 3);
    d.addRect(0, 0, 1, 1, 1);
    d.addRect(1, 1, 2, 2, 2);
    expect(d.get(0, 0)).toBe(1);
    expect(d.get(1, 1)).toBe(3);
    expect(d.get(2, 2)).toBe(2);
    expect(d.get(0, 2)).toBe(0);
  });

  it('throws on out-of-bounds rect', () => {
    const d = new DifferenceArray2D(3, 3);
    expect(() => d.addRect(0, 0, 3, 0, 1)).toThrow(RangeError);
    expect(() => d.addRect(0, 0, 0, 3, 1)).toThrow(RangeError);
    expect(() => d.addRect(-1, 0, 0, 0, 1)).toThrow(RangeError);
    expect(() => d.addRect(2, 2, 1, 1, 1)).toThrow(RangeError);
  });

  it('throws on non-integer rect coords', () => {
    const d = new DifferenceArray2D(3, 3);
    expect(() => d.addRect(0.5, 0, 1, 1, 1)).toThrow(RangeError);
  });

  it('throws on non-finite delta', () => {
    const d = new DifferenceArray2D(3, 3);
    expect(() => d.addRect(0, 0, 1, 1, NaN)).toThrow(TypeError);
  });

  it('throws on out-of-bounds get', () => {
    const d = new DifferenceArray2D(3, 3);
    expect(() => d.get(3, 0)).toThrow(RangeError);
    expect(() => d.get(0, -1)).toThrow(RangeError);
  });

  it('add after seal throws', () => {
    const d = new DifferenceArray2D(2, 2);
    d.addRect(0, 0, 1, 1, 1);
    d.seal();
    expect(() => d.addRect(0, 0, 1, 1, 1)).toThrow();
  });

  it('negative delta works', () => {
    const d = new DifferenceArray2D(3, 3);
    d.addRect(0, 0, 2, 2, 5);
    d.addRect(1, 1, 1, 1, -3);
    expect(d.get(1, 1)).toBe(2);
    expect(d.get(0, 0)).toBe(5);
  });

  it('many rects', () => {
    const d = new DifferenceArray2D(5, 5);
    for (let i = 0; i < 10; i += 1) d.addRect(0, 0, i % 5, i % 5, 1);
    expect(d.get(0, 0)).toBe(10);
    expect(d.get(4, 4)).toBe(2);
  });

  it('idempotent seal()', () => {
    const d = new DifferenceArray2D(2, 2);
    d.addRect(0, 0, 1, 1, 3);
    d.seal();
    d.seal();
    expect(d.get(0, 0)).toBe(3);
  });
});
