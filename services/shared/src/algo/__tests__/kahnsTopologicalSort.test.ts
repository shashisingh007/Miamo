import { describe, it, expect } from 'vitest';
import { kahnsTopologicalSort } from '../kahnsTopologicalSort';

function isValidTopo(order: number[], n: number, edges: ReadonlyArray<[number, number]>): boolean {
  if (order.length !== n) return false;
  const pos = new Array<number>(n).fill(-1);
  order.forEach((v, i) => {
    pos[v] = i;
  });
  if (pos.some((p) => p === -1)) return false;
  for (const [u, v] of edges) if (pos[u] >= pos[v]) return false;
  return true;
}

describe('kahnsTopologicalSort', () => {
  it('empty graph', () => {
    expect(kahnsTopologicalSort(0, [])).toEqual([]);
  });

  it('single node', () => {
    expect(kahnsTopologicalSort(1, [])).toEqual([0]);
  });

  it('chain produces sorted order', () => {
    expect(kahnsTopologicalSort(4, [[0, 1], [1, 2], [2, 3]])).toEqual([0, 1, 2, 3]);
  });

  it('reverse chain still resolves', () => {
    const r = kahnsTopologicalSort(4, [[3, 2], [2, 1], [1, 0]]);
    expect(r).toEqual([3, 2, 1, 0]);
  });

  it('detects 2-cycle', () => {
    expect(kahnsTopologicalSort(2, [[0, 1], [1, 0]])).toBeNull();
  });

  it('detects self-loop', () => {
    expect(kahnsTopologicalSort(2, [[0, 0]])).toBeNull();
  });

  it('valid order for diamond', () => {
    const edges: Array<[number, number]> = [[0, 1], [0, 2], [1, 3], [2, 3]];
    const r = kahnsTopologicalSort(4, edges);
    expect(r).not.toBeNull();
    expect(isValidTopo(r!, 4, edges)).toBe(true);
  });

  it('ties broken by smallest id first', () => {
    expect(kahnsTopologicalSort(3, [])).toEqual([0, 1, 2]);
  });

  it('throws on bad inputs', () => {
    expect(() => kahnsTopologicalSort(-1, [])).toThrow();
    expect(() => kahnsTopologicalSort(2, [[0, 5]])).toThrow();
  });

  it('larger DAG validity', () => {
    const edges: Array<[number, number]> = [
      [0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5], [2, 5],
    ];
    const r = kahnsTopologicalSort(6, edges);
    expect(r).not.toBeNull();
    expect(isValidTopo(r!, 6, edges)).toBe(true);
  });
});
