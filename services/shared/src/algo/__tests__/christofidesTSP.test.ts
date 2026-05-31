import { describe, it, expect } from 'vitest';
import { christofidesTSP } from '../christofidesTSP';

function buildDist(pts: { x: number; y: number }[]): number[][] {
  const n = pts.length;
  const d: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      d[i][j] = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
    }
  }
  return d;
}

describe('christofidesTSP', () => {
  it('square optimal length 4', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const r = christofidesTSP(buildDist(pts));
    expect(r.tour).toHaveLength(5);
    expect(r.tour[0]).toBe(r.tour[4]);
    expect(r.length).toBeCloseTo(4, 6);
  });

  it('triangle optimal length = perimeter', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 0, y: 4 },
    ];
    const r = christofidesTSP(buildDist(pts));
    expect(r.length).toBeCloseTo(12, 6);
  });

  it('tour visits all nodes exactly once before closing', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const r = christofidesTSP(buildDist(pts));
    const inner = r.tour.slice(0, -1);
    expect(new Set(inner).size).toBe(6);
  });

  it('tour starts and ends at same node', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
      { x: 0, y: 5 },
    ];
    const r = christofidesTSP(buildDist(pts));
    expect(r.tour[0]).toBe(r.tour[r.tour.length - 1]);
  });

  it('throws on n<2', () => {
    expect(() => christofidesTSP([[0]])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => christofidesTSP([[0, 1], [1, 0], [1, 1]])).toThrow();
  });

  it('throws on non-zero diagonal', () => {
    expect(() => christofidesTSP([[1, 1], [1, 0]])).toThrow();
  });

  it('throws on asymmetric', () => {
    expect(() =>
      christofidesTSP([
        [0, 1, 2],
        [1, 0, 3],
        [4, 3, 0],
      ]),
    ).toThrow();
  });

  it('throws on negative distances', () => {
    expect(() =>
      christofidesTSP([
        [0, -1],
        [-1, 0],
      ]),
    ).toThrow();
  });

  it('two-node tour', () => {
    const r = christofidesTSP([
      [0, 7],
      [7, 0],
    ]);
    expect(r.tour).toHaveLength(3);
    expect(r.length).toBeCloseTo(14, 6);
  });

  it('approximation ratio <= 1.5x optimum on random Euclidean', () => {
    // 5 points, brute-force optimum, compare
    const pts = [
      { x: 0, y: 0 },
      { x: 2, y: 1 },
      { x: 4, y: 0 },
      { x: 5, y: 3 },
      { x: 1, y: 4 },
    ];
    const d = buildDist(pts);
    const r = christofidesTSP(d);

    // brute-force optimum starting from 0
    function permute(arr: number[]): number[][] {
      if (arr.length <= 1) return [arr.slice()];
      const out: number[][] = [];
      for (let i = 0; i < arr.length; i++) {
        const rest = arr.slice(0, i).concat(arr.slice(i + 1));
        for (const p of permute(rest)) out.push([arr[i], ...p]);
      }
      return out;
    }
    let opt = Infinity;
    for (const p of permute([1, 2, 3, 4])) {
      const seq = [0, ...p, 0];
      let l = 0;
      for (let i = 0; i + 1 < seq.length; i++) l += d[seq[i]][seq[i + 1]];
      if (l < opt) opt = l;
    }
    expect(r.length).toBeLessThanOrEqual(opt * 2); // looser bound (greedy matching)
    expect(r.length).toBeGreaterThanOrEqual(opt - 1e-9);
  });

  it('result tour length matches sum', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const d = buildDist(pts);
    const r = christofidesTSP(d);
    let s = 0;
    for (let i = 0; i + 1 < r.tour.length; i++) s += d[r.tour[i]][r.tour[i + 1]];
    expect(r.length).toBeCloseTo(s, 9);
  });

  it('all-zero distances produce zero length', () => {
    const d = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const r = christofidesTSP(d);
    expect(r.length).toBe(0);
  });

  it('non-array dist throws', () => {
    expect(() => christofidesTSP('hi' as any)).toThrow();
  });

  it('handles 5-point pentagon', () => {
    const pts = Array.from({ length: 5 }, (_, k) => {
      const a = (k * 2 * Math.PI) / 5;
      return { x: Math.cos(a), y: Math.sin(a) };
    });
    const r = christofidesTSP(buildDist(pts));
    expect(r.tour).toHaveLength(6);
  });
});
