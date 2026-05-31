import { describe, it, expect } from 'vitest';
import { biconnectedComponentsTarjan } from '../biconnectedComponentsTarjan';

describe('biconnectedComponentsTarjan', () => {
  it('throws on negative vertexCount', () => {
    expect(() => biconnectedComponentsTarjan({ vertexCount: -1, edges: [] })).toThrow(RangeError);
  });

  it('empty graph', () => {
    expect(biconnectedComponentsTarjan({ vertexCount: 0, edges: [] })).toEqual([]);
  });

  it('single vertex => no components', () => {
    expect(biconnectedComponentsTarjan({ vertexCount: 1, edges: [] })).toEqual([]);
  });

  it('single edge => one component', () => {
    const r = biconnectedComponentsTarjan({ vertexCount: 2, edges: [{ from: 0, to: 1 }] });
    expect(r).toHaveLength(1);
    expect(r[0].edges).toEqual([{ from: 0, to: 1 }]);
  });

  it('triangle => one component', () => {
    const r = biconnectedComponentsTarjan({
      vertexCount: 3,
      edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 }],
    });
    expect(r).toHaveLength(1);
    expect(r[0].edges).toHaveLength(3);
  });

  it('path 0-1-2 => two components', () => {
    const r = biconnectedComponentsTarjan({
      vertexCount: 3,
      edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }],
    });
    expect(r).toHaveLength(2);
  });

  it('two triangles joined by edge => 3 components', () => {
    const r = biconnectedComponentsTarjan({
      vertexCount: 6,
      edges: [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 },
        { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 3 },
        { from: 2, to: 3 },
      ],
    });
    expect(r).toHaveLength(3);
    const sizes = r.map((c) => c.edges.length).sort((a, b) => a - b);
    expect(sizes).toEqual([1, 3, 3]);
  });

  it('K4 => single component', () => {
    const e: { from: number; to: number }[] = [];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) e.push({ from: i, to: j });
    const r = biconnectedComponentsTarjan({ vertexCount: 4, edges: e });
    expect(r).toHaveLength(1);
    expect(r[0].edges).toHaveLength(6);
  });

  it('self-loops ignored', () => {
    const r = biconnectedComponentsTarjan({
      vertexCount: 2,
      edges: [{ from: 0, to: 0 }, { from: 0, to: 1 }],
    });
    expect(r).toHaveLength(1);
    expect(r[0].edges).toEqual([{ from: 0, to: 1 }]);
  });

  it('disconnected components', () => {
    const r = biconnectedComponentsTarjan({
      vertexCount: 4,
      edges: [{ from: 0, to: 1 }, { from: 2, to: 3 }],
    });
    expect(r).toHaveLength(2);
  });

  it('throws on bad edge index', () => {
    expect(() => biconnectedComponentsTarjan({ vertexCount: 2, edges: [{ from: 0, to: 5 }] }))
      .toThrow(RangeError);
  });

  it('star with center 0 => 3 components', () => {
    const r = biconnectedComponentsTarjan({
      vertexCount: 4,
      edges: [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 }],
    });
    expect(r).toHaveLength(3);
  });

  it('edges within component sorted', () => {
    const r = biconnectedComponentsTarjan({
      vertexCount: 4,
      edges: [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 1 },
      ],
    });
    // Bridge 0-1 + cycle 1-2-3 = 2 components
    expect(r).toHaveLength(2);
    for (const c of r) {
      for (let i = 0; i + 1 < c.edges.length; i++) {
        const a = c.edges[i];
        const b = c.edges[i + 1];
        const cmp = (a.from - b.from) || (a.to - b.to);
        expect(cmp).toBeLessThanOrEqual(0);
      }
    }
  });

  it('total edge count preserved', () => {
    const edges = [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 },
      { from: 2, to: 3 }, { from: 3, to: 4 },
    ];
    const r = biconnectedComponentsTarjan({ vertexCount: 5, edges });
    const total = r.reduce((s, c) => s + c.edges.length, 0);
    expect(total).toBe(edges.length);
  });
});
