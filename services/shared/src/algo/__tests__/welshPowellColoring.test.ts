import { describe, it, expect } from 'vitest';
import { welshPowellColoring, isProperColoring } from '../welshPowellColoring';

describe('welshPowellColoring', () => {
  it('rejects bad nodeCount', () => {
    expect(() => welshPowellColoring({ nodeCount: -1, edges: [] })).toThrow(RangeError);
  });

  it('rejects bad edges array', () => {
    expect(() => welshPowellColoring({ nodeCount: 1, edges: 'x' as any })).toThrow(TypeError);
  });

  it('rejects bad endpoints', () => {
    expect(() => welshPowellColoring({ nodeCount: 2, edges: [[0, 9]] })).toThrow(RangeError);
  });

  it('empty graph', () => {
    expect(welshPowellColoring({ nodeCount: 0, edges: [] })).toEqual({ colors: [], colorCount: 0 });
  });

  it('isolated nodes all color 0', () => {
    const r = welshPowellColoring({ nodeCount: 3, edges: [] });
    expect(r.colors).toEqual([0, 0, 0]);
    expect(r.colorCount).toBe(1);
  });

  it('triangle needs 3 colors', () => {
    const g = { nodeCount: 3, edges: [[0, 1], [1, 2], [0, 2]] as [number, number][] };
    const r = welshPowellColoring(g);
    expect(r.colorCount).toBe(3);
    expect(isProperColoring(g, r.colors)).toBe(true);
  });

  it('K4 needs 4 colors', () => {
    const edges: [number, number][] = [];
    for (let i = 0; i < 4; i += 1) for (let j = i + 1; j < 4; j += 1) edges.push([i, j]);
    const g = { nodeCount: 4, edges };
    const r = welshPowellColoring(g);
    expect(r.colorCount).toBe(4);
    expect(isProperColoring(g, r.colors)).toBe(true);
  });

  it('bipartite needs 2 colors', () => {
    const g = {
      nodeCount: 4,
      edges: [[0, 2], [0, 3], [1, 2], [1, 3]] as [number, number][],
    };
    const r = welshPowellColoring(g);
    expect(r.colorCount).toBe(2);
    expect(isProperColoring(g, r.colors)).toBe(true);
  });

  it('path uses 2 colors', () => {
    const g = {
      nodeCount: 5,
      edges: [[0, 1], [1, 2], [2, 3], [3, 4]] as [number, number][],
    };
    const r = welshPowellColoring(g);
    expect(r.colorCount).toBe(2);
    expect(isProperColoring(g, r.colors)).toBe(true);
  });

  it('odd cycle needs 3 colors', () => {
    const g = {
      nodeCount: 5,
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]] as [number, number][],
    };
    const r = welshPowellColoring(g);
    expect(r.colorCount).toBe(3);
    expect(isProperColoring(g, r.colors)).toBe(true);
  });

  it('even cycle needs 2 colors', () => {
    const g = {
      nodeCount: 4,
      edges: [[0, 1], [1, 2], [2, 3], [3, 0]] as [number, number][],
    };
    const r = welshPowellColoring(g);
    expect(r.colorCount).toBe(2);
    expect(isProperColoring(g, r.colors)).toBe(true);
  });

  it('self-loop ignored', () => {
    const r = welshPowellColoring({ nodeCount: 2, edges: [[0, 0]] });
    expect(r.colorCount).toBe(1);
  });

  it('parallel edges OK', () => {
    const g = { nodeCount: 2, edges: [[0, 1], [0, 1]] as [number, number][] };
    const r = welshPowellColoring(g);
    expect(r.colorCount).toBe(2);
  });

  it('star K_{1,5} needs 2 colors', () => {
    const g = {
      nodeCount: 6,
      edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]] as [number, number][],
    };
    const r = welshPowellColoring(g);
    expect(r.colorCount).toBe(2);
    expect(isProperColoring(g, r.colors)).toBe(true);
  });

  it('result colors length matches nodeCount', () => {
    const r = welshPowellColoring({ nodeCount: 7, edges: [[0, 1]] });
    expect(r.colors).toHaveLength(7);
  });

  it('all colors in [0, colorCount)', () => {
    const g = {
      nodeCount: 6,
      edges: [
        [0, 1], [0, 2], [1, 2], [3, 4], [4, 5], [3, 5], [2, 3],
      ] as [number, number][],
    };
    const r = welshPowellColoring(g);
    for (const c of r.colors) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(r.colorCount);
    }
    expect(isProperColoring(g, r.colors)).toBe(true);
  });

  it('K_n always proper and bounded by n', () => {
    for (const n of [2, 3, 5, 7]) {
      const edges: [number, number][] = [];
      for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) edges.push([i, j]);
      const g = { nodeCount: n, edges };
      const r = welshPowellColoring(g);
      expect(r.colorCount).toBe(n);
      expect(isProperColoring(g, r.colors)).toBe(true);
    }
  });

  it('always produces a proper coloring on random graphs', () => {
    for (let t = 0; t < 5; t += 1) {
      const n = 5 + Math.floor(Math.random() * 10);
      const edges: [number, number][] = [];
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          if (Math.random() < 0.4) edges.push([i, j]);
        }
      }
      const g = { nodeCount: n, edges };
      const r = welshPowellColoring(g);
      expect(isProperColoring(g, r.colors)).toBe(true);
    }
  });
});
