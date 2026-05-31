import { describe, it, expect } from 'vitest';
import { fordFulkersonMaxFlow } from '../fordFulkersonMaxFlow';

describe('fordFulkersonMaxFlow', () => {
  it('throws on bad capacity', () => {
    expect(() => fordFulkersonMaxFlow(null as any, 0, 1)).toThrow();
  });

  it('throws on empty', () => {
    expect(() => fordFulkersonMaxFlow([], 0, 1)).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => fordFulkersonMaxFlow([[0, 1]], 0, 1)).toThrow();
  });

  it('throws on negative capacity', () => {
    expect(() => fordFulkersonMaxFlow([[0, -1], [0, 0]], 0, 1)).toThrow();
  });

  it('throws on non-finite capacity', () => {
    expect(() => fordFulkersonMaxFlow([[0, NaN], [0, 0]], 0, 1)).toThrow();
  });

  it('throws on bad source/sink', () => {
    const cap = [[0, 1], [0, 0]];
    expect(() => fordFulkersonMaxFlow(cap, -1, 1)).toThrow();
    expect(() => fordFulkersonMaxFlow(cap, 0, 5)).toThrow();
    expect(() => fordFulkersonMaxFlow(cap, 0, 0)).toThrow();
  });

  it('single edge', () => {
    const cap = [[0, 7], [0, 0]];
    expect(fordFulkersonMaxFlow(cap, 0, 1).flow).toBe(7);
  });

  it('parallel paths', () => {
    // s=0, t=3; two disjoint paths
    const cap = [
      [0, 10, 5, 0],
      [0, 0, 0, 8],
      [0, 0, 0, 4],
      [0, 0, 0, 0],
    ];
    expect(fordFulkersonMaxFlow(cap, 0, 3).flow).toBe(12); // 0->1->3: 8; 0->2->3: 4
  });

  it('classic CLRS example', () => {
    // 6 nodes, classic max-flow value 23
    const cap = [
      [0, 16, 13, 0, 0, 0],
      [0, 0, 10, 12, 0, 0],
      [0, 4, 0, 0, 14, 0],
      [0, 0, 9, 0, 0, 20],
      [0, 0, 0, 7, 0, 4],
      [0, 0, 0, 0, 0, 0],
    ];
    expect(fordFulkersonMaxFlow(cap, 0, 5).flow).toBe(23);
  });

  it('disconnected sink => 0', () => {
    const cap = [
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    expect(fordFulkersonMaxFlow(cap, 0, 2).flow).toBe(0);
  });

  it('flow matrix conservation', () => {
    const cap = [
      [0, 5, 5, 0],
      [0, 0, 0, 5],
      [0, 0, 0, 5],
      [0, 0, 0, 0],
    ];
    const { flow, flowMatrix } = fordFulkersonMaxFlow(cap, 0, 3);
    expect(flow).toBe(10);
    // outflow source = inflow sink
    let out = 0;
    let inS = 0;
    for (let i = 0; i < 4; i++) out += Math.max(0, flowMatrix[0][i]);
    for (let i = 0; i < 4; i++) inS += Math.max(0, flowMatrix[i][3]);
    expect(out).toBe(10);
    expect(inS).toBe(10);
  });

  it('does not mutate capacity', () => {
    const cap = [[0, 7], [0, 0]];
    const ref = JSON.parse(JSON.stringify(cap));
    fordFulkersonMaxFlow(cap, 0, 1);
    expect(cap).toEqual(ref);
  });

  it('zero capacity graph', () => {
    const cap = [
      [0, 0],
      [0, 0],
    ];
    expect(fordFulkersonMaxFlow(cap, 0, 1).flow).toBe(0);
  });

  it('bidirectional capacity', () => {
    const cap = [
      [0, 3, 0],
      [3, 0, 5],
      [0, 0, 0],
    ];
    expect(fordFulkersonMaxFlow(cap, 0, 2).flow).toBe(3);
  });

  it('larger graph', () => {
    const cap = [
      [0, 10, 10, 0, 0, 0],
      [0, 0, 2, 4, 8, 0],
      [0, 0, 0, 0, 9, 0],
      [0, 0, 0, 0, 0, 10],
      [0, 0, 0, 6, 0, 10],
      [0, 0, 0, 0, 0, 0],
    ];
    expect(fordFulkersonMaxFlow(cap, 0, 5).flow).toBe(19);
  });

  it('returns new flowMatrix', () => {
    const cap = [[0, 1], [0, 0]];
    const r = fordFulkersonMaxFlow(cap, 0, 1);
    expect(r.flowMatrix).not.toBe(cap);
    expect(r.flowMatrix.length).toBe(2);
  });
});
