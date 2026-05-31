import { describe, it, expect } from 'vitest';
import { treeToPruferSequence, pruferSequenceToEdges } from '../pruferSequence';

function normalizeEdges(edges: Array<[number, number]>): Array<[number, number]> {
  return edges
    .map(([a, b]) => (a <= b ? [a, b] : [b, a]) as [number, number])
    .sort((x, y) => (x[0] - y[0]) || (x[1] - y[1]));
}

describe('treeToPruferSequence', () => {
  it('throws on empty', () => {
    expect(() => treeToPruferSequence([])).toThrow(RangeError);
  });

  it('single vertex => empty', () => {
    expect(treeToPruferSequence([-1])).toEqual([]);
  });

  it('two vertices => empty', () => {
    expect(treeToPruferSequence([1, -1])).toEqual([]);
  });

  it('throws when last node has parent', () => {
    expect(() => treeToPruferSequence([1, 2, 0])).toThrow(RangeError);
  });

  it('throws on out-of-range parent', () => {
    expect(() => treeToPruferSequence([5, 0, -1])).toThrow(RangeError);
  });

  it('path 0-1-2 (parent: [1,2,-1]) => [1]', () => {
    expect(treeToPruferSequence([1, 2, -1])).toEqual([1]);
  });

  it('star at vertex 3: parents [3,3,3,-1] => [3,3]', () => {
    expect(treeToPruferSequence([3, 3, 3, -1])).toEqual([3, 3]);
  });
});

describe('pruferSequenceToEdges', () => {
  it('throws on bad vertexCount', () => {
    expect(() => pruferSequenceToEdges([], 0)).toThrow(RangeError);
  });

  it('throws on wrong seq length', () => {
    expect(() => pruferSequenceToEdges([1], 5)).toThrow(RangeError);
  });

  it('throws on out-of-range seq entry', () => {
    expect(() => pruferSequenceToEdges([99], 3)).toThrow(RangeError);
  });

  it('n=1 => no edges', () => {
    expect(pruferSequenceToEdges([], 1)).toEqual([]);
  });

  it('n=2 => single edge 0-1', () => {
    expect(pruferSequenceToEdges([], 2)).toEqual([[0, 1]]);
  });

  it('round-trip path of 4 (parents [1,2,3,-1])', () => {
    const parent = [1, 2, 3, -1];
    const seq = treeToPruferSequence(parent);
    const edges = pruferSequenceToEdges(seq, parent.length);
    const expected: Array<[number, number]> = [[0, 1], [1, 2], [2, 3]];
    expect(normalizeEdges(edges)).toEqual(normalizeEdges(expected));
  });

  it('round-trip star at 3 with leaves 0,1,2', () => {
    const parent = [3, 3, 3, -1];
    const seq = treeToPruferSequence(parent);
    const edges = pruferSequenceToEdges(seq, parent.length);
    const expected: Array<[number, number]> = [[0, 3], [1, 3], [2, 3]];
    expect(normalizeEdges(edges)).toEqual(normalizeEdges(expected));
  });

  it('round-trip 6-node tree', () => {
    const parent = [1, 5, 1, 2, 2, -1];
    const seq = treeToPruferSequence(parent);
    expect(seq.length).toBe(4);
    const edges = pruferSequenceToEdges(seq, parent.length);
    expect(edges.length).toBe(5);
  });

  it('decoded edges form a tree (n-1 edges, n nodes)', () => {
    const seq = [2, 0, 2];
    const edges = pruferSequenceToEdges(seq, 5);
    expect(edges.length).toBe(4);
    const seen = new Set<number>();
    for (const [a, b] of edges) { seen.add(a); seen.add(b); }
    expect(seen.size).toBe(5);
  });
});
