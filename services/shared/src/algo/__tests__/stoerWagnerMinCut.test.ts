import { describe, it, expect } from 'vitest';
import { stoerWagnerMinCut } from '../stoerWagnerMinCut';

describe('stoerWagnerMinCut', () => {
  it('throws on n<2', () => {
    expect(() => stoerWagnerMinCut([[0]])).toThrow(RangeError);
  });

  it('throws on non-square', () => {
    expect(() => stoerWagnerMinCut([[0, 1], [1]])).toThrow(RangeError);
  });

  it('throws on asymmetric', () => {
    expect(() => stoerWagnerMinCut([[0, 1], [2, 0]])).toThrow(RangeError);
  });

  it('throws on negative weight', () => {
    expect(() => stoerWagnerMinCut([[0, -1], [-1, 0]])).toThrow(RangeError);
  });

  it('single edge K2', () => {
    const r = stoerWagnerMinCut([[0, 5], [5, 0]]);
    expect(r.minCutWeight).toBe(5);
    const all = [...r.partition.sideA, ...r.partition.sideB].sort();
    expect(all).toEqual([0, 1]);
  });

  it('triangle equal weights', () => {
    const r = stoerWagnerMinCut([
      [0, 3, 3],
      [3, 0, 3],
      [3, 3, 0],
    ]);
    expect(r.minCutWeight).toBe(6);
  });

  it('disconnected => 0', () => {
    const r = stoerWagnerMinCut([
      [0, 5, 0],
      [5, 0, 0],
      [0, 0, 0],
    ]);
    expect(r.minCutWeight).toBe(0);
  });

  it('path 0-1-2 weighted', () => {
    const r = stoerWagnerMinCut([
      [0, 4, 0],
      [4, 0, 2],
      [0, 2, 0],
    ]);
    expect(r.minCutWeight).toBe(2);
  });

  it('classic Stoer-Wagner example', () => {
    const w = [
      [0, 2, 0, 0, 3, 0, 0, 0],
      [2, 0, 3, 0, 2, 2, 0, 0],
      [0, 3, 0, 4, 0, 0, 2, 0],
      [0, 0, 4, 0, 0, 0, 2, 2],
      [3, 2, 0, 0, 0, 3, 0, 0],
      [0, 2, 0, 0, 3, 0, 1, 0],
      [0, 0, 2, 2, 0, 1, 0, 3],
      [0, 0, 0, 2, 0, 0, 3, 0],
    ];
    const r = stoerWagnerMinCut(w);
    expect(r.minCutWeight).toBe(4);
  });

  it('K4 unit weights => 3', () => {
    const w = [
      [0, 1, 1, 1],
      [1, 0, 1, 1],
      [1, 1, 0, 1],
      [1, 1, 1, 0],
    ];
    const r = stoerWagnerMinCut(w);
    expect(r.minCutWeight).toBe(3);
  });

  it('partition non-empty when cut > 0', () => {
    const r = stoerWagnerMinCut([
      [0, 7, 0],
      [7, 0, 5],
      [0, 5, 0],
    ]);
    expect(r.partition.sideA.length).toBeGreaterThan(0);
    expect(r.partition.sideB.length).toBeGreaterThan(0);
  });

  it('partition covers all vertices', () => {
    const r = stoerWagnerMinCut([
      [0, 1, 2, 3],
      [1, 0, 4, 1],
      [2, 4, 0, 1],
      [3, 1, 1, 0],
    ]);
    const all = [...r.partition.sideA, ...r.partition.sideB].sort((a, b) => a - b);
    expect(all).toEqual([0, 1, 2, 3]);
  });
});
