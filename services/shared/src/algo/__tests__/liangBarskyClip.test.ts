import { describe, it, expect } from 'vitest';
import { liangBarskyClip } from '../liangBarskyClip';

const R = { xmin: 0, ymin: 0, xmax: 10, ymax: 10 };

describe('liangBarskyClip', () => {
  it('fully inside unchanged', () => {
    const c = liangBarskyClip({ x0: 1, y0: 1, x1: 5, y1: 6 }, R)!;
    expect(c.x0).toBeCloseTo(1, 9);
    expect(c.y0).toBeCloseTo(1, 9);
    expect(c.x1).toBeCloseTo(5, 9);
    expect(c.y1).toBeCloseTo(6, 9);
  });

  it('fully outside left returns null', () => {
    expect(liangBarskyClip({ x0: -5, y0: 1, x1: -1, y1: 2 }, R)).toBeNull();
  });

  it('clips right edge', () => {
    const c = liangBarskyClip({ x0: 5, y0: 5, x1: 15, y1: 5 }, R)!;
    expect(c.x0).toBeCloseTo(5, 9);
    expect(c.x1).toBeCloseTo(10, 9);
  });

  it('clips left edge', () => {
    const c = liangBarskyClip({ x0: -5, y0: 5, x1: 5, y1: 5 }, R)!;
    expect(c.x0).toBeCloseTo(0, 9);
    expect(c.x1).toBeCloseTo(5, 9);
  });

  it('clips top edge', () => {
    const c = liangBarskyClip({ x0: 5, y0: 5, x1: 5, y1: 15 }, R)!;
    expect(c.y0).toBeCloseTo(5, 9);
    expect(c.y1).toBeCloseTo(10, 9);
  });

  it('clips bottom edge', () => {
    const c = liangBarskyClip({ x0: 5, y0: -5, x1: 5, y1: 5 }, R)!;
    expect(c.y0).toBeCloseTo(0, 9);
    expect(c.y1).toBeCloseTo(5, 9);
  });

  it('clips diagonal entering and leaving', () => {
    const c = liangBarskyClip({ x0: -5, y0: -5, x1: 15, y1: 15 }, R)!;
    expect(c.x0).toBeCloseTo(0, 9);
    expect(c.y0).toBeCloseTo(0, 9);
    expect(c.x1).toBeCloseTo(10, 9);
    expect(c.y1).toBeCloseTo(10, 9);
  });

  it('rejects diagonal that misses', () => {
    expect(liangBarskyClip({ x0: -5, y0: 5, x1: 5, y1: 20 }, R)).toBeNull();
  });

  it('horizontal degenerate inside', () => {
    const c = liangBarskyClip({ x0: 3, y0: 5, x1: 7, y1: 5 }, R)!;
    expect(c.y0).toBeCloseTo(5, 9);
  });

  it('point inside returns same point', () => {
    const c = liangBarskyClip({ x0: 5, y0: 5, x1: 5, y1: 5 }, R)!;
    expect(c.x0).toBeCloseTo(5, 9);
    expect(c.x1).toBeCloseTo(5, 9);
  });

  it('point outside returns null', () => {
    expect(liangBarskyClip({ x0: 20, y0: 20, x1: 20, y1: 20 }, R)).toBeNull();
  });

  it('rejects invalid rectangle', () => {
    expect(() => liangBarskyClip({ x0: 0, y0: 0, x1: 1, y1: 1 }, { xmin: 5, ymin: 0, xmax: 0, ymax: 5 })).toThrow();
  });
});
