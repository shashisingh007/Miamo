import { describe, it, expect } from 'vitest';
import { baumWelchHmm, BaumWelchHmm } from '../baumWelchHmm';

const initialHmm: BaumWelchHmm = {
  states: ['S1', 'S2'],
  startProb: { S1: 0.5, S2: 0.5 },
  transitionProb: {
    S1: { S1: 0.5, S2: 0.5 },
    S2: { S1: 0.5, S2: 0.5 },
  },
  emissionProb: {
    S1: { A: 0.5, B: 0.5 },
    S2: { A: 0.5, B: 0.5 },
  },
};

function sumValues(o: Record<string, number>): number {
  return Object.values(o).reduce((s, v) => s + v, 0);
}

describe('baumWelchHmm', () => {
  it('startProb sums to ~1 after fit', () => {
    const r = baumWelchHmm(['A', 'B', 'A', 'B', 'A'], initialHmm, 5);
    expect(sumValues(r.startProb)).toBeCloseTo(1, 6);
  });

  it('transition rows sum to ~1', () => {
    const r = baumWelchHmm(['A', 'B', 'A', 'B', 'A'], initialHmm, 5);
    for (const row of Object.values(r.transitionProb)) {
      expect(sumValues(row)).toBeCloseTo(1, 6);
    }
  });

  it('emission rows sum to ~1', () => {
    const r = baumWelchHmm(['A', 'B', 'A', 'B', 'A'], initialHmm, 5);
    for (const row of Object.values(r.emissionProb)) {
      expect(sumValues(row)).toBeCloseTo(1, 6);
    }
  });

  it('iterations=0 returns input unchanged structurally', () => {
    const r = baumWelchHmm(['A'], initialHmm, 0);
    expect(r.iterations).toBe(0);
    expect(sumValues(r.startProb)).toBeCloseTo(1, 6);
  });

  it('empty observations returns iterations=0', () => {
    const r = baumWelchHmm([], initialHmm, 5);
    expect(r.iterations).toBe(0);
  });

  it('throws on empty states', () => {
    expect(() => baumWelchHmm(['A'], { ...initialHmm, states: [] }, 1)).toThrow();
  });

  it('throws on negative iterations', () => {
    expect(() => baumWelchHmm(['A'], initialHmm, -1)).toThrow();
  });

  it('throws on non-integer iterations', () => {
    expect(() => baumWelchHmm(['A'], initialHmm, 1.5)).toThrow();
  });

  it('handles non-uniform startProb', () => {
    const hmm: BaumWelchHmm = {
      ...initialHmm,
      startProb: { S1: 0.9, S2: 0.1 },
    };
    const r = baumWelchHmm(['A', 'B'], hmm, 3);
    expect(sumValues(r.startProb)).toBeCloseTo(1, 6);
  });

  it('keeps probabilities in [0,1]', () => {
    const r = baumWelchHmm(['A', 'B', 'A', 'B'], initialHmm, 5);
    for (const row of Object.values(r.transitionProb)) {
      for (const v of Object.values(row)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
