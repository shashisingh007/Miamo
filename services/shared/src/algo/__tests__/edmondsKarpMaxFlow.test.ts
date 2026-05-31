import { describe, it, expect } from 'vitest';
import { edmondsKarpMaxFlow } from '../edmondsKarpMaxFlow';

describe('edmondsKarpMaxFlow', () => {
  it('single edge', () => {
    const r = edmondsKarpMaxFlow(2, [{ from: 0, to: 1, capacity: 5 }], 0, 1);
    expect(r.maxFlow).toBe(5);
  });

  it('source === sink => 0', () => {
    const r = edmondsKarpMaxFlow(1, [], 0, 0);
    expect(r.maxFlow).toBe(0);
  });

  it('no path => 0', () => {
    const r = edmondsKarpMaxFlow(3, [{ from: 0, to: 1, capacity: 5 }], 0, 2);
    expect(r.maxFlow).toBe(0);
  });

  it('chain bottleneck', () => {
    const r = edmondsKarpMaxFlow(3, [
      { from: 0, to: 1, capacity: 10 },
      { from: 1, to: 2, capacity: 3 },
    ], 0, 2);
    expect(r.maxFlow).toBe(3);
  });

  it('diamond two parallel paths', () => {
    const r = edmondsKarpMaxFlow(4, [
      { from: 0, to: 1, capacity: 5 },
      { from: 0, to: 2, capacity: 5 },
      { from: 1, to: 3, capacity: 5 },
      { from: 2, to: 3, capacity: 5 },
    ], 0, 3);
    expect(r.maxFlow).toBe(10);
  });

  it('classic CLRS example', () => {
    const r = edmondsKarpMaxFlow(6, [
      { from: 0, to: 1, capacity: 16 },
      { from: 0, to: 2, capacity: 13 },
      { from: 1, to: 2, capacity: 10 },
      { from: 2, to: 1, capacity: 4 },
      { from: 1, to: 3, capacity: 12 },
      { from: 3, to: 2, capacity: 9 },
      { from: 2, to: 4, capacity: 14 },
      { from: 4, to: 3, capacity: 7 },
      { from: 3, to: 5, capacity: 20 },
      { from: 4, to: 5, capacity: 4 },
    ], 0, 5);
    expect(r.maxFlow).toBe(23);
  });

  it('throws on invalid nodeCount', () => {
    expect(() => edmondsKarpMaxFlow(0, [], 0, 0)).toThrow(RangeError);
  });

  it('throws on out-of-bounds source/sink', () => {
    expect(() => edmondsKarpMaxFlow(2, [], 5, 1)).toThrow(RangeError);
    expect(() => edmondsKarpMaxFlow(2, [], 0, 5)).toThrow(RangeError);
  });

  it('throws on negative capacity', () => {
    expect(() => edmondsKarpMaxFlow(2, [{ from: 0, to: 1, capacity: -1 }], 0, 1)).toThrow(RangeError);
  });

  it('throws on edge out-of-bounds', () => {
    expect(() => edmondsKarpMaxFlow(2, [{ from: 0, to: 5, capacity: 1 }], 0, 1)).toThrow(RangeError);
  });

  it('zero-capacity edges yield 0 flow', () => {
    const r = edmondsKarpMaxFlow(2, [{ from: 0, to: 1, capacity: 0 }], 0, 1);
    expect(r.maxFlow).toBe(0);
  });

  it('parallel edges sum capacity', () => {
    const r = edmondsKarpMaxFlow(2, [
      { from: 0, to: 1, capacity: 5 },
      { from: 0, to: 1, capacity: 3 },
    ], 0, 1);
    expect(r.maxFlow).toBe(8);
  });

  it('multiple augmenting paths converge', () => {
    const r = edmondsKarpMaxFlow(4, [
      { from: 0, to: 1, capacity: 100 },
      { from: 0, to: 2, capacity: 100 },
      { from: 1, to: 2, capacity: 1 },
      { from: 1, to: 3, capacity: 100 },
      { from: 2, to: 3, capacity: 100 },
    ], 0, 3);
    expect(r.maxFlow).toBe(200);
  });

  it('flowMatrix preserves capacity bounds', () => {
    const r = edmondsKarpMaxFlow(3, [
      { from: 0, to: 1, capacity: 5 },
      { from: 1, to: 2, capacity: 3 },
    ], 0, 2);
    expect(r.flowMatrix[0][1]).toBeLessThanOrEqual(5);
    expect(r.flowMatrix[1][2]).toBeLessThanOrEqual(3);
  });

  it('long chain', () => {
    const edges = [];
    const n = 10;
    for (let i = 0; i < n - 1; i++) edges.push({ from: i, to: i + 1, capacity: 7 });
    const r = edmondsKarpMaxFlow(n, edges, 0, n - 1);
    expect(r.maxFlow).toBe(7);
  });
});
