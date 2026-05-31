import { describe, it, expect } from 'vitest';
import { pageRankIterative } from '../pageRankIterative';

function sumApprox(arr: number[], target: number, eps = 1e-6): boolean {
  return Math.abs(arr.reduce((s, x) => s + x, 0) - target) < eps;
}

describe('pageRankIterative', () => {
  it('empty graph', () => {
    const r = pageRankIterative({ vertexCount: 0, edges: [] });
    expect(r.rank).toEqual([]);
    expect(r.converged).toBe(true);
  });

  it('throws on bad vertexCount', () => {
    expect(() => pageRankIterative({ vertexCount: -1, edges: [] })).toThrow(RangeError);
  });

  it('throws on bad damping', () => {
    expect(() => pageRankIterative({ vertexCount: 2, edges: [], dampingFactor: 2 })).toThrow(RangeError);
  });

  it('throws on out-of-range edge', () => {
    expect(() => pageRankIterative({ vertexCount: 2, edges: [{ from: 0, to: 5 }] })).toThrow(RangeError);
  });

  it('single vertex => rank [1]', () => {
    const r = pageRankIterative({ vertexCount: 1, edges: [] });
    expect(r.rank).toEqual([1]);
  });

  it('rank sums to 1', () => {
    const r = pageRankIterative({
      vertexCount: 4,
      edges: [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 0 },
      ],
    });
    expect(sumApprox(r.rank, 1)).toBe(true);
  });

  it('symmetric cycle => uniform ranks', () => {
    const r = pageRankIterative({
      vertexCount: 4,
      edges: [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 0 },
      ],
    });
    for (let i = 1; i < 4; i++) expect(Math.abs(r.rank[i] - r.rank[0])).toBeLessThan(1e-6);
  });

  it('authority node has higher rank', () => {
    const r = pageRankIterative({
      vertexCount: 4,
      edges: [
        { from: 0, to: 3 }, { from: 1, to: 3 }, { from: 2, to: 3 }, { from: 3, to: 3 },
      ],
    });
    expect(r.rank[3]).toBeGreaterThan(r.rank[0]);
  });

  it('converges within maxIterations', () => {
    const r = pageRankIterative({
      vertexCount: 5,
      edges: [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 0 },
      ],
      maxIterations: 200,
      tolerance: 1e-8,
    });
    expect(r.converged).toBe(true);
  });

  it('respects custom initial rank', () => {
    const r = pageRankIterative({
      vertexCount: 3,
      edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 }],
      initialRank: [0.5, 0.3, 0.2],
    });
    expect(sumApprox(r.rank, 1)).toBe(true);
  });

  it('dangling nodes redistribute', () => {
    const r = pageRankIterative({
      vertexCount: 3,
      edges: [{ from: 0, to: 1 }, { from: 0, to: 2 }],
    });
    expect(sumApprox(r.rank, 1)).toBe(true);
  });

  it('all dangling => uniform', () => {
    const r = pageRankIterative({ vertexCount: 4, edges: [] });
    for (let i = 1; i < 4; i++) expect(Math.abs(r.rank[i] - r.rank[0])).toBeLessThan(1e-9);
  });

  it('throws on bad initialRank length', () => {
    expect(() => pageRankIterative({
      vertexCount: 3, edges: [], initialRank: [0.5, 0.5],
    })).toThrow(RangeError);
  });
});
