import { describe, it, expect } from 'vitest';
import { kdBuild, kdRangeQuery } from '../kdRangeQuery';

function sortPts(a: number[][]): number[][] {
  return a.slice().sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}

describe('kdRangeQuery', () => {
  it('finds all points inside box (2D)', () => {
    const pts = [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]];
    const root = kdBuild(pts);
    const r = kdRangeQuery(root, [2, 2], [4, 4]);
    expect(sortPts(r)).toEqual([[2, 2], [3, 3], [4, 4]]);
  });

  it('empty when no point matches', () => {
    const root = kdBuild([[1, 1], [10, 10]]);
    expect(kdRangeQuery(root, [3, 3], [5, 5])).toEqual([]);
  });

  it('matches naive brute force', () => {
    const pts: number[][] = [];
    for (let i = 0; i < 100; i++) pts.push([Math.random() * 10, Math.random() * 10]);
    const root = kdBuild(pts);
    const min = [3, 4], max = [7, 8];
    const fast = sortPts(kdRangeQuery(root, min, max));
    const brute = sortPts(pts.filter((p) => p[0] >= min[0] && p[0] <= max[0] && p[1] >= min[1] && p[1] <= max[1]));
    expect(fast).toEqual(brute);
  });

  it('3D query', () => {
    const pts = [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3]];
    const root = kdBuild(pts);
    expect(sortPts(kdRangeQuery(root, [1, 1, 1], [2, 2, 2]))).toEqual([[1, 1, 1], [2, 2, 2]]);
  });

  it('boundary points included (inclusive box)', () => {
    const root = kdBuild([[2, 2], [2, 4], [4, 2], [4, 4]]);
    expect(sortPts(kdRangeQuery(root, [2, 2], [4, 4]))).toEqual([[2, 2], [2, 4], [4, 2], [4, 4]]);
  });

  it('empty tree returns empty', () => {
    expect(kdRangeQuery(null, [0, 0], [1, 1])).toEqual([]);
  });

  it('rejects inconsistent dims at build', () => {
    expect(() => kdBuild([[1, 2], [3]])).toThrow();
  });

  it('rejects non-finite coord', () => {
    expect(() => kdBuild([[1, NaN]])).toThrow();
  });

  it('rejects min > max', () => {
    const root = kdBuild([[1, 1]]);
    expect(() => kdRangeQuery(root, [3, 0], [0, 3])).toThrow();
  });

  it('rejects query dimension mismatch', () => {
    const root = kdBuild([[1, 1, 1]]);
    expect(() => kdRangeQuery(root, [0, 0], [2, 2])).toThrow();
  });

  it('single-point tree handled', () => {
    const root = kdBuild([[5, 5]]);
    expect(kdRangeQuery(root, [0, 0], [10, 10])).toEqual([[5, 5]]);
    expect(kdRangeQuery(root, [6, 6], [10, 10])).toEqual([]);
  });
});
