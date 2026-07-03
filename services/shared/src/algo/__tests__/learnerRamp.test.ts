import { describe, it, expect } from 'vitest';
import { learnerRamp, applyLearnerRamp } from '../flags';

describe('learnerRamp', () => {
  it('returns 0 when env var is unset', () => {
    delete process.env.ALGO_V6_LEARNER_RAMP_DISCOVER;
    expect(learnerRamp('discover')).toBe(0);
  });

  it('parses a numeric ramp value', () => {
    process.env.ALGO_V6_LEARNER_RAMP_DISCOVER = '0.25';
    expect(learnerRamp('discover')).toBe(0.25);
    delete process.env.ALGO_V6_LEARNER_RAMP_DISCOVER;
  });

  it('clamps to [0,1]', () => {
    process.env.ALGO_V6_LEARNER_RAMP_DTM = '2.5';
    expect(learnerRamp('dtm')).toBe(1);
    process.env.ALGO_V6_LEARNER_RAMP_DTM = '-0.5';
    expect(learnerRamp('dtm')).toBe(0);
    delete process.env.ALGO_V6_LEARNER_RAMP_DTM;
  });

  it('returns 0 for non-numeric values', () => {
    process.env.ALGO_V6_LEARNER_RAMP_DISCOVER = 'not-a-number';
    expect(learnerRamp('discover')).toBe(0);
    delete process.env.ALGO_V6_LEARNER_RAMP_DISCOVER;
  });
});

describe('applyLearnerRamp', () => {
  const def = { a: 0.5, b: 0.3, c: 0.2 };
  const learned = { a: 0.1, b: 0.4, c: 0.5 };

  it('returns a copy of defaults when ramp = 0', () => {
    expect(applyLearnerRamp(def, learned, 0)).toEqual(def);
  });

  it('returns normalised learned when ramp = 1', () => {
    const out = applyLearnerRamp(def, learned, 1);
    const sum = Object.values(out).reduce((s, n) => s + n, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(out.a).toBeCloseTo(0.1, 5);
  });

  it('blends linearly at ramp = 0.5', () => {
    const out = applyLearnerRamp(def, learned, 0.5);
    const sum = Object.values(out).reduce((s, n) => s + n, 0);
    expect(sum).toBeCloseTo(1, 5);
    // blended a = 0.5 * 0.5 + 0.5 * 0.1 = 0.30 (pre-norm)
    // total pre-norm = 0.30 + 0.35 + 0.35 = 1.0 -> a = 0.30
    expect(out.a).toBeCloseTo(0.30, 5);
  });

  it('falls back to defaults when learned is null', () => {
    expect(applyLearnerRamp(def, null, 0.5)).toEqual(def);
  });

  it('uses defaultW for keys missing in learnedW', () => {
    const out = applyLearnerRamp(def, { a: 0.1 }, 1);
    const sum = Object.values(out).reduce((s, n) => s + n, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('clamps negative blended values to 0', () => {
    const out = applyLearnerRamp({ a: 0.1, b: 0.9 }, { a: -1, b: 1 }, 1);
    expect(out.a).toBe(0);
    expect(out.b).toBe(1);
  });

  it('falls back to defaults when blended sum is 0', () => {
    const out = applyLearnerRamp({ a: 0.5, b: 0.5 }, { a: 0, b: 0 }, 1);
    expect(out).toEqual({ a: 0.5, b: 0.5 });
  });
});
