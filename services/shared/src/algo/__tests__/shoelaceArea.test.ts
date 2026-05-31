import { describe, it, expect } from 'vitest';
import { shoelaceArea, signedShoelaceArea, shoelaceOrientation } from '../shoelaceArea';

describe('shoelaceArea', () => {
  it('rejects non-array', () => {
    expect(() => shoelaceArea(null as any)).toThrow();
  });

  it('rejects < 3 vertices', () => {
    expect(() => shoelaceArea([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toThrow();
  });

  it('rejects non-finite', () => {
    expect(() =>
      shoelaceArea([
        { x: 0, y: 0 },
        { x: NaN, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toThrow();
  });

  it('rejects non-numeric vertex', () => {
    expect(() =>
      shoelaceArea([
        { x: 0, y: 0 },
        { x: 'a' as unknown as number, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toThrow();
  });

  it('unit square => 1', () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(shoelaceArea(poly)).toBeCloseTo(1, 9);
  });

  it('triangle (0,0)(4,0)(0,3) => 6', () => {
    expect(
      shoelaceArea([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 3 },
      ]),
    ).toBeCloseTo(6, 9);
  });

  it('signed area positive for ccw', () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(signedShoelaceArea(poly)).toBeGreaterThan(0);
  });

  it('signed area negative for cw', () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ];
    expect(signedShoelaceArea(poly)).toBeLessThan(0);
  });

  it('orientation ccw / cw / degenerate', () => {
    expect(
      shoelaceOrientation([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toBe('ccw');
    expect(
      shoelaceOrientation([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 0 },
      ]),
    ).toBe('cw');
    expect(
      shoelaceOrientation([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ]),
    ).toBe('degenerate');
  });

  it('hexagon area', () => {
    const r = 1;
    const poly: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      poly.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
    }
    // regular hexagon with circumradius 1: area = 3*sqrt(3)/2
    expect(shoelaceArea(poly)).toBeCloseTo((3 * Math.sqrt(3)) / 2, 9);
  });

  it('non-convex L-shape', () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ];
    expect(shoelaceArea(poly)).toBeCloseTo(3, 9);
  });

  it('reversed orientation gives same magnitude', () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 3 },
    ];
    const a1 = shoelaceArea(poly);
    const a2 = shoelaceArea([...poly].reverse());
    expect(a1).toBeCloseTo(a2, 9);
  });

  it('translation invariant', () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const t = poly.map((p) => ({ x: p.x + 100, y: p.y - 50 }));
    expect(shoelaceArea(poly)).toBeCloseTo(shoelaceArea(t), 9);
  });
});
