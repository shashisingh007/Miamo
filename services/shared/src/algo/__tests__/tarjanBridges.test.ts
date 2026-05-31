import { describe, it, expect } from 'vitest';
import { tarjanBridges } from '../tarjanBridges';

describe('tarjanBridges', () => {
  it('throws on negative vertexCount', () => {
    expect(() => tarjanBridges({ vertexCount: -1, edges: [] })).toThrow(RangeError);
  });

  it('empty graph', () => {
    expect(tarjanBridges({ vertexCount: 0, edges: [] })).toEqual([]);
  });

  it('single vertex', () => {
    expect(tarjanBridges({ vertexCount: 1, edges: [] })).toEqual([]);
  });

  it('two connected => one bridge', () => {
    expect(tarjanBridges({ vertexCount: 2, edges: [{ from: 0, to: 1 }] }))
      .toEqual([{ from: 0, to: 1 }]);
  });

  it('triangle => no bridges', () => {
    expect(tarjanBridges({
      vertexCount: 3,
      edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 }],
    })).toEqual([]);
  });

  it('path 0-1-2 => two bridges', () => {
    const r = tarjanBridges({
      vertexCount: 3,
      edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }],
    });
    expect(r).toEqual([{ from: 0, to: 1 }, { from: 1, to: 2 }]);
  });

  it('two triangles joined by edge => 1 bridge', () => {
    const r = tarjanBridges({
      vertexCount: 6,
      edges: [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 },
        { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 3 },
        { from: 2, to: 3 },
      ],
    });
    expect(r).toEqual([{ from: 2, to: 3 }]);
  });

  it('K4 => no bridges', () => {
    const e: { from: number; to: number }[] = [];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) e.push({ from: i, to: j });
    expect(tarjanBridges({ vertexCount: 4, edges: e })).toEqual([]);
  });

  it('parallel edges => no bridges between them', () => {
    const r = tarjanBridges({
      vertexCount: 2,
      edges: [{ from: 0, to: 1 }, { from: 0, to: 1 }],
    });
    expect(r).toEqual([]);
  });

  it('self-loop ignored', () => {
    const r = tarjanBridges({
      vertexCount: 2,
      edges: [{ from: 0, to: 0 }, { from: 0, to: 1 }],
    });
    expect(r).toEqual([{ from: 0, to: 1 }]);
  });

  it('disconnected components', () => {
    const r = tarjanBridges({
      vertexCount: 5,
      edges: [{ from: 0, to: 1 }, { from: 2, to: 3 }],
    });
    expect(r).toEqual([{ from: 0, to: 1 }, { from: 2, to: 3 }]);
  });

  it('throws on bad edge index', () => {
    expect(() => tarjanBridges({ vertexCount: 2, edges: [{ from: 0, to: 5 }] })).toThrow(RangeError);
  });

  it('result sorted ascending', () => {
    const r = tarjanBridges({
      vertexCount: 5,
      edges: [
        { from: 4, to: 3 }, { from: 3, to: 2 }, { from: 2, to: 1 }, { from: 1, to: 0 },
      ],
    });
    expect(r).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
    ]);
  });

  it('canonical from<to', () => {
    const r = tarjanBridges({ vertexCount: 2, edges: [{ from: 1, to: 0 }] });
    expect(r).toEqual([{ from: 0, to: 1 }]);
  });
});
