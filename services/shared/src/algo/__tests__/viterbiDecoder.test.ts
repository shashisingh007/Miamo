import { describe, it, expect } from 'vitest';
import { viterbiDecoder, ViterbiHmm } from '../viterbiDecoder';

const HMM: ViterbiHmm = {
  states: ['Healthy', 'Fever'],
  startProb: { Healthy: 0.6, Fever: 0.4 },
  transitionProb: {
    Healthy: { Healthy: 0.7, Fever: 0.3 },
    Fever: { Healthy: 0.4, Fever: 0.6 },
  },
  emissionProb: {
    Healthy: { normal: 0.5, cold: 0.4, dizzy: 0.1 },
    Fever: { normal: 0.1, cold: 0.3, dizzy: 0.6 },
  },
};

describe('viterbiDecoder', () => {
  it('classic Wikipedia example', () => {
    const r = viterbiDecoder(['normal', 'cold', 'dizzy'], HMM);
    expect(r.path).toEqual(['Healthy', 'Healthy', 'Fever']);
  });

  it('logProb is finite', () => {
    const r = viterbiDecoder(['normal', 'cold', 'dizzy'], HMM);
    expect(Number.isFinite(r.logProb)).toBe(true);
  });

  it('empty observations => empty path', () => {
    const r = viterbiDecoder([], HMM);
    expect(r.path).toEqual([]);
    expect(r.logProb).toBe(0);
  });

  it('single observation chooses most probable', () => {
    const r = viterbiDecoder(['dizzy'], HMM);
    expect(r.path).toEqual(['Fever']);
  });

  it('all-normal favours Healthy', () => {
    const r = viterbiDecoder(['normal', 'normal', 'normal', 'normal'], HMM);
    expect(r.path.every((s) => s === 'Healthy')).toBe(true);
  });

  it('all-dizzy favours Fever', () => {
    const r = viterbiDecoder(['dizzy', 'dizzy', 'dizzy', 'dizzy'], HMM);
    expect(r.path.every((s) => s === 'Fever')).toBe(true);
  });

  it('throws on empty states', () => {
    expect(() => viterbiDecoder(['a'], { ...HMM, states: [] })).toThrow();
  });

  it('throws on negative probability', () => {
    const bad: ViterbiHmm = {
      ...HMM,
      startProb: { Healthy: -0.1, Fever: 1.1 },
    };
    expect(() => viterbiDecoder(['normal'], bad)).toThrow();
  });

  it('zero emission prob handled (no NaN)', () => {
    const r = viterbiDecoder(['dizzy', 'normal'], HMM);
    expect(Number.isFinite(r.logProb)).toBe(true);
  });

  it('path length equals observation length', () => {
    const r = viterbiDecoder(['normal', 'cold', 'dizzy', 'normal', 'cold'], HMM);
    expect(r.path.length).toBe(5);
  });

  it('returned states are all in HMM.states', () => {
    const r = viterbiDecoder(['cold', 'dizzy', 'normal'], HMM);
    const set = new Set(HMM.states);
    for (const s of r.path) expect(set.has(s)).toBe(true);
  });
});
