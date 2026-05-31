import { describe, it, expect } from 'vitest';
import { hilbertIndexToXY, hilbertXYToIndex } from '../hilbertCurveMap';

describe('hilbertCurveMap', () => {
  it('throws on negative order', () => {
    expect(() => hilbertIndexToXY(-1, 0)).toThrow(RangeError);
  });

  it('throws on non-integer order', () => {
    expect(() => hilbertIndexToXY(1.5, 0)).toThrow(RangeError);
  });

  it('throws on out-of-range index', () => {
    expect(() => hilbertIndexToXY(1, 4)).toThrow(RangeError);
  });

  it('order 0 single cell', () => {
    expect(hilbertIndexToXY(0, 0)).toEqual({ x: 0, y: 0 });
    expect(hilbertXYToIndex(0, 0, 0)).toBe(0);
  });

  it('order 1 4-cell Hilbert U', () => {
    expect(hilbertIndexToXY(1, 0)).toEqual({ x: 0, y: 0 });
    expect(hilbertIndexToXY(1, 1)).toEqual({ x: 0, y: 1 });
    expect(hilbertIndexToXY(1, 2)).toEqual({ x: 1, y: 1 });
    expect(hilbertIndexToXY(1, 3)).toEqual({ x: 1, y: 0 });
  });

  it('round-trip order 2 (16 cells)', () => {
    for (let i = 0; i < 16; i++) {
      const { x, y } = hilbertIndexToXY(2, i);
      expect(hilbertXYToIndex(2, x, y)).toBe(i);
    }
  });

  it('round-trip order 3 (64 cells)', () => {
    for (let i = 0; i < 64; i++) {
      const { x, y } = hilbertIndexToXY(3, i);
      expect(hilbertXYToIndex(3, x, y)).toBe(i);
    }
  });

  it('order 2 covers all cells uniquely', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 16; i++) {
      const { x, y } = hilbertIndexToXY(2, i);
      seen.add(`${x},${y}`);
    }
    expect(seen.size).toBe(16);
  });

  it('adjacent indices map to adjacent cells', () => {
    for (let i = 0; i + 1 < 16; i++) {
      const a = hilbertIndexToXY(2, i);
      const b = hilbertIndexToXY(2, i + 1);
      expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(1);
    }
  });

  it('throws on negative xy', () => {
    expect(() => hilbertXYToIndex(1, -1, 0)).toThrow(RangeError);
  });

  it('throws on xy beyond grid', () => {
    expect(() => hilbertXYToIndex(1, 2, 0)).toThrow(RangeError);
  });

  it('throws on non-integer xy', () => {
    expect(() => hilbertXYToIndex(1, 0.5, 0)).toThrow(RangeError);
  });

  it('order 4 round-trip sample', () => {
    for (const i of [0, 17, 100, 200, 255]) {
      const { x, y } = hilbertIndexToXY(4, i);
      expect(hilbertXYToIndex(4, x, y)).toBe(i);
    }
  });

  it('matches origin', () => {
    expect(hilbertXYToIndex(3, 0, 0)).toBe(0);
  });
});
