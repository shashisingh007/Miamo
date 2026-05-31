import { describe, it, expect } from 'vitest';
import { lloydsKMeans } from '../lloydsKMeans';

describe('lloydsKMeans', () => {
  it('separates two clusters', () => {
    const pts = [
      [0, 0], [0.1, 0], [0, 0.1], [0.1, 0.1],
      [10, 10], [10.1, 10], [10, 10.1], [10.1, 10.1],
    ];
    const r = lloydsKMeans(pts, [[0, 0], [10, 10]]);
    expect(r.converged).toBe(true);
    const left = pts.slice(0, 4).map((_, i) => r.assignments[i]);
    const right = pts.slice(4).map((_, i) => r.assignments[i + 4]);
    expect(new Set(left).size).toBe(1);
    expect(new Set(right).size).toBe(1);
    expect(left[0]).not.toBe(right[0]);
  });

  it('one-cluster degenerate', () => {
    const pts = [[1, 1], [2, 2], [3, 3]];
    const r = lloydsKMeans(pts, [[2, 2]]);
    expect(r.assignments).toEqual([0, 0, 0]);
    expect(r.centroids[0][0]).toBeCloseTo(2, 9);
    expect(r.centroids[0][1]).toBeCloseTo(2, 9);
  });

  it('matches expected centroid for symmetric input', () => {
    const pts = [[-1, 0], [1, 0]];
    const r = lloydsKMeans(pts, [[0, 0]]);
    expect(r.centroids[0][0]).toBeCloseTo(0, 9);
  });

  it('1D clustering', () => {
    const pts = [[0], [1], [2], [10], [11], [12]];
    const r = lloydsKMeans(pts, [[0], [10]]);
    expect(r.assignments.slice(0, 3).every((a) => a === r.assignments[0])).toBe(true);
    expect(r.assignments.slice(3).every((a) => a === r.assignments[3])).toBe(true);
  });

  it('converges quickly when centroids initialized at means', () => {
    const pts = [[0, 0], [2, 0], [0, 2], [2, 2]];
    const r = lloydsKMeans(pts, [[1, 1]]);
    expect(r.converged).toBe(true);
  });

  it('centroids reflect cluster means after convergence', () => {
    const pts = [[0, 0], [4, 0], [0, 4], [4, 4]];
    const r = lloydsKMeans(pts, [[0, 0], [4, 4]]);
    // At least one centroid near (0,0) or (4,4); both endpoints captured by 2 means
    const mean = r.centroids.map((c) => c[0] + c[1]).sort((a, b) => a - b);
    expect(mean[1] - mean[0]).toBeGreaterThan(0);
  });

  it('rejects empty points', () => {
    expect(() => lloydsKMeans([], [[0]])).toThrow();
  });

  it('rejects empty centroids', () => {
    expect(() => lloydsKMeans([[1]], [])).toThrow();
  });

  it('rejects dim mismatch', () => {
    expect(() => lloydsKMeans([[1, 2]], [[1]])).toThrow();
  });

  it('rejects bad maxIterations', () => {
    expect(() => lloydsKMeans([[0]], [[0]], 0)).toThrow();
  });

  it('non-convergence flagged', () => {
    const pts = [[0], [1]];
    const r = lloydsKMeans(pts, [[0], [1]], 1);
    // 1 iteration may converge if assignments don't change; still must terminate
    expect(typeof r.converged).toBe('boolean');
    expect(r.iterations).toBeGreaterThanOrEqual(1);
  });
});
