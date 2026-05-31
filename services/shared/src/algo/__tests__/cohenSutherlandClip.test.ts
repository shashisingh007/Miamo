import { describe, it, expect } from 'vitest';
import { cohenSutherlandClip } from '../cohenSutherlandClip';

const R = { xmin: 0, ymin: 0, xmax: 10, ymax: 10 };

describe('cohenSutherlandClip', () => {
  it('fully inside unchanged', () => {
    expect(cohenSutherlandClip({ x0: 1, y0: 1, x1: 5, y1: 6 }, R)).toEqual({ x0: 1, y0: 1, x1: 5, y1: 6 });
  });

  it('fully outside left returns null', () => {
    expect(cohenSutherlandClip({ x0: -5, y0: 1, x1: -1, y1: 2 }, R)).toBeNull();
  });

  it('fully outside top returns null', () => {
    expect(cohenSutherlandClip({ x0: 1, y0: 11, x1: 5, y1: 12 }, R)).toBeNull();
  });

  it('clips against right edge', () => {
    const c = cohenSutherlandClip({ x0: 5, y0: 5, x1: 15, y1: 5 }, R)!;
    expect(c.x0).toBe(5);
    expect(c.x1).toBe(10);
    expect(c.y1).toBe(5);
  });

  it('clips against left edge', () => {
    const c = cohenSutherlandClip({ x0: -5, y0: 5, x1: 5, y1: 5 }, R)!;
    expect(c.x0).toBe(0);
    expect(c.x1).toBe(5);
  });

  it('clips against top edge', () => {
    const c = cohenSutherlandClip({ x0: 5, y0: 5, x1: 5, y1: 15 }, R)!;
    expect(c.y0).toBe(5);
    expect(c.y1).toBe(10);
  });

  it('clips against bottom edge', () => {
    const c = cohenSutherlandClip({ x0: 5, y0: -5, x1: 5, y1: 5 }, R)!;
    expect(c.y0).toBe(0);
    expect(c.y1).toBe(5);
  });

  it('clips diagonal entering and leaving', () => {
    const c = cohenSutherlandClip({ x0: -5, y0: -5, x1: 15, y1: 15 }, R)!;
    expect(c.x0).toBe(0);
    expect(c.y0).toBe(0);
    expect(c.x1).toBe(10);
    expect(c.y1).toBe(10);
  });

  it('rejects diagonal that misses corner', () => {
    expect(cohenSutherlandClip({ x0: -5, y0: 5, x1: 5, y1: 20 }, R)).toBeNull();
  });

  it('endpoint on boundary preserved', () => {
    const c = cohenSutherlandClip({ x0: 0, y0: 5, x1: 10, y1: 5 }, R)!;
    expect(c.x0).toBe(0);
    expect(c.x1).toBe(10);
  });

  it('rejects invalid rectangle', () => {
    expect(() => cohenSutherlandClip({ x0: 0, y0: 0, x1: 1, y1: 1 }, { xmin: 5, ymin: 0, xmax: 0, ymax: 5 })).toThrow();
  });

  it('horizontal line outside above returns null', () => {
    expect(cohenSutherlandClip({ x0: -5, y0: 20, x1: 20, y1: 20 }, R)).toBeNull();
  });
});
