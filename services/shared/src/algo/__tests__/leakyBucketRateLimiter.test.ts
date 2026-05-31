import { describe, it, expect } from 'vitest';
import {
  initLeakyBucket,
  leakyBucketAdmit,
  leakyBucketHeadroom,
} from '../leakyBucketRateLimiter';

const CFG = { capacity: 10, leakRatePerMs: 1 }; // 1 unit/ms

describe('leakyBucketRateLimiter', () => {
  it('admits first request', () => {
    const s = initLeakyBucket();
    const d = leakyBucketAdmit(s, CFG, 0);
    expect(d.allowed).toBe(true);
    expect(d.state.level).toBe(1);
  });

  it('admits up to capacity', () => {
    let s = initLeakyBucket();
    for (let i = 0; i < 10; i++) {
      const d = leakyBucketAdmit(s, CFG, 0);
      expect(d.allowed).toBe(true);
      s = d.state;
    }
    expect(s.level).toBe(10);
  });

  it('rejects when over capacity', () => {
    let s = initLeakyBucket(10, 0);
    const d = leakyBucketAdmit(s, CFG, 0);
    expect(d.allowed).toBe(false);
    expect(d.retryAfterMs).toBeGreaterThan(0);
  });

  it('leaks over time and re-admits', () => {
    let s = initLeakyBucket(10, 0);
    const d = leakyBucketAdmit(s, CFG, 5);
    // 5ms × 1/ms = 5 leaked, drained=5, +1 => 6 ≤ 10
    expect(d.allowed).toBe(true);
    expect(d.state.level).toBe(6);
  });

  it('does not drain below 0', () => {
    const s = initLeakyBucket(2, 0);
    const d = leakyBucketAdmit(s, CFG, 1000);
    expect(d.allowed).toBe(true);
    expect(d.state.level).toBe(1);
  });

  it('cost > 1 consumes more', () => {
    const s = initLeakyBucket();
    const d = leakyBucketAdmit(s, CFG, 0, 5);
    expect(d.allowed).toBe(true);
    expect(d.state.level).toBe(5);
  });

  it('rejects when cost would exceed capacity', () => {
    const s = initLeakyBucket(8, 0);
    const d = leakyBucketAdmit(s, CFG, 0, 5);
    expect(d.allowed).toBe(false);
  });

  it('retryAfterMs is correct', () => {
    const s = initLeakyBucket(10, 0);
    const d = leakyBucketAdmit(s, CFG, 0, 1);
    // overflow=1, leak=1/ms => 1ms
    expect(d.retryAfterMs).toBe(1);
  });

  it('retryAfterMs scales with slow leak', () => {
    const s = initLeakyBucket(10, 0);
    const d = leakyBucketAdmit(s, { capacity: 10, leakRatePerMs: 0.1 }, 0, 2);
    // overflow=2, leak=0.1/ms => 20ms
    expect(d.retryAfterMs).toBe(20);
  });

  it('handles non-monotonic nowMs (elapsed clamped to 0)', () => {
    const s = initLeakyBucket(5, 100);
    const d = leakyBucketAdmit(s, CFG, 50);
    // no leak; +1 => 6
    expect(d.state.level).toBe(6);
  });

  it('throws on bad capacity', () => {
    expect(() => leakyBucketAdmit(initLeakyBucket(), { capacity: 0, leakRatePerMs: 1 }, 0)).toThrow();
    expect(() => leakyBucketAdmit(initLeakyBucket(), { capacity: -1, leakRatePerMs: 1 }, 0)).toThrow();
  });

  it('throws on bad leakRate', () => {
    expect(() => leakyBucketAdmit(initLeakyBucket(), { capacity: 1, leakRatePerMs: 0 }, 0)).toThrow();
  });

  it('throws on bad cost', () => {
    expect(() => leakyBucketAdmit(initLeakyBucket(), CFG, 0, 0)).toThrow();
    expect(() => leakyBucketAdmit(initLeakyBucket(), CFG, 0, -1)).toThrow();
  });

  it('throws on non-finite nowMs', () => {
    expect(() => leakyBucketAdmit(initLeakyBucket(), CFG, NaN)).toThrow();
  });

  it('initLeakyBucket validates inputs', () => {
    expect(() => initLeakyBucket(-1)).toThrow();
    expect(() => initLeakyBucket(0, NaN)).toThrow();
  });

  it('leakyBucketHeadroom reflects available capacity', () => {
    const s = initLeakyBucket(4, 0);
    expect(leakyBucketHeadroom(s, CFG, 0)).toBe(6);
    expect(leakyBucketHeadroom(s, CFG, 2)).toBe(8);
    expect(leakyBucketHeadroom(s, CFG, 1000)).toBe(10);
  });

  it('headroom never negative', () => {
    const s = initLeakyBucket(20, 0);
    expect(leakyBucketHeadroom(s, CFG, 0)).toBe(0);
  });

  it('sustained traffic at leak rate is allowed', () => {
    let s = initLeakyBucket();
    for (let t = 0; t < 100; t++) {
      const d = leakyBucketAdmit(s, CFG, t);
      expect(d.allowed).toBe(true);
      s = d.state;
    }
  });
});
