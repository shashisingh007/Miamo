import { describe, it, expect } from 'vitest';
import { dinicMaxFlow } from '../dinicMaxFlow';

describe('dinicMaxFlow', () => {
  it('source == sink => 0', () => {
    const r = dinicMaxFlow(3, [{ from: 0, to: 1, capacity: 5 }], 0, 0);
    expect(r.maxFlow).toBe(0);
  });

  it('throws on bad vertexCount', () => {
    expect(() => dinicMaxFlow(-1, [], 0, 0)).toThrow(RangeError);
  });

  it('throws on out-of-range source', () => {
    expect(() => dinicMaxFlow(2, [], 5, 1)).toThrow(RangeError);
  });

  it('throws on negative capacity', () => {
    expect(() => dinicMaxFlow(2, [{ from: 0, to: 1, capacity: -1 }], 0, 1)).toThrow(RangeError);
  });

  it('no path => 0', () => {
    const r = dinicMaxFlow(3, [{ from: 0, to: 1, capacity: 5 }], 0, 2);
    expect(r.maxFlow).toBe(0);
  });

  it('single edge bottleneck', () => {
    const r = dinicMaxFlow(2, [{ from: 0, to: 1, capacity: 7 }], 0, 1);
    expect(r.maxFlow).toBe(7);
    expect(r.flowMatrix[0][1]).toBe(7);
  });

  it('parallel paths sum', () => {
    const r = dinicMaxFlow(4, [
      { from: 0, to: 1, capacity: 3 },
      { from: 1, to: 3, capacity: 3 },
      { from: 0, to: 2, capacity: 2 },
      { from: 2, to: 3, capacity: 2 },
    ], 0, 3);
    expect(r.maxFlow).toBe(5);
  });

  it('classic graph max flow', () => {
    const r = dinicMaxFlow(6, [
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

  it('flow conservation at intermediate nodes', () => {
    const r = dinicMaxFlow(4, [
      { from: 0, to: 1, capacity: 3 },
      { from: 1, to: 2, capacity: 3 },
      { from: 2, to: 3, capacity: 3 },
    ], 0, 3);
    expect(r.maxFlow).toBe(3);
    const inflow1 = r.flowMatrix[0][1];
    const outflow1 = r.flowMatrix[1][2];
    expect(inflow1).toBe(outflow1);
  });

  it('zero-capacity edges contribute nothing', () => {
    const r = dinicMaxFlow(3, [
      { from: 0, to: 1, capacity: 0 },
      { from: 1, to: 2, capacity: 5 },
    ], 0, 2);
    expect(r.maxFlow).toBe(0);
  });

  it('flowMatrix bounded by capacities', () => {
    const r = dinicMaxFlow(3, [
      { from: 0, to: 1, capacity: 5 },
      { from: 1, to: 2, capacity: 3 },
    ], 0, 2);
    expect(r.flowMatrix[0][1]).toBeLessThanOrEqual(5);
    expect(r.flowMatrix[1][2]).toBeLessThanOrEqual(3);
    expect(r.maxFlow).toBe(3);
  });

  it('empty edges => 0', () => {
    const r = dinicMaxFlow(2, [], 0, 1);
    expect(r.maxFlow).toBe(0);
  });

  it('disconnected sink', () => {
    const r = dinicMaxFlow(4, [
      { from: 0, to: 1, capacity: 10 },
      { from: 2, to: 3, capacity: 10 },
    ], 0, 3);
    expect(r.maxFlow).toBe(0);
  });
});
