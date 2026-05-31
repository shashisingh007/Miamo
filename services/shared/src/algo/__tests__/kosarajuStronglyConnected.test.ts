import { describe, it, expect } from 'vitest';
import { kosarajuStronglyConnected } from '../kosarajuStronglyConnected';

describe('kosarajuStronglyConnected', () => {
  it('empty graph => 0 components', () => {
    const r = kosarajuStronglyConnected(0, []);
    expect(r.componentCount).toBe(0);
    expect(r.components).toEqual([]);
  });

  it('single node no edges => 1 component', () => {
    const r = kosarajuStronglyConnected(1, []);
    expect(r.componentCount).toBe(1);
    expect(r.components).toEqual([[0]]);
  });

  it('isolated nodes each own component', () => {
    const r = kosarajuStronglyConnected(3, []);
    expect(r.componentCount).toBe(3);
  });

  it('simple cycle => 1 SCC', () => {
    const r = kosarajuStronglyConnected(3, [[0, 1], [1, 2], [2, 0]]);
    expect(r.componentCount).toBe(1);
    expect(r.components[0]).toEqual([0, 1, 2]);
  });

  it('chain (no back edges) => N components', () => {
    const r = kosarajuStronglyConnected(4, [[0, 1], [1, 2], [2, 3]]);
    expect(r.componentCount).toBe(4);
  });

  it('classic two-SCC example', () => {
    const r = kosarajuStronglyConnected(5, [
      [0, 1], [1, 2], [2, 0],
      [2, 3], [3, 4], [4, 3],
    ]);
    expect(r.componentCount).toBe(2);
    const sets = r.components.map((c) => new Set(c));
    expect(sets.some((s) => s.has(0) && s.has(1) && s.has(2))).toBe(true);
    expect(sets.some((s) => s.has(3) && s.has(4))).toBe(true);
  });

  it('componentOf maps each node', () => {
    const r = kosarajuStronglyConnected(3, [[0, 1], [1, 2], [2, 0]]);
    expect(r.componentOf[0]).toBe(r.componentOf[1]);
    expect(r.componentOf[1]).toBe(r.componentOf[2]);
  });

  it('self-loop is its own 1-node SCC', () => {
    const r = kosarajuStronglyConnected(2, [[0, 0]]);
    expect(r.componentCount).toBe(2);
  });

  it('parallel edges don\'t affect SCC count', () => {
    const r = kosarajuStronglyConnected(2, [[0, 1], [0, 1]]);
    expect(r.componentCount).toBe(2);
  });

  it('throws on out-of-bounds edge', () => {
    expect(() => kosarajuStronglyConnected(2, [[0, 5]])).toThrow(RangeError);
  });

  it('throws on negative nodeCount', () => {
    expect(() => kosarajuStronglyConnected(-1, [])).toThrow(RangeError);
  });

  it('handles 1000-node chain without stack overflow', () => {
    const edges: Array<[number, number]> = [];
    for (let i = 0; i < 999; i++) edges.push([i, i + 1]);
    const r = kosarajuStronglyConnected(1000, edges);
    expect(r.componentCount).toBe(1000);
  });

  it('handles 1000-node cycle', () => {
    const edges: Array<[number, number]> = [];
    for (let i = 0; i < 1000; i++) edges.push([i, (i + 1) % 1000]);
    const r = kosarajuStronglyConnected(1000, edges);
    expect(r.componentCount).toBe(1);
  });

  it('two cycles joined by edge => 2 SCCs', () => {
    const r = kosarajuStronglyConnected(6, [
      [0, 1], [1, 2], [2, 0],
      [2, 3],
      [3, 4], [4, 5], [5, 3],
    ]);
    expect(r.componentCount).toBe(2);
  });

  it('disconnected component', () => {
    const r = kosarajuStronglyConnected(4, [[0, 1], [1, 0]]);
    expect(r.componentCount).toBe(3);
  });
});
