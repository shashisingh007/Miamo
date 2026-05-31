import { describe, it, expect } from 'vitest';
import {
  nextGreaterElements,
  previousLessElements,
  largestRectangleInHistogram,
} from '../monotonicStack';

describe('nextGreaterElements', () => {
  it('empty array', () => {
    expect(nextGreaterElements([])).toEqual([]);
  });

  it('single element', () => {
    expect(nextGreaterElements([5])).toEqual([-1]);
  });

  it('monotonic increasing', () => {
    expect(nextGreaterElements([1, 2, 3, 4])).toEqual([2, 3, 4, -1]);
  });

  it('monotonic decreasing => all -1', () => {
    expect(nextGreaterElements([4, 3, 2, 1])).toEqual([-1, -1, -1, -1]);
  });

  it('classic example', () => {
    expect(nextGreaterElements([4, 5, 2, 25])).toEqual([5, 25, 25, -1]);
  });

  it('duplicates', () => {
    expect(nextGreaterElements([2, 2, 2])).toEqual([-1, -1, -1]);
  });

  it('mixed values', () => {
    expect(nextGreaterElements([11, 13, 21, 3])).toEqual([13, 21, -1, -1]);
  });
});

describe('previousLessElements', () => {
  it('empty array', () => {
    expect(previousLessElements([])).toEqual([]);
  });

  it('single element', () => {
    expect(previousLessElements([5])).toEqual([-1]);
  });

  it('increasing sequence', () => {
    expect(previousLessElements([1, 2, 3])).toEqual([-1, 1, 2]);
  });

  it('decreasing sequence => all -1', () => {
    expect(previousLessElements([3, 2, 1])).toEqual([-1, -1, -1]);
  });

  it('mixed', () => {
    expect(previousLessElements([2, 1, 3, 4, 0, 5])).toEqual([-1, -1, 1, 3, -1, 0]);
  });

  it('duplicates use strict less than', () => {
    expect(previousLessElements([2, 2, 2])).toEqual([-1, -1, -1]);
  });
});

describe('largestRectangleInHistogram', () => {
  it('empty histogram => 0', () => {
    expect(largestRectangleInHistogram([])).toBe(0);
  });

  it('single bar', () => {
    expect(largestRectangleInHistogram([5])).toBe(5);
  });

  it('uniform bars', () => {
    expect(largestRectangleInHistogram([3, 3, 3, 3])).toBe(12);
  });

  it('classic [2,1,5,6,2,3] => 10', () => {
    expect(largestRectangleInHistogram([2, 1, 5, 6, 2, 3])).toBe(10);
  });

  it('strictly increasing', () => {
    expect(largestRectangleInHistogram([1, 2, 3, 4, 5])).toBe(9);
  });

  it('strictly decreasing', () => {
    expect(largestRectangleInHistogram([5, 4, 3, 2, 1])).toBe(9);
  });

  it('valley', () => {
    expect(largestRectangleInHistogram([6, 7, 5, 7, 6])).toBe(25);
  });

  it('zeros included', () => {
    expect(largestRectangleInHistogram([2, 0, 2])).toBe(2);
  });

  it('all zeros => 0', () => {
    expect(largestRectangleInHistogram([0, 0, 0])).toBe(0);
  });

  it('peak in middle', () => {
    expect(largestRectangleInHistogram([1, 3, 6, 3, 1])).toBe(9);
  });
});
