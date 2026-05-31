import { describe, it, expect } from 'vitest';
import { sutherlandHodgmanClip } from '../sutherlandHodgmanClip';

// CCW unit square.
const SQ = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

function area(poly: { x: number; y: number }[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

describe('sutherlandHodgmanClip', () => {
  it('subject inside clip unchanged', () => {
    const subj = [
      { x: 2, y: 2 },
      { x: 6, y: 2 },
      { x: 6, y: 6 },
      { x: 2, y: 6 },
    ];
    expect(sutherlandHodgmanClip(subj, SQ)).toEqual(subj);
  });

  it('subject fully outside returns empty', () => {
    const subj = [
      { x: 20, y: 20 },
      { x: 30, y: 20 },
      { x: 25, y: 30 },
    ];
    expect(sutherlandHodgmanClip(subj, SQ)).toEqual([]);
  });

  it('partial overlap clipped to clip polygon', () => {
    const subj = [
      { x: 5, y: 5 },
      { x: 15, y: 5 },
      { x: 15, y: 15 },
      { x: 5, y: 15 },
    ];
    const r = sutherlandHodgmanClip(subj, SQ);
    expect(area(r)).toBeCloseTo(25, 6);
  });

  it('subject equals clip', () => {
    const r = sutherlandHodgmanClip(SQ, SQ);
    expect(area(r)).toBeCloseTo(100, 6);
  });

  it('triangle clipped against square', () => {
    const subj = [
      { x: -5, y: 5 },
      { x: 15, y: 5 },
      { x: 5, y: 20 },
    ];
    const r = sutherlandHodgmanClip(subj, SQ);
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) {
      expect(p.x).toBeGreaterThanOrEqual(-1e-9);
      expect(p.x).toBeLessThanOrEqual(10 + 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(-1e-9);
      expect(p.y).toBeLessThanOrEqual(10 + 1e-9);
    }
  });

  it('rejects clip with <3 vertices', () => {
    expect(() => sutherlandHodgmanClip(SQ, [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toThrow();
  });

  it('clip larger than subject preserves subject', () => {
    const subj = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
    ];
    expect(area(sutherlandHodgmanClip(subj, SQ))).toBeCloseTo(1, 6);
  });

  it('subject crossing single edge', () => {
    const subj = [
      { x: -5, y: 4 },
      { x: 5, y: 4 },
      { x: 5, y: 6 },
      { x: -5, y: 6 },
    ];
    const r = sutherlandHodgmanClip(subj, SQ);
    expect(area(r)).toBeCloseTo(10, 6);
  });

  it('non-overlapping disjoint returns empty', () => {
    const subj = [
      { x: -10, y: -10 },
      { x: -5, y: -10 },
      { x: -7, y: -5 },
    ];
    expect(sutherlandHodgmanClip(subj, SQ)).toEqual([]);
  });

  it('clipping is idempotent', () => {
    const subj = [
      { x: -5, y: -5 },
      { x: 15, y: -5 },
      { x: 15, y: 15 },
      { x: -5, y: 15 },
    ];
    const once = sutherlandHodgmanClip(subj, SQ);
    const twice = sutherlandHodgmanClip(once, SQ);
    expect(area(once)).toBeCloseTo(area(twice), 6);
  });
});
