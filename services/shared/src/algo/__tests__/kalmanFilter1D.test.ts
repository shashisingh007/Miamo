import { describe, it, expect } from 'vitest';
import { kalmanFilter1D, kalmanFilter1DInit, kalmanFilter1DUpdate } from '../kalmanFilter1D';

describe('kalmanFilter1D', () => {
  it('empty input => empty output', () => {
    expect(kalmanFilter1D([])).toEqual([]);
  });

  it('tracks constant signal', () => {
    const out = kalmanFilter1D([10, 10, 10, 10, 10, 10, 10, 10, 10, 10], { initialEstimate: 0 });
    expect(out[out.length - 1]).toBeCloseTo(10, 1);
  });

  it('reduces noise on noisy constant', () => {
    const truth = 5;
    const noisy = [4.9, 5.1, 4.95, 5.05, 5.02, 4.98, 5.0, 4.93, 5.07, 5.0];
    const out = kalmanFilter1D(noisy, { initialEstimate: 5 });
    const filteredVar = out.reduce((s, v) => s + (v - truth) ** 2, 0) / out.length;
    const noisyVar = noisy.reduce((s, v) => s + (v - truth) ** 2, 0) / noisy.length;
    expect(filteredVar).toBeLessThan(noisyVar);
  });

  it('first estimate moves toward first measurement', () => {
    const state0 = kalmanFilter1DInit({ initialEstimate: 0 });
    const s1 = kalmanFilter1DUpdate(state0, 100);
    expect(s1.x).toBeGreaterThan(0);
    expect(s1.x).toBeLessThanOrEqual(100);
  });

  it('error covariance shrinks over time', () => {
    let state = kalmanFilter1DInit();
    const ps = [state.p];
    for (let i = 0; i < 20; i += 1) {
      state = kalmanFilter1DUpdate(state, 1);
      ps.push(state.p);
    }
    expect(ps[ps.length - 1]).toBeLessThan(ps[0]);
  });

  it('throws on non-finite measurement', () => {
    expect(() => kalmanFilter1DUpdate(kalmanFilter1DInit(), NaN)).toThrow();
  });

  it('output length matches input', () => {
    const out = kalmanFilter1D([1, 2, 3, 4, 5]);
    expect(out.length).toBe(5);
  });

  it('higher measurement noise dampens response', () => {
    const slow = kalmanFilter1D([0, 0, 0, 100], { initialEstimate: 0, measurementNoise: 100 });
    const fast = kalmanFilter1D([0, 0, 0, 100], { initialEstimate: 0, measurementNoise: 0.01 });
    expect(fast[fast.length - 1]).toBeGreaterThan(slow[slow.length - 1]);
  });

  it('init respects custom options', () => {
    const s = kalmanFilter1DInit({ initialEstimate: 42, initialErrorCovariance: 7, processNoise: 0.5, measurementNoise: 0.5 });
    expect(s.x).toBe(42);
    expect(s.p).toBe(7);
    expect(s.q).toBe(0.5);
    expect(s.r).toBe(0.5);
  });

  it('accepts generator', () => {
    function* g() { yield 1; yield 1; yield 1; }
    expect(kalmanFilter1D(g(), { initialEstimate: 1 }).length).toBe(3);
  });
});
