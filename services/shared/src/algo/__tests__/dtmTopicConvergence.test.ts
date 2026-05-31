import { describe, it, expect } from 'vitest';
import { computeDtmTopicConvergence } from '../dtmTopicConvergence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const N = DTM_TOPIC_KEYS.length;

function vec(map: Partial<Record<number, number>>): Float32Array {
  const v = new Float32Array(N);
  for (const [k, val] of Object.entries(map)) v[+k] = val!;
  return v;
}

describe('dtmTopicConvergence', () => {
  it('<2 snapshots -> convergence 1', () => {
    expect(computeDtmTopicConvergence([])).toEqual({ convergence: 1, pairsCompared: 0, drift: 0 });
    expect(computeDtmTopicConvergence([vec({ 0: 1 })]).convergence).toBe(1);
  });

  it('identical snapshots -> convergence 1, drift 0', () => {
    const v = vec({ 0: 1 });
    const r = computeDtmTopicConvergence([v, v, v]);
    expect(r.convergence).toBeCloseTo(1, 6);
    expect(r.drift).toBeCloseTo(0, 6);
    expect(r.pairsCompared).toBe(2);
  });

  it('orthogonal pair -> convergence 0.5 (cos=0)', () => {
    const a = vec({ 0: 1 });
    const b = vec({ 1: 1 });
    const r = computeDtmTopicConvergence([a, b]);
    expect(r.convergence).toBeCloseTo(0.5, 6);
  });

  it('opposite pair -> convergence 0 drift 1', () => {
    const a = vec({ 0: 1 });
    const b = vec({ 0: -1 });
    const r = computeDtmTopicConvergence([a, b]);
    expect(r.convergence).toBeCloseTo(0, 6);
    expect(r.drift).toBeCloseTo(1, 6);
  });

  it('respects windowSize \u2014 ignores old snapshots', () => {
    const stable = vec({ 0: 1 });
    const opposite = vec({ 0: -1 });
    // 5 stable snapshots then 1 opposite; window=3 = last 3 = stable,stable,opposite
    const seq = [stable, stable, stable, stable, stable, opposite];
    const r = computeDtmTopicConvergence(seq, 3);
    expect(r.pairsCompared).toBe(2);
    expect(r.convergence).toBeLessThan(1);
  });

  it('skips zero-norm snapshots', () => {
    const zero = new Float32Array(N);
    const v = vec({ 0: 1 });
    const r = computeDtmTopicConvergence([zero, v]);
    expect(r.pairsCompared).toBe(0);
    expect(r.convergence).toBe(1);
  });

  it('drops wrong-length entries', () => {
    const short = new Float32Array(5);
    const v = vec({ 0: 1 });
    const r = computeDtmTopicConvergence([short, v, v]);
    expect(r.pairsCompared).toBe(1);
  });

  it('windowSize floor is 2', () => {
    const a = vec({ 0: 1 });
    const b = vec({ 0: -1 });
    const r = computeDtmTopicConvergence([a, b], 1);
    expect(r.pairsCompared).toBe(1);
  });

  it('handles NaN components safely', () => {
    const a = vec({ 0: 1 });
    const b = vec({ 0: 1 });
    (b as any)[1] = NaN;
    const r = computeDtmTopicConvergence([a, b]);
    expect(r.convergence).toBeCloseTo(1, 6);
  });

  it('mixed-direction sequence yields intermediate convergence', () => {
    const a = vec({ 0: 1 });
    const b = vec({ 0: 0.7, 1: 0.7 });
    const c = vec({ 1: 1 });
    const r = computeDtmTopicConvergence([a, b, c]);
    expect(r.convergence).toBeGreaterThan(0.5);
    expect(r.convergence).toBeLessThan(1);
  });
});
