import { describe, it, expect } from 'vitest';
import { simulatedAnnealing } from '../simulatedAnnealing';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('simulatedAnnealing', () => {
  it('throws on bad initialTemperature', () => {
    expect(() => simulatedAnnealing({
      initialState: 0, neighbor: (s) => s, energy: () => 0,
      initialTemperature: 0, coolingRate: 0.9, maxIterations: 10,
    })).toThrow(RangeError);
  });

  it('throws on bad coolingRate', () => {
    expect(() => simulatedAnnealing({
      initialState: 0, neighbor: (s) => s, energy: () => 0,
      initialTemperature: 1, coolingRate: 1.5, maxIterations: 10,
    })).toThrow(RangeError);
  });

  it('throws on bad maxIterations', () => {
    expect(() => simulatedAnnealing({
      initialState: 0, neighbor: (s) => s, energy: () => 0,
      initialTemperature: 1, coolingRate: 0.9, maxIterations: -1,
    })).toThrow(RangeError);
  });

  it('returns initial state when 0 iterations', () => {
    const r = simulatedAnnealing({
      initialState: 42, neighbor: (s) => s + 1, energy: (s) => s,
      initialTemperature: 1, coolingRate: 0.9, maxIterations: 0,
    });
    expect(r.bestState).toBe(42);
    expect(r.bestEnergy).toBe(42);
    expect(r.iterations).toBe(0);
  });

  it('minimizes f(x) = x^2 starting at 100', () => {
    const rng = seededRng(7);
    const r = simulatedAnnealing<number>({
      initialState: 100,
      neighbor: (s, rand) => s + (rand() < 0.5 ? -1 : 1),
      energy: (s) => s * s,
      initialTemperature: 100,
      coolingRate: 0.995,
      maxIterations: 5000,
      rng,
    });
    expect(r.bestEnergy).toBeLessThan(100);
  });

  it('respects maxIterations', () => {
    const r = simulatedAnnealing({
      initialState: 0, neighbor: (s) => s, energy: () => 0,
      initialTemperature: 1, coolingRate: 0.99, maxIterations: 10,
    });
    expect(r.iterations).toBeLessThanOrEqual(10);
  });

  it('stops at minTemperature', () => {
    const r = simulatedAnnealing({
      initialState: 0, neighbor: (s) => s, energy: () => 0,
      initialTemperature: 1, coolingRate: 0.1, maxIterations: 1_000_000,
      minTemperature: 1e-3,
    });
    expect(r.iterations).toBeLessThan(20);
  });

  it('finds global min of negative-bowl', () => {
    const rng = seededRng(11);
    const r = simulatedAnnealing<number>({
      initialState: 0,
      neighbor: (s, rand) => s + (rand() - 0.5) * 4,
      energy: (s) => Math.pow(s - 5, 2),
      initialTemperature: 50,
      coolingRate: 0.99,
      maxIterations: 2000,
      rng,
    });
    expect(Math.abs(r.bestState - 5)).toBeLessThan(2);
  });

  it('best energy never worse than initial', () => {
    const rng = seededRng(3);
    const r = simulatedAnnealing<number>({
      initialState: 10,
      neighbor: (s, rand) => s + (rand() - 0.5) * 2,
      energy: (s) => s * s,
      initialTemperature: 10,
      coolingRate: 0.95,
      maxIterations: 500,
      rng,
    });
    expect(r.bestEnergy).toBeLessThanOrEqual(100);
  });

  it('deterministic with same seed', () => {
    const make = () => simulatedAnnealing<number>({
      initialState: 0,
      neighbor: (s, rand) => s + (rand() - 0.5),
      energy: (s) => s * s,
      initialTemperature: 5,
      coolingRate: 0.9,
      maxIterations: 100,
      rng: seededRng(99),
    });
    const a = make();
    const b = make();
    expect(a.bestEnergy).toBe(b.bestEnergy);
    expect(a.bestState).toBe(b.bestState);
  });

  it('handles string state space', () => {
    const target = 'hello';
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const rng = seededRng(2024);
    const r = simulatedAnnealing<string>({
      initialState: 'aaaaa',
      neighbor: (s, rand) => {
        const i = Math.floor(rand() * s.length);
        const c = chars[Math.floor(rand() * chars.length)];
        return s.slice(0, i) + c + s.slice(i + 1);
      },
      energy: (s) => {
        let d = 0;
        for (let i = 0; i < s.length; i++) if (s[i] !== target[i]) d += 1;
        return d;
      },
      initialTemperature: 10,
      coolingRate: 0.99,
      maxIterations: 5000,
      rng,
    });
    expect(r.bestEnergy).toBeLessThanOrEqual(2);
  });
});
