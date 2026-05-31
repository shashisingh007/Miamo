import { describe, it, expect } from 'vitest';
import { hierholzerEulerCircuit } from '../hierholzerEulerCircuit';

describe('hierholzerEulerCircuit', () => {
  it('throws on negative vertexCount', () => {
    expect(() => hierholzerEulerCircuit(-1, [])).toThrow(RangeError);
  });

  it('throws on out-of-range start', () => {
    expect(() => hierholzerEulerCircuit(2, [], 5)).toThrow(RangeError);
  });

  it('throws on out-of-range edge', () => {
    expect(() => hierholzerEulerCircuit(2, [{ from: 0, to: 5 }])).toThrow(RangeError);
  });

  it('zero vertices, zero edges => trivial', () => {
    const r = hierholzerEulerCircuit(0, []);
    expect(r).toEqual({ hasEulerCircuit: true, circuit: [] });
  });

  it('single vertex, no edges => trivial', () => {
    const r = hierholzerEulerCircuit(1, [], 0);
    expect(r).toEqual({ hasEulerCircuit: true, circuit: [0] });
  });

  it('triangle 0-1-2-0 => circuit length 4', () => {
    const r = hierholzerEulerCircuit(3, [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 },
    ]);
    expect(r.hasEulerCircuit).toBe(true);
    expect(r.circuit).toHaveLength(4);
    expect(r.circuit[0]).toBe(r.circuit[r.circuit.length - 1]);
  });

  it('square 0-1-2-3-0', () => {
    const r = hierholzerEulerCircuit(4, [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 0 },
    ]);
    expect(r.hasEulerCircuit).toBe(true);
    expect(r.circuit).toHaveLength(5);
  });

  it('odd-degree vertex => no circuit', () => {
    const r = hierholzerEulerCircuit(3, [{ from: 0, to: 1 }, { from: 1, to: 2 }]);
    expect(r.hasEulerCircuit).toBe(false);
    expect(r.circuit).toEqual([]);
  });

  it('K4 has all odd degrees => no Euler circuit', () => {
    const r = hierholzerEulerCircuit(4, [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 },
      { from: 1, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 3 },
    ]);
    expect(r.hasEulerCircuit).toBe(false);
  });

  it('K5 has Euler circuit (all even degrees)', () => {
    const edges = [] as Array<{ from: number; to: number }>;
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) edges.push({ from: i, to: j });
    const r = hierholzerEulerCircuit(5, edges);
    expect(r.hasEulerCircuit).toBe(true);
    expect(r.circuit).toHaveLength(edges.length + 1);
  });

  it('disconnected component => no circuit if start has no edges', () => {
    const r = hierholzerEulerCircuit(4, [
      { from: 0, to: 1 }, { from: 1, to: 0 },
    ], 2);
    expect(r.hasEulerCircuit).toBe(false);
  });

  it('disconnected => incomplete circuit detected', () => {
    const r = hierholzerEulerCircuit(4, [
      { from: 0, to: 1 }, { from: 1, to: 0 },
      { from: 2, to: 3 }, { from: 3, to: 2 },
    ], 0);
    expect(r.hasEulerCircuit).toBe(false);
  });

  it('two triangles sharing a vertex', () => {
    const r = hierholzerEulerCircuit(5, [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 },
      { from: 0, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 0 },
    ]);
    expect(r.hasEulerCircuit).toBe(true);
    expect(r.circuit).toHaveLength(7);
  });

  it('multigraph two parallel edges => circuit', () => {
    const r = hierholzerEulerCircuit(2, [
      { from: 0, to: 1 }, { from: 1, to: 0 },
    ]);
    expect(r.hasEulerCircuit).toBe(true);
    expect(r.circuit).toHaveLength(3);
  });

  it('uses each edge exactly once', () => {
    const edges = [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 },
      { from: 0, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 0 },
    ];
    const r = hierholzerEulerCircuit(5, edges);
    const used = new Map<string, number>();
    for (let i = 0; i + 1 < r.circuit.length; i++) {
      const a = r.circuit[i];
      const b = r.circuit[i + 1];
      const k = a < b ? `${a}-${b}` : `${b}-${a}`;
      used.set(k, (used.get(k) ?? 0) + 1);
    }
    for (const e of edges) {
      const k = e.from < e.to ? `${e.from}-${e.to}` : `${e.to}-${e.from}`;
      expect(used.get(k)).toBe(1);
    }
  });
});
