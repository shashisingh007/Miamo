import { describe, it, expect } from 'vitest';
import { sweepLineRectangleArea, sweepLineRectangleUnionArea } from '../sweepLineRectangleUnionArea';

describe('sweepLineRectangleUnionArea', () => {
  it('factory exposes function', () => {
    const api = sweepLineRectangleUnionArea();
    expect(typeof api.sweepLineRectangleArea).toBe('function');
  });

  it('empty list => 0', () => {
    expect(sweepLineRectangleArea([])).toBe(0);
  });

  it('single rectangle', () => {
    expect(sweepLineRectangleArea([{ x1: 0, y1: 0, x2: 3, y2: 4 }])).toBe(12);
  });

  it('two disjoint rectangles', () => {
    expect(
      sweepLineRectangleArea([
        { x1: 0, y1: 0, x2: 2, y2: 2 },
        { x1: 5, y1: 5, x2: 7, y2: 7 },
      ]),
    ).toBe(8);
  });

  it('two overlapping rectangles (overlap subtracted)', () => {
    // [0,0,3,3] union [2,2,5,5]: areas 9 + 9 - 1 = 17
    expect(
      sweepLineRectangleArea([
        { x1: 0, y1: 0, x2: 3, y2: 3 },
        { x1: 2, y1: 2, x2: 5, y2: 5 },
      ]),
    ).toBe(17);
  });

  it('rectangle inside rectangle', () => {
    expect(
      sweepLineRectangleArea([
        { x1: 0, y1: 0, x2: 10, y2: 10 },
        { x1: 2, y1: 2, x2: 4, y2: 4 },
      ]),
    ).toBe(100);
  });

  it('degenerate rectangle (zero width) => 0 contribution', () => {
    expect(sweepLineRectangleArea([{ x1: 1, y1: 1, x2: 1, y2: 5 }])).toBe(0);
  });

  it('three overlapping rectangles', () => {
    // tile [0,0]-[6,2] with three overlapping pieces, true area = 12
    const rects = [
      { x1: 0, y1: 0, x2: 3, y2: 2 },
      { x1: 2, y1: 0, x2: 5, y2: 2 },
      { x1: 4, y1: 0, x2: 6, y2: 2 },
    ];
    expect(sweepLineRectangleArea(rects)).toBe(12);
  });

  it('negative coordinates', () => {
    expect(
      sweepLineRectangleArea([{ x1: -2, y1: -3, x2: 1, y2: 1 }]),
    ).toBe(12);
  });

  it('throws on bad inputs', () => {
    expect(() => sweepLineRectangleArea(null as any)).toThrow();
    expect(() => sweepLineRectangleArea([{ x1: 1, y1: 0, x2: 0, y2: 1 } as any])).toThrow();
    expect(() => sweepLineRectangleArea([{ x1: NaN, y1: 0, x2: 1, y2: 1 } as any])).toThrow();
    expect(() => sweepLineRectangleArea([null as any])).toThrow();
  });

  it('matches inclusion-exclusion on small grid', () => {
    const rects = [
      { x1: 0, y1: 0, x2: 4, y2: 4 },
      { x1: 1, y1: 1, x2: 3, y2: 3 },
      { x1: 3, y1: 3, x2: 6, y2: 6 },
    ];
    // Brute-force pixel grid 0..6
    let brute = 0;
    for (let x = 0; x < 6; x += 1) {
      for (let y = 0; y < 6; y += 1) {
        let inside = false;
        for (const r of rects) {
          if (x >= r.x1 && x < r.x2 && y >= r.y1 && y < r.y2) {
            inside = true;
            break;
          }
        }
        if (inside) brute += 1;
      }
    }
    expect(sweepLineRectangleArea(rects)).toBe(brute);
  });
});
