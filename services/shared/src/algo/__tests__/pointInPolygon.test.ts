import { describe, it, expect } from 'vitest';
import { pointInPolygon } from '../pointInPolygon';

const square = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 4 },
  { x: 0, y: 4 },
];

describe('pointInPolygon', () => {
  it('rejects bad point', () => {
    expect(() => pointInPolygon(null as any, square)).toThrow();
  });

  it('rejects non-finite point', () => {
    expect(() => pointInPolygon({ x: NaN, y: 0 }, square)).toThrow();
  });

  it('rejects polygon < 3', () => {
    expect(() => pointInPolygon({ x: 1, y: 1 }, [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toThrow();
  });

  it('rejects bad polygon vertex', () => {
    expect(() =>
      pointInPolygon({ x: 1, y: 1 }, [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: NaN, y: 2 },
      ]),
    ).toThrow();
  });

  it('inside square center', () => {
    expect(pointInPolygon({ x: 2, y: 2 }, square)).toBe('inside');
  });

  it('outside square', () => {
    expect(pointInPolygon({ x: -1, y: 2 }, square)).toBe('outside');
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe('outside');
  });

  it('boundary on edge', () => {
    expect(pointInPolygon({ x: 2, y: 0 }, square)).toBe('boundary');
    expect(pointInPolygon({ x: 4, y: 2 }, square)).toBe('boundary');
  });

  it('boundary at vertex', () => {
    expect(pointInPolygon({ x: 0, y: 0 }, square)).toBe('boundary');
    expect(pointInPolygon({ x: 4, y: 4 }, square)).toBe('boundary');
  });

  it('triangle inside', () => {
    const tri = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 3 },
    ];
    expect(pointInPolygon({ x: 1, y: 1 }, tri)).toBe('inside');
    expect(pointInPolygon({ x: 3, y: 3 }, tri)).toBe('outside');
  });

  it('non-convex L-shape', () => {
    const L = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ];
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, L)).toBe('inside');
    expect(pointInPolygon({ x: 1.5, y: 1.5 }, L)).toBe('outside');
    expect(pointInPolygon({ x: 0.5, y: 1.5 }, L)).toBe('inside');
  });

  it('ccw and cw polygons agree', () => {
    const ccw = square;
    const cw = [...square].reverse();
    expect(pointInPolygon({ x: 2, y: 2 }, ccw)).toBe('inside');
    expect(pointInPolygon({ x: 2, y: 2 }, cw)).toBe('inside');
  });

  it('point exactly on horizontal edge', () => {
    expect(pointInPolygon({ x: 2, y: 4 }, square)).toBe('boundary');
  });

  it('point near edge with custom eps', () => {
    expect(pointInPolygon({ x: 2, y: 0.0001 }, square, { eps: 1e-2 })).toBe('boundary');
  });

  it('hexagon', () => {
    const hex: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      hex.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    expect(pointInPolygon({ x: 0, y: 0 }, hex)).toBe('inside');
    expect(pointInPolygon({ x: 2, y: 0 }, hex)).toBe('outside');
  });
});
