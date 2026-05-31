import { describe, it, expect } from 'vitest';
import { douglasPeuckerSimplify, Point2 } from '../douglasPeuckerSimplify';

describe('douglasPeuckerSimplify', () => {
  it('empty', () => {
    expect(douglasPeuckerSimplify([], 1)).toEqual([]);
  });

  it('single point', () => {
    const p = [{ x: 1, y: 2 }];
    expect(douglasPeuckerSimplify(p, 1)).toEqual(p);
  });

  it('two points preserved', () => {
    const p = [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
    ];
    expect(douglasPeuckerSimplify(p, 0.1)).toEqual(p);
  });

  it('collinear collapses to endpoints', () => {
    const p: Point2[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ];
    const r = douglasPeuckerSimplify(p, 0.001);
    expect(r).toEqual([p[0], p[3]]);
  });

  it('large epsilon collapses to endpoints', () => {
    const p: Point2[] = [
      { x: 0, y: 0 },
      { x: 1, y: 5 },
      { x: 2, y: -3 },
      { x: 3, y: 2 },
      { x: 4, y: 4 },
    ];
    const r = douglasPeuckerSimplify(p, 100);
    expect(r).toHaveLength(2);
  });

  it('zero epsilon preserves all (with non-collinear)', () => {
    const p: Point2[] = [
      { x: 0, y: 0 },
      { x: 1, y: 5 },
      { x: 2, y: -3 },
      { x: 3, y: 2 },
    ];
    const r = douglasPeuckerSimplify(p, 0);
    expect(r).toHaveLength(4);
  });

  it('keeps significant peak', () => {
    const p: Point2[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0.05 },
      { x: 2, y: 5 },
      { x: 3, y: 0.05 },
      { x: 4, y: 0 },
    ];
    const r = douglasPeuckerSimplify(p, 1.5);
    expect(r).toHaveLength(3);
    expect(r[1]).toEqual({ x: 2, y: 5 });
  });

  it('first and last always preserved', () => {
    const p: Point2[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    const r = douglasPeuckerSimplify(p, 1000);
    expect(r[0]).toEqual(p[0]);
    expect(r[r.length - 1]).toEqual(p[p.length - 1]);
  });

  it('negative epsilon throws', () => {
    expect(() => douglasPeuckerSimplify([{ x: 0, y: 0 }, { x: 1, y: 1 }], -1)).toThrow();
  });

  it('idempotent at zero epsilon', () => {
    const p: Point2[] = [
      { x: 0, y: 0 },
      { x: 1, y: 5 },
      { x: 2, y: -3 },
    ];
    const r1 = douglasPeuckerSimplify(p, 0);
    const r2 = douglasPeuckerSimplify(r1, 0);
    expect(r2).toEqual(r1);
  });
});
