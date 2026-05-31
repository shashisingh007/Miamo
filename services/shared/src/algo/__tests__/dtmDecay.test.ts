import { describe, it, expect } from 'vitest';
import { applyDtmDecay } from '../dtmDecay';

const DAY = 86_400_000;
function unit(arr: number[]): Float32Array {
  const v = new Float32Array(16);
  for (let i = 0; i < 16; i++) v[i] = arr[i] ?? 0;
  let s = 0; for (let i = 0; i < 16; i++) s += v[i] * v[i];
  const n = Math.sqrt(s) || 1;
  for (let i = 0; i < 16; i++) v[i] = v[i] / n;
  return v;
}

describe('dtmDecay', () => {
  it('no time elapsed -> factor 1, vector unchanged', () => {
    const v = unit([1, 0.5, -0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const r = applyDtmDecay({ vec: v, lastUpdatedMs: 1000, nowMs: 1000 });
    expect(r.decayFactor).toBe(1);
    expect(r.daysElapsed).toBe(0);
    for (let i = 0; i < 16; i++) expect(r.vec[i]).toBeCloseTo(v[i], 6);
  });

  it('one half-life elapsed -> factor 0.5', () => {
    const v = unit([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const r = applyDtmDecay({ vec: v, lastUpdatedMs: 0, nowMs: 30 * DAY });
    expect(r.decayFactor).toBeCloseTo(0.5, 6);
    expect(r.daysElapsed).toBeCloseTo(30, 6);
  });

  it('custom half-life respected', () => {
    const v = unit([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const r = applyDtmDecay({ vec: v, lastUpdatedMs: 0, nowMs: 7 * DAY, halfLifeDays: 7 });
    expect(r.decayFactor).toBeCloseTo(0.5, 6);
  });

  it('output is unit-normalised when signal remains', () => {
    const v = unit([0.8, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const r = applyDtmDecay({ vec: v, lastUpdatedMs: 0, nowMs: 60 * DAY });
    let s = 0; for (let i = 0; i < 16; i++) s += r.vec[i] * r.vec[i];
    expect(Math.sqrt(s)).toBeCloseTo(1, 5);
  });

  it('zero vector stays zero', () => {
    const v = new Float32Array(16);
    const r = applyDtmDecay({ vec: v, lastUpdatedMs: 0, nowMs: 999 * DAY });
    for (let i = 0; i < 16; i++) expect(r.vec[i]).toBe(0);
  });

  it('direction is preserved by decay (proportionality)', () => {
    const v = unit([0.6, 0.4, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const r = applyDtmDecay({ vec: v, lastUpdatedMs: 0, nowMs: 45 * DAY });
    // After re-normalisation, the ratio between components is preserved.
    expect(r.vec[0] / r.vec[1]).toBeCloseTo(v[0] / v[1], 5);
    expect(r.vec[1] / r.vec[2]).toBeCloseTo(v[1] / v[2], 5);
  });

  it('clamps negative elapsed (clock skew)', () => {
    const v = unit([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const r = applyDtmDecay({ vec: v, lastUpdatedMs: 1000, nowMs: 0 });
    expect(r.decayFactor).toBe(1);
    expect(r.daysElapsed).toBe(0);
  });

  it('decay strictly decreases factor as time grows', () => {
    const v = unit([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const a = applyDtmDecay({ vec: v, lastUpdatedMs: 0, nowMs: 10 * DAY });
    const b = applyDtmDecay({ vec: v, lastUpdatedMs: 0, nowMs: 20 * DAY });
    const c = applyDtmDecay({ vec: v, lastUpdatedMs: 0, nowMs: 90 * DAY });
    expect(a.decayFactor).toBeGreaterThan(b.decayFactor);
    expect(b.decayFactor).toBeGreaterThan(c.decayFactor);
  });
});
