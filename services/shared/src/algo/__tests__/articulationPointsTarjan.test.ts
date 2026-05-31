import { describe, it, expect } from 'vitest';
import { articulationPointsTarjan } from '../articulationPointsTarjan';

describe('articulationPointsTarjan', () => {
  it('throws on negative vertexCount', () => {
    expect(() => articulationPointsTarjan({ vertexCount: -1, edges: [] })).toThrow(RangeError);
  });

  it('empty graph', () => {
    expect(articulationPointsTarjan({ vertexCount: 0, edges: [] })).toEqual([]);
  });

  it('single vertex', () => {
    expect(articulationPointsTarjan({ vertexCount: 1, edges: [] })).toEqual([]);
  });

  it('two connected', () => {
    expect(articulationPointsTarjan({ vertexCount: 2, edges: [{ from: 0, to: 1 }] })).toEqual([]);
  });

  it('path 0-1-2 => 1 is articulation', () => {
    const r = articulationPointsTarjan({
      vertexCount: 3,
      edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }],
    });
    expect(r).toEqual([1]);
  });

  it('triangle => none', () => {
    const r = articulationPointsTarjan({
      vertexCount: 3,
      edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 }],
    });
    expect(r).toEqual([]);
  });

  it('star with center 0 => 0 articulation', () => {
    const r = articulationPointsTarjan({
      vertexCount: 4,
      edges: [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 }],
    });
    expect(r).toEqual([0]);
  });

  it('two triangles sharing vertex 2', () => {
    const r = articulationPointsTarjan({
      vertexCount: 5,
      edges: [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 },
        { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 2 },
      ],
    });
    expect(r).toEqual([2]);
  });

  it('disconnected components handled', () => {
    const r = articulationPointsTarjan({
      vertexCount: 5,
      edges: [
        { from: 0, to: 1 }, { from: 1, to: 2 },
        { from: 3, to: 4 },
      ],
    });
    expect(r).toEqual([1]);
  });

  it('self-loop ignored', () => {
    const r = articulationPointsTarjan({
      vertexCount: 3,
      edges: [{ from: 0, to: 0 }, { from: 0, to: 1 }, { from: 1, to: 2 }],
    });
    expect(r).toEqual([1]);
  });

  it('K4 => none', () => {
    const e: { from: number; to: number }[] = [];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) e.push({ from: i, to: j });
    expect(articulationPointsTarjan({ vertexCount: 4, edges: e })).toEqual([]);
  });

  it('throws on bad edge index', () => {
    expect(() => articulationPointsTarjan({ vertexCount: 2, edges: [{ from: 0, to: 5 }] }))
      .toThrow(RangeError);
  });

  it('returns sorted ascending', () => {
    const r = articulationPointsTarjan({
      vertexCount: 5,
      edges: [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
      ],
    });
    expect(r).toEqual([1, 2, 3]);
  });
});
