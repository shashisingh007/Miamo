import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dtmAffinityV6, dtmAffinityDispatchV6 } from '../dtmV6';
import { dtmAffinity } from '../dtm';

function vec(arr: number[]): Float32Array {
  // l2-normalise the input the way the worker does.
  const v = new Float32Array(16);
  for (let i = 0; i < Math.min(arr.length, 16); i++) v[i] = arr[i];
  let s = 0; for (const x of v) s += x * x;
  if (s > 0) {
    const inv = 1 / Math.sqrt(s);
    for (let i = 0; i < v.length; i++) v[i] *= inv;
  }
  return v;
}

describe('dtmAffinityV6', () => {
  it('returns null when either vector is null', () => {
    expect(dtmAffinityV6(null, vec([0.5]))).toBeNull();
    expect(dtmAffinityV6(vec([0.5]), null)).toBeNull();
  });

  it('returns null when lengths differ', () => {
    const a = new Float32Array(16);
    const b = new Float32Array(15);
    a[0] = 1; b[0] = 1;
    expect(dtmAffinityV6(a, b)).toBeNull();
  });

  it('returns null when either side is empty (cold-start empty)', () => {
    expect(dtmAffinityV6(new Float32Array(16), vec([0.5, 0.5, 0.5, 0.5]))).toBeNull();
  });

  it('scores higher for identical vectors than orthogonal ones', () => {
    const a = vec([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    const b = vec([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    const c = vec([0,   0,   0,   0,   0,   0,   0,   0,   0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    const same = dtmAffinityV6(a, b)!;
    const opp  = dtmAffinityV6(a, c)!;
    expect(same.score).toBeGreaterThan(opp.score);
  });

  it('score stays in [0, 1]', () => {
    const a = vec([1, 1, 1, 1, 1, 1, 1, 1]);
    const b = vec([-1, -1, -1, -1, -1, -1, -1, -1]);
    const r = dtmAffinityV6(a, b)!;
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it('blends toward neutral prior when one side is sparse', () => {
    const dense = vec([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    const sparse = vec([0.5, 0, 0, 0, 0, 0, 0, 0]); // 1 topic — 'sparse'
    const r = dtmAffinityV6(dense, sparse)!;
    // Sparse stage gives affinityWeight=0.25 on sparse side → coverage min = 0.25
    expect(r.coverageWeight).toBeCloseTo(0.25, 6);
    // Blended score is dragged toward 0.5 neutral
    expect(Math.abs(r.score - 0.5)).toBeLessThan(0.30);
  });

  it('coverage weight is 1.0 when both fully covered', () => {
    const full = vec([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]);
    const r = dtmAffinityV6(full, full)!;
    expect(r.coverageWeight).toBe(1.0);
  });

  it('shared-mass bonus is positive for overlapping high topics', () => {
    const a = vec([0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7]);
    const b = vec([0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7]);
    const r = dtmAffinityV6(a, b)!;
    expect(r.sharedMassBonus).toBeGreaterThan(0);
  });

  it('rejects malformed weights gracefully (falls back to uniform)', () => {
    const a = vec([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    const r = dtmAffinityV6(a, a, { weights: [NaN, -1, 0, 0] })!;
    expect(r.score).toBeGreaterThan(0);
  });

  it('honours per-topic weights', () => {
    const a = vec([0.5, 0.5, 0.5, 0.5]);
    const b = vec([0.5, 0.0, 0.5, 0.5]);
    // Heavy weight on topic 1 → should drop the score below the uniform case
    const uniform = dtmAffinityV6(a, b)!;
    const weighted = dtmAffinityV6(a, b, { weights: [0.1, 0.7, 0.1, 0.1] })!;
    expect(weighted.score).toBeLessThan(uniform.score);
  });
});

describe('dtmAffinityDispatchV6', () => {
  const KEY = 'ALGO_V6_DTM_ENABLED';
  let original: string | undefined;
  beforeEach(() => { original = process.env[KEY]; });
  afterEach(() => {
    if (original === undefined) delete process.env[KEY];
    else process.env[KEY] = original;
  });

  it('returns v4 dtmAffinity when v6 flag is off', () => {
    delete process.env[KEY];
    const a = vec([0.5, 0.5, 0.5, 0.5]);
    const b = vec([0.5, 0.5, 0.5, 0.5]);
    expect(dtmAffinityDispatchV6(a, b)).toBeCloseTo(dtmAffinity(a, b)!, 6);
  });

  it('returns v6 score when flag is on', () => {
    process.env[KEY] = '1';
    // Use a fully-covered pair so coverage weight is 1.0 and the only
    // difference between v6 and v4 is the shared-mass bonus.
    const a = vec([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]);
    const b = vec([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]);
    const v4 = dtmAffinity(a, b)!;
    const v6 = dtmAffinityDispatchV6(a, b)!;
    expect(v6).toBeGreaterThanOrEqual(v4 - 1e-9);
    expect(v6).toBeLessThanOrEqual(1);
  });

  it('passes through null inputs', () => {
    expect(dtmAffinityDispatchV6(null, null)).toBeNull();
  });
});
