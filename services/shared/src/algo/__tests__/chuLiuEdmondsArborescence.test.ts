import { describe, it, expect } from 'vitest';
import { chuLiuEdmondsArborescence, type ArborescenceEdge } from '../chuLiuEdmondsArborescence';

function totalWeight(edges: ArborescenceEdge[], indices: number[]): number {
  return indices.reduce((s, i) => s + edges[i].weight, 0);
}

describe('chuLiuEdmondsArborescence', () => {
  it('rejects bad n', () => {
    expect(() => chuLiuEdmondsArborescence(0, [], 0)).toThrow(RangeError);
  });

  it('rejects bad root', () => {
    expect(() => chuLiuEdmondsArborescence(3, [], -1)).toThrow(RangeError);
    expect(() => chuLiuEdmondsArborescence(3, [], 3)).toThrow(RangeError);
  });

  it('rejects bad edges', () => {
    expect(() => chuLiuEdmondsArborescence(3, 'x' as any, 0)).toThrow(TypeError);
  });

  it('rejects out-of-range endpoint', () => {
    expect(() => chuLiuEdmondsArborescence(3, [{ from: 0, to: 5, weight: 1 }], 0)).toThrow(RangeError);
  });

  it('rejects non-finite weight', () => {
    expect(() => chuLiuEdmondsArborescence(2, [{ from: 0, to: 1, weight: NaN }], 0)).toThrow(RangeError);
  });

  it('single vertex root only', () => {
    const r = chuLiuEdmondsArborescence(1, [], 0);
    expect(r.edgeIndices).toEqual([]);
    expect(r.totalWeight).toBe(0);
  });

  it('throws when unreachable vertex exists', () => {
    expect(() => chuLiuEdmondsArborescence(3, [{ from: 0, to: 1, weight: 1 }], 0)).toThrow(/no incoming/);
  });

  it('simple two-vertex graph', () => {
    const e = [{ from: 0, to: 1, weight: 5 }];
    const r = chuLiuEdmondsArborescence(2, e, 0);
    expect(r.edgeIndices).toEqual([0]);
    expect(r.totalWeight).toBe(5);
  });

  it('picks cheapest of parallel edges', () => {
    const e = [
      { from: 0, to: 1, weight: 10 },
      { from: 0, to: 1, weight: 3 },
      { from: 0, to: 1, weight: 7 },
    ];
    const r = chuLiuEdmondsArborescence(2, e, 0);
    expect(r.totalWeight).toBe(3);
    expect(r.edgeIndices).toEqual([1]);
  });

  it('star graph from root', () => {
    const e: ArborescenceEdge[] = [
      { from: 0, to: 1, weight: 1 },
      { from: 0, to: 2, weight: 2 },
      { from: 0, to: 3, weight: 3 },
    ];
    const r = chuLiuEdmondsArborescence(4, e, 0);
    expect(r.totalWeight).toBe(6);
    expect(r.edgeIndices).toEqual([0, 1, 2]);
  });

  it('chooses cheapest in parents even with chain', () => {
    // root=0; verts 1,2,3 in a chain plus shortcut.
    const e: ArborescenceEdge[] = [
      { from: 0, to: 1, weight: 1 },
      { from: 1, to: 2, weight: 1 },
      { from: 2, to: 3, weight: 1 },
      { from: 0, to: 3, weight: 10 },
    ];
    const r = chuLiuEdmondsArborescence(4, e, 0);
    expect(r.totalWeight).toBe(3);
    expect(r.edgeIndices.sort()).toEqual([0, 1, 2]);
  });

  it('handles cycle: must contract', () => {
    // root=0, vertices 1,2,3. cycle 1->2->3->1 cheap; root->1 expensive,
    // root->2 cheaper.
    //   0->1 (10), 0->2 (5), 1->2 (1), 2->3 (1), 3->1 (1)
    // Min arborescence: 0->2, 2->3, 3->1.   total = 5+1+1 = 7.
    const e: ArborescenceEdge[] = [
      { from: 0, to: 1, weight: 10 },
      { from: 0, to: 2, weight: 5 },
      { from: 1, to: 2, weight: 1 },
      { from: 2, to: 3, weight: 1 },
      { from: 3, to: 1, weight: 1 },
    ];
    const r = chuLiuEdmondsArborescence(4, e, 0);
    expect(r.totalWeight).toBe(7);
  });

  it('ignores self-loops', () => {
    const e: ArborescenceEdge[] = [
      { from: 0, to: 1, weight: 5 },
      { from: 1, to: 1, weight: -100 },
    ];
    const r = chuLiuEdmondsArborescence(2, e, 0);
    expect(r.totalWeight).toBe(5);
  });

  it('ignores edges into root', () => {
    const e: ArborescenceEdge[] = [
      { from: 1, to: 0, weight: -100 },
      { from: 0, to: 1, weight: 1 },
    ];
    const r = chuLiuEdmondsArborescence(2, e, 0);
    expect(r.totalWeight).toBe(1);
    expect(r.edgeIndices).toEqual([1]);
  });

  it('negative weights allowed', () => {
    const e: ArborescenceEdge[] = [
      { from: 0, to: 1, weight: -1 },
      { from: 0, to: 2, weight: -2 },
    ];
    const r = chuLiuEdmondsArborescence(3, e, 0);
    expect(r.totalWeight).toBe(-3);
  });

  it('selects exactly n-1 edges', () => {
    const e: ArborescenceEdge[] = [
      { from: 0, to: 1, weight: 1 },
      { from: 1, to: 2, weight: 2 },
      { from: 0, to: 2, weight: 5 },
    ];
    const r = chuLiuEdmondsArborescence(3, e, 0);
    expect(r.edgeIndices.length).toBe(2);
    expect(r.totalWeight).toBe(3);
  });

  it('larger cycle case', () => {
    // root=0; 1->2->3->4->1 forming cycle; root->1 (8)
    // Edges: 0->1 (8), 1->2 (1), 2->3 (1), 3->4 (1), 4->1 (1)
    // arborescence: 0->1, 1->2, 2->3, 3->4. total = 8+1+1+1 = 11.
    const e: ArborescenceEdge[] = [
      { from: 0, to: 1, weight: 8 },
      { from: 1, to: 2, weight: 1 },
      { from: 2, to: 3, weight: 1 },
      { from: 3, to: 4, weight: 1 },
      { from: 4, to: 1, weight: 1 },
    ];
    const r = chuLiuEdmondsArborescence(5, e, 0);
    expect(r.totalWeight).toBe(11);
    expect(r.edgeIndices.length).toBe(4);
  });

  it('multiple parents — totalWeight matches edgeIndices sum', () => {
    const e: ArborescenceEdge[] = [
      { from: 0, to: 1, weight: 3 },
      { from: 0, to: 2, weight: 4 },
      { from: 1, to: 2, weight: 2 },
      { from: 2, to: 1, weight: 1 },
    ];
    const r = chuLiuEdmondsArborescence(3, e, 0);
    expect(r.totalWeight).toBe(totalWeight(e, r.edgeIndices));
  });
});
