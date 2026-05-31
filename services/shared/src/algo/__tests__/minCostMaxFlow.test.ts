import { describe, it, expect } from 'vitest';
import { minCostMaxFlow } from '../minCostMaxFlow';

describe('minCostMaxFlow', () => {
  it('no edges => 0 flow', () => {
    const r = minCostMaxFlow(2, [], 0, 1);
    expect(r.flow).toBe(0);
    expect(r.cost).toBe(0);
  });

  it('source === sink => 0', () => {
    const r = minCostMaxFlow(1, [], 0, 0);
    expect(r).toEqual({ flow: 0, cost: 0 });
  });

  it('single edge', () => {
    const r = minCostMaxFlow(2, [{ from: 0, to: 1, capacity: 5, cost: 3 }], 0, 1);
    expect(r.flow).toBe(5);
    expect(r.cost).toBe(15);
  });

  it('two parallel paths chooses cheaper first', () => {
    const r = minCostMaxFlow(
      4,
      [
        { from: 0, to: 1, capacity: 3, cost: 1 },
        { from: 1, to: 3, capacity: 3, cost: 1 },
        { from: 0, to: 2, capacity: 5, cost: 10 },
        { from: 2, to: 3, capacity: 5, cost: 10 },
      ],
      0,
      3,
    );
    expect(r.flow).toBe(8);
    expect(r.cost).toBe(3 * 2 + 5 * 20);
  });

  it('bottleneck capacity', () => {
    const r = minCostMaxFlow(
      3,
      [
        { from: 0, to: 1, capacity: 10, cost: 1 },
        { from: 1, to: 2, capacity: 4, cost: 1 },
      ],
      0,
      2,
    );
    expect(r.flow).toBe(4);
    expect(r.cost).toBe(8);
  });

  it('disconnected sink', () => {
    const r = minCostMaxFlow(3, [{ from: 0, to: 1, capacity: 3, cost: 1 }], 0, 2);
    expect(r.flow).toBe(0);
  });

  it('throws on negative capacity', () => {
    expect(() => minCostMaxFlow(2, [{ from: 0, to: 1, capacity: -1, cost: 0 }], 0, 1)).toThrow();
  });

  it('throws on bad source', () => {
    expect(() => minCostMaxFlow(2, [], 5, 1)).toThrow();
  });

  it('throws on bad edge endpoint', () => {
    expect(() => minCostMaxFlow(2, [{ from: 0, to: 9, capacity: 1, cost: 1 }], 0, 1)).toThrow();
  });

  it('throws on bad n', () => {
    expect(() => minCostMaxFlow(0, [], 0, 0)).toThrow();
  });

  it('handles negative costs without negative cycle', () => {
    const r = minCostMaxFlow(
      4,
      [
        { from: 0, to: 1, capacity: 5, cost: 2 },
        { from: 1, to: 3, capacity: 5, cost: -1 },
        { from: 0, to: 2, capacity: 5, cost: 5 },
        { from: 2, to: 3, capacity: 5, cost: 5 },
      ],
      0,
      3,
    );
    expect(r.flow).toBe(10);
    // path0: 0->1->3 cost 1 * 5 = 5; path1: 0->2->3 cost 10 * 5 = 50
    expect(r.cost).toBe(55);
  });
});
