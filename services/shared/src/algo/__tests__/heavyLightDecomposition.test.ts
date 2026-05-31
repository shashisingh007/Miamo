import { describe, it, expect } from 'vitest';
import { HeavyLightDecomposition } from '../heavyLightDecomposition';

describe('HeavyLightDecomposition', () => {
  it('throws on n <= 0', () => {
    expect(() => new HeavyLightDecomposition({ n: 0, parent: [] })).toThrow(RangeError);
  });

  it('throws on parent length mismatch', () => {
    expect(() => new HeavyLightDecomposition({ n: 3, parent: [-1, 0] })).toThrow(RangeError);
  });

  it('throws on multiple roots', () => {
    expect(() => new HeavyLightDecomposition({ n: 2, parent: [-1, -1] })).toThrow(RangeError);
  });

  it('throws on no root', () => {
    expect(() => new HeavyLightDecomposition({ n: 2, parent: [1, 0] })).toThrow(RangeError);
  });

  it('throws on invalid parent', () => {
    expect(() => new HeavyLightDecomposition({ n: 2, parent: [-1, 5] })).toThrow(RangeError);
  });

  it('single node', () => {
    const h = new HeavyLightDecomposition({ n: 1, parent: [-1], values: [7] });
    expect(h.pathSum(0, 0)).toBe(7);
  });

  it('linear chain', () => {
    // 0 - 1 - 2 - 3 - 4
    const h = new HeavyLightDecomposition({
      n: 5,
      parent: [-1, 0, 1, 2, 3],
      values: [1, 2, 3, 4, 5],
    });
    expect(h.pathSum(0, 4)).toBe(15);
    expect(h.pathSum(1, 3)).toBe(9);
    expect(h.pathSum(2, 2)).toBe(3);
  });

  it('balanced tree', () => {
    //       0
    //      / \
    //     1   2
    //    / \   \
    //   3   4   5
    const h = new HeavyLightDecomposition({
      n: 6,
      parent: [-1, 0, 0, 1, 1, 2],
      values: [1, 10, 100, 1000, 10000, 100000],
    });
    expect(h.pathSum(3, 4)).toBe(1000 + 10 + 10000);
    expect(h.pathSum(3, 5)).toBe(1000 + 10 + 1 + 100 + 100000);
    expect(h.pathSum(5, 5)).toBe(100000);
  });

  it('update changes path sums', () => {
    const h = new HeavyLightDecomposition({
      n: 5,
      parent: [-1, 0, 1, 2, 3],
      values: [1, 2, 3, 4, 5],
    });
    expect(h.pathSum(0, 4)).toBe(15);
    h.update(2, 30);
    expect(h.pathSum(0, 4)).toBe(1 + 2 + 30 + 4 + 5);
  });

  it('update with negative delta works', () => {
    const h = new HeavyLightDecomposition({
      n: 3,
      parent: [-1, 0, 1],
      values: [5, 5, 5],
    });
    h.update(1, 0);
    expect(h.pathSum(0, 2)).toBe(10);
  });

  it('default values zero', () => {
    const h = new HeavyLightDecomposition({ n: 4, parent: [-1, 0, 0, 1] });
    expect(h.pathSum(2, 3)).toBe(0);
    h.update(2, 7);
    h.update(3, 3);
    expect(h.pathSum(2, 3)).toBe(10);
  });

  it('star tree', () => {
    const h = new HeavyLightDecomposition({
      n: 5,
      parent: [-1, 0, 0, 0, 0],
      values: [1, 2, 3, 4, 5],
    });
    expect(h.pathSum(1, 4)).toBe(2 + 1 + 5);
    expect(h.pathSum(2, 3)).toBe(3 + 1 + 4);
  });

  it('throws on out-of-range update', () => {
    const h = new HeavyLightDecomposition({ n: 3, parent: [-1, 0, 1] });
    expect(() => h.update(-1, 1)).toThrow(RangeError);
    expect(() => h.update(3, 1)).toThrow(RangeError);
  });

  it('throws on non-finite update value', () => {
    const h = new HeavyLightDecomposition({ n: 2, parent: [-1, 0] });
    expect(() => h.update(0, NaN)).toThrow(TypeError);
  });

  it('throws on out-of-range pathSum', () => {
    const h = new HeavyLightDecomposition({ n: 2, parent: [-1, 0] });
    expect(() => h.pathSum(0, 5)).toThrow(RangeError);
  });

  it('reverse u,v same answer', () => {
    const h = new HeavyLightDecomposition({
      n: 5,
      parent: [-1, 0, 0, 1, 2],
      values: [1, 2, 3, 4, 5],
    });
    expect(h.pathSum(3, 4)).toBe(h.pathSum(4, 3));
  });
});
