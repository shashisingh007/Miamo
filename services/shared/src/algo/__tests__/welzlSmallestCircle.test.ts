import { describe, it, expect } from 'vitest';
import { welzlSmallestEnclosingCircle, Point2 } from '../welzlSmallestCircle';

const EPS = 1e-6;

function contains(c: { cx: number; cy: number; r: number }, p: Point2) {
  const dx = p.x - c.cx;
  const dy = p.y - c.cy;
  return Math.sqrt(dx * dx + dy * dy) <= c.r + EPS;
}

describe('welzlSmallestEnclosingCircle', () => {
  it('empty', () => {
    const c = welzlSmallestEnclosingCircle([]);
    expect(c.r).toBe(0);
  });

  it('single point', () => {
    const c = welzlSmallestEnclosingCircle([{ x: 3, y: 4 }]);
    expect(c.cx).toBe(3);
    expect(c.cy).toBe(4);
    expect(c.r).toBe(0);
  });

  it('two points', () => {
    const c = welzlSmallestEnclosingCircle([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
    ]);
    expect(c.cx).toBeCloseTo(2);
    expect(c.cy).toBeCloseTo(0);
    expect(c.r).toBeCloseTo(2);
  });

  it('three points right triangle', () => {
    const pts: Point2[] = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 3 },
    ];
    const c = welzlSmallestEnclosingCircle(pts);
    for (const p of pts) expect(contains(c, p)).toBe(true);
    expect(c.r).toBeCloseTo(2.5, 5);
  });

  it('square -> r = sqrt(2)', () => {
    const pts: Point2[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ];
    const c = welzlSmallestEnclosingCircle(pts);
    expect(c.cx).toBeCloseTo(1, 5);
    expect(c.cy).toBeCloseTo(1, 5);
    expect(c.r).toBeCloseTo(Math.SQRT2, 5);
  });

  it('contains all points (random)', () => {
    let s = 1;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
    const pts: Point2[] = [];
    for (let i = 0; i < 30; i++) pts.push({ x: rand() * 100, y: rand() * 100 });
    const c = welzlSmallestEnclosingCircle(pts);
    for (const p of pts) expect(contains(c, p)).toBe(true);
  });

  it('collinear points', () => {
    const pts: Point2[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 4, y: 0 },
    ];
    const c = welzlSmallestEnclosingCircle(pts);
    expect(c.cx).toBeCloseTo(2);
    expect(c.r).toBeCloseTo(2);
  });

  it('duplicate points', () => {
    const pts: Point2[] = [
      { x: 1, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 1 },
    ];
    const c = welzlSmallestEnclosingCircle(pts);
    expect(c.r).toBeCloseTo(0);
  });

  it('interior point ignored', () => {
    const pts: Point2[] = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 3 },
      { x: 1, y: 1 },
    ];
    const c = welzlSmallestEnclosingCircle(pts);
    expect(c.r).toBeCloseTo(2.5, 5);
  });

  it('returns smallest radius (lower bound)', () => {
    const pts: Point2[] = [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    const c = welzlSmallestEnclosingCircle(pts);
    expect(c.r).toBeCloseTo(1);
  });

  it('many points all inside known circle', () => {
    const pts: Point2[] = [];
    for (let i = 0; i < 50; i++) {
      const a = (i / 50) * Math.PI * 2;
      pts.push({ x: 5 * Math.cos(a), y: 5 * Math.sin(a) });
    }
    const c = welzlSmallestEnclosingCircle(pts);
    expect(c.cx).toBeCloseTo(0, 4);
    expect(c.cy).toBeCloseTo(0, 4);
    expect(c.r).toBeCloseTo(5, 4);
  });
});
