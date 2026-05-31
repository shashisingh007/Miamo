import { describe, it, expect } from 'vitest';
import { geneticAlgorithm } from '../geneticAlgorithm';

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('geneticAlgorithm', () => {
  it('throws on empty population', () => {
    expect(() => geneticAlgorithm({
      initialPopulation: [] as number[], fitness: () => 0,
      crossover: (a) => a, mutate: (a) => a, mutationRate: 0, eliteCount: 0, generations: 1,
    })).toThrow(RangeError);
  });

  it('throws on bad eliteCount', () => {
    expect(() => geneticAlgorithm({
      initialPopulation: [1], fitness: () => 0,
      crossover: (a) => a, mutate: (a) => a, mutationRate: 0, eliteCount: -1, generations: 1,
    })).toThrow(RangeError);
  });

  it('throws on bad mutationRate', () => {
    expect(() => geneticAlgorithm({
      initialPopulation: [1], fitness: () => 0,
      crossover: (a) => a, mutate: (a) => a, mutationRate: 2, eliteCount: 0, generations: 1,
    })).toThrow(RangeError);
  });

  it('zero generations returns initial best', () => {
    const r = geneticAlgorithm<number>({
      initialPopulation: [3, 5, 1], fitness: (x) => x,
      crossover: (a) => a, mutate: (a) => a,
      mutationRate: 0, eliteCount: 1, generations: 0,
    });
    expect(r.best).toBe(5);
    expect(r.bestFitness).toBe(5);
  });

  it('optimizes onemax-ish single-int genome', () => {
    const rng = mulberry32(42);
    const r = geneticAlgorithm<number>({
      initialPopulation: [0, 1, 2, 3, 4],
      fitness: (x) => -Math.abs(x - 10),
      crossover: (a, b) => Math.floor((a + b) / 2),
      mutate: (a, r) => a + (r() < 0.5 ? -1 : 1),
      mutationRate: 0.8,
      eliteCount: 1,
      generations: 50,
      rng,
    });
    expect(r.bestFitness).toBeGreaterThan(-3);
  });

  it('elite preserves best across generations', () => {
    const rng = mulberry32(7);
    const r = geneticAlgorithm<number>({
      initialPopulation: [100, 1, 2, 3, 4],
      fitness: (x) => x,
      crossover: (a, b, r) => (r() < 0.5 ? a : b),
      mutate: (a, r) => a - Math.floor(r() * 5),
      mutationRate: 0.5,
      eliteCount: 1,
      generations: 20,
      rng,
    });
    expect(r.bestFitness).toBeGreaterThanOrEqual(100);
  });

  it('bestFitness monotonic non-decreasing', () => {
    const rng = mulberry32(11);
    const r = geneticAlgorithm<number>({
      initialPopulation: Array.from({ length: 10 }, (_, i) => i),
      fitness: (x) => x,
      crossover: (a, b) => Math.max(a, b),
      mutate: (a, r) => a + Math.floor(r() * 3),
      mutationRate: 1,
      eliteCount: 2,
      generations: 30,
      rng,
    });
    expect(r.bestFitness).toBeGreaterThanOrEqual(9);
  });

  it('reports generation count', () => {
    const r = geneticAlgorithm<number>({
      initialPopulation: [1], fitness: (x) => x,
      crossover: (a) => a, mutate: (a) => a, mutationRate: 0, eliteCount: 1, generations: 7,
    });
    expect(r.generation).toBe(7);
  });

  it('seeded RNG => deterministic result', () => {
    const opts = (rng: () => number) => ({
      initialPopulation: [0, 5, 10, 15, 20],
      fitness: (x: number) => -Math.abs(x - 7),
      crossover: (a: number, b: number) => Math.floor((a + b) / 2),
      mutate: (a: number, r: () => number) => a + (r() < 0.5 ? -1 : 1),
      mutationRate: 0.5,
      eliteCount: 1,
      generations: 30,
      rng,
    });
    const a = geneticAlgorithm(opts(mulberry32(99)));
    const b = geneticAlgorithm(opts(mulberry32(99)));
    expect(a.best).toBe(b.best);
    expect(a.bestFitness).toBe(b.bestFitness);
  });

  it('eliteCount=population => freeze evolution', () => {
    const r = geneticAlgorithm<number>({
      initialPopulation: [3, 5, 1],
      fitness: (x) => x,
      crossover: (a) => a, mutate: (a) => a,
      mutationRate: 0, eliteCount: 3, generations: 5,
    });
    expect(r.best).toBe(5);
  });

  it('handles all-zero fitness (random pick)', () => {
    const rng = mulberry32(3);
    const r = geneticAlgorithm<number>({
      initialPopulation: [0, 0, 0, 0],
      fitness: () => 0,
      crossover: (a) => a, mutate: (a) => a,
      mutationRate: 0, eliteCount: 0, generations: 3, rng,
    });
    expect(r.bestFitness).toBe(0);
  });

  it('array genome works', () => {
    const rng = mulberry32(13);
    const r = geneticAlgorithm<number[]>({
      initialPopulation: [[0, 0, 0], [1, 1, 1], [1, 0, 1], [0, 1, 0]],
      fitness: (g) => g.reduce((s, x) => s + x, 0),
      crossover: (a, b, r) => a.map((x, i) => (r() < 0.5 ? x : b[i])),
      mutate: (g, r) => g.map((x) => (r() < 0.3 ? 1 - x : x)),
      mutationRate: 0.5,
      eliteCount: 1,
      generations: 30,
      rng,
    });
    expect(r.bestFitness).toBeGreaterThanOrEqual(2);
  });
});
