import { describe, it, expect } from 'vitest';
import { catmullRomSpline, catmullRomSample } from '../catmullRomSpline';

const p0 = { x: 0, y: 0 };
const p1 = { x: 1, y: 1 };
const p2 = { x: 2, y: 1 };
const p3 = { x: 3, y: 0 };

describe('catmullRomSpline', () => {
  it('t=0 returns p1', () => {
    const r = catmullRomSpline(p0, p1, p2, p3, 0);
    expect(r.x).toBeCloseTo(1, 9);
    expect(r.y).toBeCloseTo(1, 9);
  });

  it('t=1 returns p2', () => {
    const r = catmullRomSpline(p0, p1, p2, p3, 1);
    expect(r.x).toBeCloseTo(2, 9);
    expect(r.y).toBeCloseTo(1, 9);
  });

  it('mid stays roughly between p1 and p2', () => {
    const r = catmullRomSpline(p0, p1, p2, p3, 0.5);
    expect(r.x).toBeGreaterThan(1);
    expect(r.x).toBeLessThan(2);
  });

  it('throws on t<0', () => {
    expect(() => catmullRomSpline(p0, p1, p2, p3, -0.1)).toThrow();
  });

  it('throws on t>1', () => {
    expect(() => catmullRomSpline(p0, p1, p2, p3, 1.1)).toThrow();
  });

  it('throws on non-finite t', () => {
    expect(() => catmullRomSpline(p0, p1, p2, p3, NaN)).toThrow();
  });

  it('throws on alpha out of range', () => {
    expect(() => catmullRomSpline(p0, p1, p2, p3, 0.5, 2)).toThrow();
  });

  it('uniform alpha=0 also works', () => {
    const r = catmullRomSpline(p0, p1, p2, p3, 0.5, 0);
    expect(Number.isFinite(r.x)).toBe(true);
    expect(Number.isFinite(r.y)).toBe(true);
  });

  it('chordal alpha=1 also works', () => {
    const r = catmullRomSpline(p0, p1, p2, p3, 0.5, 1);
    expect(Number.isFinite(r.x)).toBe(true);
    expect(Number.isFinite(r.y)).toBe(true);
  });

  it('on collinear y=0 line stays on line', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 1, y: 0 };
    const c = { x: 2, y: 0 };
    const d = { x: 3, y: 0 };
    const r = catmullRomSpline(a, b, c, d, 0.4);
    expect(r.y).toBeCloseTo(0, 9);
  });

  it('catmullRomSample n=2 gives endpoints', () => {
    const s = catmullRomSample(p0, p1, p2, p3, 2);
    expect(s).toHaveLength(2);
    expect(s[0].x).toBeCloseTo(1, 9);
    expect(s[1].x).toBeCloseTo(2, 9);
  });

  it('catmullRomSample n=11 length', () => {
    expect(catmullRomSample(p0, p1, p2, p3, 11)).toHaveLength(11);
  });

  it('catmullRomSample throws on n<2', () => {
    expect(() => catmullRomSample(p0, p1, p2, p3, 1)).toThrow();
  });

  it('catmullRomSample throws on non-integer n', () => {
    expect(() => catmullRomSample(p0, p1, p2, p3, 3.5)).toThrow();
  });

  it('symmetry: reversing through symmetric points yields mirror x', () => {
    const r1 = catmullRomSpline(p0, p1, p2, p3, 0.3);
    const r2 = catmullRomSpline(p3, p2, p1, p0, 0.7);
    expect(r1.x).toBeCloseTo(r2.x, 6);
    expect(r1.y).toBeCloseTo(r2.y, 6);
  });
});
