import { describe, it, expect } from 'vitest';
import { hungarianAssignment } from '../hungarianAssignment';

describe('hungarianAssignment', () => {
  it('empty => 0', () => {
    expect(hungarianAssignment([])).toEqual({ totalCost: 0, assignment: [] });
  });

  it('1x1', () => {
    expect(hungarianAssignment([[7]])).toEqual({ totalCost: 7, assignment: [0] });
  });

  it('throws on non-square', () => {
    expect(() => hungarianAssignment([[1, 2]])).toThrow(RangeError);
  });

  it('2x2 simple', () => {
    const r = hungarianAssignment([
      [1, 2],
      [3, 4],
    ]);
    expect(r.totalCost).toBe(5);
  });

  it('2x2 swap is better', () => {
    const r = hungarianAssignment([
      [4, 1],
      [2, 3],
    ]);
    expect(r.totalCost).toBe(3);
    expect(r.assignment).toEqual([1, 0]);
  });

  it('3x3 classic', () => {
    const r = hungarianAssignment([
      [4, 1, 3],
      [2, 0, 5],
      [3, 2, 2],
    ]);
    expect(r.totalCost).toBe(5);
  });

  it('identity matrix => 0 diagonal', () => {
    const r = hungarianAssignment([
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
    ]);
    expect(r.totalCost).toBe(0);
    expect(r.assignment).toEqual([0, 1, 2]);
  });

  it('all-equal => any valid perm', () => {
    const r = hungarianAssignment([
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ]);
    expect(r.totalCost).toBe(15);
    const set = new Set(r.assignment);
    expect(set.size).toBe(3);
  });

  it('4x4 example', () => {
    const r = hungarianAssignment([
      [82, 83, 69, 92],
      [77, 37, 49, 92],
      [11, 69, 5, 86],
      [8, 9, 98, 23],
    ]);
    expect(r.totalCost).toBe(140);
  });

  it('assignment is a permutation', () => {
    const r = hungarianAssignment([
      [3, 1, 2],
      [2, 0, 5],
      [3, 2, 2],
    ]);
    const sorted = [...r.assignment].sort((a, b) => a - b);
    expect(sorted).toEqual([0, 1, 2]);
  });

  it('handles negative values', () => {
    const r = hungarianAssignment([
      [-1, -2],
      [-3, -4],
    ]);
    expect(r.totalCost).toBe(-5);
  });

  it('throws when inner row has wrong length', () => {
    expect(() => hungarianAssignment([
      [1, 2],
      [3, 4, 5] as any,
    ])).toThrow(RangeError);
  });

  it('5x5 random-ish', () => {
    const r = hungarianAssignment([
      [10, 19, 8, 15, 19],
      [10, 18, 7, 17, 19],
      [13, 16, 9, 14, 19],
      [12, 19, 8, 18, 19],
      [14, 17, 10, 19, 19],
    ]);
    expect(r.totalCost).toBeGreaterThan(0);
    const set = new Set(r.assignment);
    expect(set.size).toBe(5);
  });
});
