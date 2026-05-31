import { describe, it, expect } from 'vitest';
import { visvalingamSimplify } from '../visvalingamSimplify';

describe('visvalingamSimplify', () => {
  it('two points unchanged', () => {
    const p = [{ x: 0, y: 0 }, { x: 5, y: 5 }];
    expect(visvalingamSimplify(p, 1)).toEqual(p);
  });

  it('single point unchanged', () => {
    expect(visvalingamSimplify([{ x: 1, y: 1 }], 1)).toEqual([{ x: 1, y: 1 }]);
  });

  it('removes collinear point', () => {
    const r = visvalingamSimplify(
      [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }],
      0.001
    );
    expect(r).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
  });

  it('keeps endpoints', () => {
    const r = visvalingamSimplify(
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
      0.5
    );
    expect(r[0]).toEqual({ x: 0, y: 0 });
    expect(r[r.length - 1]).toEqual({ x: 3, y: 0 });
  });

  it('preserves vertex with large area', () => {
    const r = visvalingamSimplify(
      [{ x: 0, y: 0 }, { x: 5, y: 100 }, { x: 10, y: 0 }],
      1
    );
    expect(r).toHaveLength(3);
  });

  it('large tolerance flattens to endpoints', () => {
    const r = visvalingamSimplify(
      [{ x: 0, y: 0 }, { x: 5, y: 1 }, { x: 10, y: 0 }],
      1000
    );
    expect(r).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
  });

  it('rejects negative tolerance', () => {
    expect(() => visvalingamSimplify([{ x: 0, y: 0 }, { x: 1, y: 1 }], -1)).toThrow();
  });

  it('result length never exceeds input length', () => {
    const p = [
      { x: 0, y: 0 },
      { x: 1, y: 5 },
      { x: 2, y: 0 },
      { x: 3, y: 5 },
      { x: 4, y: 0 },
      { x: 5, y: 5 },
    ];
    const r = visvalingamSimplify(p, 0.5);
    expect(r.length).toBeLessThanOrEqual(p.length);
    expect(r.length).toBeGreaterThanOrEqual(2);
  });

  it('zero tolerance only removes degenerate (zero-area) vertices', () => {
    const p = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }];
    const r = visvalingamSimplify(p, 0);
    expect(r).toEqual([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }]);
  });

  it('output is monotonic in tolerance', () => {
    const p = [
      { x: 0, y: 0 },
      { x: 1, y: 0.5 },
      { x: 2, y: 0 },
      { x: 3, y: 1 },
      { x: 4, y: 0 },
    ];
    const small = visvalingamSimplify(p, 0.1).length;
    const big = visvalingamSimplify(p, 5).length;
    expect(big).toBeLessThanOrEqual(small);
  });

  it('endpoints always retained even with huge tolerance', () => {
    const p = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
    ];
    const r = visvalingamSimplify(p, 1e9);
    expect(r[0]).toEqual({ x: 0, y: 0 });
    expect(r[r.length - 1]).toEqual({ x: 4, y: 4 });
    expect(r.length).toBe(2);
  });
});
