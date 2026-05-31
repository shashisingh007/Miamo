import { describe, it, expect } from 'vitest';
import {
  bezierCubic,
  bezierCubicDerivative,
  bezierCubicSubdivide,
  bezierCubicSample,
} from '../bezierCubic';

const cp = [
  { x: 0, y: 0 },
  { x: 1, y: 2 },
  { x: 2, y: 2 },
  { x: 3, y: 0 },
];

describe('bezierCubic', () => {
  it('rejects wrong cp count', () => {
    expect(() => bezierCubic([{ x: 0, y: 0 }] as any, 0.5)).toThrow();
  });

  it('rejects bad cp', () => {
    expect(() => bezierCubic([{ x: 0, y: 0 }, null as any, { x: 1, y: 1 }, { x: 2, y: 2 }], 0.5)).toThrow();
  });

  it('rejects non-finite cp', () => {
    expect(() =>
      bezierCubic(
        [{ x: 0, y: 0 }, { x: NaN, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 2 }],
        0.5,
      ),
    ).toThrow();
  });

  it('rejects t out of [0,1]', () => {
    expect(() => bezierCubic(cp, -0.1)).toThrow();
    expect(() => bezierCubic(cp, 1.1)).toThrow();
    expect(() => bezierCubic(cp, NaN)).toThrow();
  });

  it('t=0 returns first cp', () => {
    expect(bezierCubic(cp, 0)).toEqual(cp[0]);
  });

  it('t=1 returns last cp', () => {
    expect(bezierCubic(cp, 1)).toEqual(cp[3]);
  });

  it('symmetric curve at t=0.5 has x=1.5', () => {
    const p = bezierCubic(cp, 0.5);
    expect(p.x).toBeCloseTo(1.5, 10);
    expect(p.y).toBeCloseTo(1.5, 10);
  });

  it('linear control points => linear evaluation', () => {
    const lin = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ];
    expect(bezierCubic(lin, 0.25)).toEqual({ x: 0.75, y: 0.75 });
  });

  it('derivative at t=0 is 3*(P1-P0)', () => {
    const d = bezierCubicDerivative(cp, 0);
    expect(d.x).toBeCloseTo(3 * (cp[1].x - cp[0].x), 10);
    expect(d.y).toBeCloseTo(3 * (cp[1].y - cp[0].y), 10);
  });

  it('derivative at t=1 is 3*(P3-P2)', () => {
    const d = bezierCubicDerivative(cp, 1);
    expect(d.x).toBeCloseTo(3 * (cp[3].x - cp[2].x), 10);
    expect(d.y).toBeCloseTo(3 * (cp[3].y - cp[2].y), 10);
  });

  it('subdivision endpoints meet', () => {
    const { left, right } = bezierCubicSubdivide(cp, 0.5);
    expect(left[3]).toEqual(right[0]);
    expect(left[0]).toEqual(cp[0]);
    expect(right[3]).toEqual(cp[3]);
  });

  it('subdivision evaluates correctly', () => {
    const { left, right } = bezierCubicSubdivide(cp, 0.5);
    // left at t=1 = original at t=0.5 = right at t=0
    const orig = bezierCubic(cp, 0.5);
    expect(bezierCubic(left, 1).x).toBeCloseTo(orig.x, 10);
    expect(bezierCubic(right, 0).y).toBeCloseTo(orig.y, 10);
  });

  it('sample steps + 1 points', () => {
    const pts = bezierCubicSample(cp, 10);
    expect(pts.length).toBe(11);
    expect(pts[0]).toEqual(cp[0]);
    expect(pts[10]).toEqual(cp[3]);
  });

  it('sample rejects bad steps', () => {
    expect(() => bezierCubicSample(cp, 0)).toThrow();
    expect(() => bezierCubicSample(cp, 1.5)).toThrow();
  });

  it('subdivide rejects t out of range', () => {
    expect(() => bezierCubicSubdivide(cp, 2)).toThrow();
  });

  it('derivative rejects t out of range', () => {
    expect(() => bezierCubicDerivative(cp, -1)).toThrow();
  });
});
