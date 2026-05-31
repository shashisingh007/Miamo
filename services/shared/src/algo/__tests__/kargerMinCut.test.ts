import { describe, it, expect } from 'vitest';
import { kargerMinCut } from '../kargerMinCut';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('kargerMinCut', () => {
  it('throws on vertices < 2', () => {
    expect(() => kargerMinCut(1, [])).toThrow(RangeError);
    expect(() => kargerMinCut(1.5, [])).toThrow(RangeError);
  });

  it('throws on self-loop edge', () => {
    expect(() => kargerMinCut(3, [{ u: 0, v: 0 }])).toThrow(RangeError);
  });

  it('throws on out-of-range edge', () => {
    expect(() => kargerMinCut(3, [{ u: 0, v: 5 }])).toThrow(RangeError);
  });

  it('throws on invalid trials', () => {
    expect(() => kargerMinCut(3, [{ u: 0, v: 1 }, { u: 1, v: 2 }], { trials: 0 })).toThrow(
      RangeError,
    );
  });

  it('bridge graph cut = 1', () => {
    // 0-1-2-3 chain; min cut = 1
    const r = kargerMinCut(
      4,
      [
        { u: 0, v: 1 },
        { u: 1, v: 2 },
        { u: 2, v: 3 },
      ],
      { rng: mulberry32(1) },
    );
    expect(r.cut).toBe(1);
  });

  it('triangle cut = 2', () => {
    const r = kargerMinCut(
      3,
      [
        { u: 0, v: 1 },
        { u: 1, v: 2 },
        { u: 0, v: 2 },
      ],
      { rng: mulberry32(2) },
    );
    expect(r.cut).toBe(2);
  });

  it('K4 cut = 3', () => {
    const edges = [];
    for (let i = 0; i < 4; i += 1) for (let j = i + 1; j < 4; j += 1) edges.push({ u: i, v: j });
    const r = kargerMinCut(4, edges, { rng: mulberry32(3), trials: 200 });
    expect(r.cut).toBe(3);
  });

  it('barbell graph cut = 1 (two triangles joined by single edge)', () => {
    const r = kargerMinCut(
      6,
      [
        { u: 0, v: 1 },
        { u: 1, v: 2 },
        { u: 0, v: 2 },
        { u: 3, v: 4 },
        { u: 4, v: 5 },
        { u: 3, v: 5 },
        { u: 2, v: 3 },
      ],
      { rng: mulberry32(4), trials: 200 },
    );
    expect(r.cut).toBe(1);
  });

  it('partition has 2 non-empty groups summing to V', () => {
    const r = kargerMinCut(
      5,
      [
        { u: 0, v: 1 },
        { u: 1, v: 2 },
        { u: 2, v: 3 },
        { u: 3, v: 4 },
      ],
      { rng: mulberry32(5) },
    );
    const [a, b] = r.partition;
    expect(a.length + b.length).toBe(5);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
  });

  it('partition disjoint', () => {
    const r = kargerMinCut(
      4,
      [
        { u: 0, v: 1 },
        { u: 1, v: 2 },
        { u: 2, v: 3 },
      ],
      { rng: mulberry32(6) },
    );
    const [a, b] = r.partition;
    const sa = new Set(a);
    for (const x of b) expect(sa.has(x)).toBe(false);
  });

  it('two parallel edges cut = 2', () => {
    const r = kargerMinCut(
      2,
      [
        { u: 0, v: 1 },
        { u: 0, v: 1 },
      ],
      { rng: mulberry32(7), trials: 50 },
    );
    expect(r.cut).toBe(2);
  });

  it('deterministic with fixed rng', () => {
    const a = kargerMinCut(
      4,
      [
        { u: 0, v: 1 },
        { u: 1, v: 2 },
        { u: 2, v: 3 },
        { u: 3, v: 0 },
      ],
      { rng: mulberry32(42), trials: 20 },
    );
    const b = kargerMinCut(
      4,
      [
        { u: 0, v: 1 },
        { u: 1, v: 2 },
        { u: 2, v: 3 },
        { u: 3, v: 0 },
      ],
      { rng: mulberry32(42), trials: 20 },
    );
    expect(a.cut).toBe(b.cut);
  });

  it('default rng works', () => {
    const r = kargerMinCut(
      3,
      [
        { u: 0, v: 1 },
        { u: 1, v: 2 },
      ],
    );
    expect(r.cut).toBe(1);
  });

  it('cycle graph C_n has min cut 2', () => {
    const n = 6;
    const edges = [];
    for (let i = 0; i < n; i += 1) edges.push({ u: i, v: (i + 1) % n });
    const r = kargerMinCut(n, edges, { rng: mulberry32(100), trials: n * n * 4 });
    expect(r.cut).toBe(2);
  });

  it('disconnected graph already 2 components', () => {
    // 0-1 component and 2 alone — Karger will need to merge until 2 supernodes.
    // After only the 0-1 edge contraction, we have supernodes {0,1} and {2}, cut = 0.
    const r = kargerMinCut(3, [{ u: 0, v: 1 }], { rng: mulberry32(11), trials: 10 });
    expect(r.cut).toBe(0);
  });

  it('cut <= edges.length', () => {
    const edges = [
      { u: 0, v: 1 },
      { u: 1, v: 2 },
      { u: 2, v: 0 },
    ];
    const r = kargerMinCut(3, edges, { rng: mulberry32(9) });
    expect(r.cut).toBeLessThanOrEqual(edges.length);
  });

  it('cut >= 0', () => {
    const r = kargerMinCut(
      4,
      [
        { u: 0, v: 1 },
        { u: 1, v: 2 },
        { u: 2, v: 3 },
      ],
      { rng: mulberry32(10) },
    );
    expect(r.cut).toBeGreaterThanOrEqual(0);
  });
});
