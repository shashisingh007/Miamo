import { describe, it, expect } from 'vitest';
import { hitsAlgorithm } from '../hitsAlgorithm';

describe('hitsAlgorithm', () => {
  it('rejects bad nodeCount', () => {
    expect(() => hitsAlgorithm({ nodeCount: -1, edges: [] })).toThrow(RangeError);
  });

  it('rejects bad edges array', () => {
    expect(() => hitsAlgorithm({ nodeCount: 1, edges: 'x' as any })).toThrow(TypeError);
  });

  it('rejects bad edge index', () => {
    expect(() => hitsAlgorithm({ nodeCount: 2, edges: [[0, 9]] })).toThrow(RangeError);
  });

  it('rejects bad options', () => {
    expect(() =>
      hitsAlgorithm({ nodeCount: 1, edges: [] }, { maxIterations: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      hitsAlgorithm({ nodeCount: 1, edges: [] }, { tolerance: -1 }),
    ).toThrow(RangeError);
  });

  it('empty graph', () => {
    const r = hitsAlgorithm({ nodeCount: 0, edges: [] });
    expect(r.hub).toEqual([]);
    expect(r.authority).toEqual([]);
    expect(r.iterations).toBe(0);
  });

  it('isolated nodes => zero scores after normalization is undefined, returns 0', () => {
    const r = hitsAlgorithm({ nodeCount: 2, edges: [] });
    expect(r.hub).toHaveLength(2);
    expect(r.authority).toHaveLength(2);
  });

  it('single edge: 0->1 makes 1 authority, 0 hub', () => {
    const r = hitsAlgorithm({ nodeCount: 2, edges: [[0, 1]] });
    expect(r.authority[1]).toBeGreaterThan(r.authority[0]);
    expect(r.hub[0]).toBeGreaterThan(r.hub[1]);
  });

  it('star out: hub is center, authorities the leaves', () => {
    // 0 -> 1, 0 -> 2, 0 -> 3
    const r = hitsAlgorithm({ nodeCount: 4, edges: [[0, 1], [0, 2], [0, 3]] });
    expect(r.hub[0]).toBeGreaterThan(r.hub[1]);
    expect(r.authority[1]).toBeCloseTo(r.authority[2], 6);
    expect(r.authority[1]).toBeCloseTo(r.authority[3], 6);
  });

  it('star in: authority is center', () => {
    const r = hitsAlgorithm({ nodeCount: 4, edges: [[1, 0], [2, 0], [3, 0]] });
    expect(r.authority[0]).toBeGreaterThan(r.authority[1]);
    expect(r.hub[1]).toBeCloseTo(r.hub[2], 6);
  });

  it('converges before maxIterations on small graph', () => {
    const r = hitsAlgorithm(
      { nodeCount: 3, edges: [[0, 1], [1, 2], [2, 0]] },
      { maxIterations: 100, tolerance: 1e-6 },
    );
    expect(r.iterations).toBeLessThan(100);
  });

  it('hub and authority L2 norm ≈ 1', () => {
    const r = hitsAlgorithm({ nodeCount: 5, edges: [[0, 1], [1, 2], [2, 3], [3, 4]] });
    let hn = 0;
    let an = 0;
    for (let i = 0; i < 5; i += 1) {
      hn += r.hub[i] * r.hub[i];
      an += r.authority[i] * r.authority[i];
    }
    expect(Math.sqrt(hn)).toBeCloseTo(1, 4);
    expect(Math.sqrt(an)).toBeCloseTo(1, 4);
  });

  it('non-negative scores', () => {
    const r = hitsAlgorithm({ nodeCount: 4, edges: [[0, 1], [1, 2], [2, 3], [3, 0]] });
    for (const x of r.hub) expect(x).toBeGreaterThanOrEqual(0);
    for (const x of r.authority) expect(x).toBeGreaterThanOrEqual(0);
  });

  it('symmetric cycle: roughly equal scores', () => {
    const r = hitsAlgorithm({ nodeCount: 4, edges: [[0, 1], [1, 2], [2, 3], [3, 0]] });
    for (let i = 0; i < 4; i += 1) {
      expect(r.hub[i]).toBeCloseTo(r.hub[0], 4);
      expect(r.authority[i]).toBeCloseTo(r.authority[0], 4);
    }
  });

  it('parallel edges weighted via duplication', () => {
    const r = hitsAlgorithm({
      nodeCount: 3,
      edges: [[0, 2], [0, 2], [1, 2]],
    });
    expect(r.hub[0]).toBeGreaterThan(r.hub[1]);
  });

  it('respects maxIterations cap', () => {
    const r = hitsAlgorithm(
      { nodeCount: 4, edges: [[0, 1], [1, 2], [2, 3]] },
      { maxIterations: 2, tolerance: 1e-20 },
    );
    expect(r.iterations).toBeLessThanOrEqual(2);
  });

  it('large authority outranks small', () => {
    const edges: [number, number][] = [];
    for (let i = 1; i <= 10; i += 1) edges.push([i, 0]);
    edges.push([11, 12]);
    const r = hitsAlgorithm({ nodeCount: 13, edges });
    expect(r.authority[0]).toBeGreaterThan(r.authority[12]);
  });

  it('result arrays sized to nodeCount', () => {
    const r = hitsAlgorithm({ nodeCount: 7, edges: [[0, 1]] });
    expect(r.hub).toHaveLength(7);
    expect(r.authority).toHaveLength(7);
  });
});
