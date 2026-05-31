import { describe, it, expect } from 'vitest';
import { createRatioRollingWindow } from '../ratioRollingWindow';

describe('ratioRollingWindow', () => {
  it('throws on bad windowMs', () => {
    expect(() => createRatioRollingWindow({ windowMs: 0 })).toThrow();
    expect(() => createRatioRollingWindow({ windowMs: -1 })).toThrow();
    expect(() => createRatioRollingWindow({ windowMs: NaN })).toThrow();
  });

  it('empty => ratio 0', () => {
    let t = 0;
    const w = createRatioRollingWindow({ windowMs: 1000, now: () => t });
    expect(w.ratio()).toBe(0);
    expect(w.snapshot()).toEqual({ numerator: 0, denominator: 0, ratio: 0, entries: 0 });
  });

  it('records numerator and denominator separately', () => {
    let t = 0;
    const w = createRatioRollingWindow({ windowMs: 1000, now: () => t });
    w.recordDenominator();
    w.recordDenominator();
    w.recordNumerator();
    expect(w.ratio()).toBe(0.5);
  });

  it('respects custom weights', () => {
    let t = 0;
    const w = createRatioRollingWindow({ windowMs: 1000, now: () => t });
    w.recordDenominator(10);
    w.recordNumerator(3);
    expect(w.ratio()).toBeCloseTo(0.3);
  });

  it('throws on negative or non-finite weight', () => {
    let t = 0;
    const w = createRatioRollingWindow({ windowMs: 1000, now: () => t });
    expect(() => w.recordNumerator(-1)).toThrow();
    expect(() => w.recordDenominator(Infinity)).toThrow();
  });

  it('prunes expired entries', () => {
    let t = 0;
    const w = createRatioRollingWindow({ windowMs: 100, now: () => t });
    w.recordDenominator();
    w.recordNumerator();
    expect(w.ratio()).toBe(1);
    t = 200;
    expect(w.ratio()).toBe(0);
    expect(w.snapshot().entries).toBe(0);
  });

  it('keeps in-window entries during partial prune', () => {
    let t = 0;
    const w = createRatioRollingWindow({ windowMs: 100, now: () => t });
    w.recordDenominator();
    w.recordNumerator();
    t = 60;
    w.recordDenominator();
    t = 110;
    // old entries (ts=0) gone, only entry at ts=60 remains
    expect(w.snapshot().numerator).toBe(0);
    expect(w.snapshot().denominator).toBe(1);
    expect(w.ratio()).toBe(0);
  });

  it('reset zeroes state', () => {
    let t = 0;
    const w = createRatioRollingWindow({ windowMs: 100, now: () => t });
    w.recordNumerator();
    w.recordDenominator();
    w.reset();
    expect(w.snapshot()).toEqual({ numerator: 0, denominator: 0, ratio: 0, entries: 0 });
  });

  it('coalesces same-timestamp events', () => {
    let t = 0;
    const w = createRatioRollingWindow({ windowMs: 1000, now: () => t });
    w.recordNumerator();
    w.recordNumerator();
    w.recordDenominator();
    expect(w.snapshot().entries).toBe(1);
    expect(w.snapshot().numerator).toBe(2);
    expect(w.snapshot().denominator).toBe(1);
  });

  it('boundary: ts exactly equal to cutoff is pruned (<=)', () => {
    let t = 0;
    const w = createRatioRollingWindow({ windowMs: 100, now: () => t });
    w.recordDenominator();
    w.recordNumerator();
    t = 100;
    // cutoff = 0; entries at ts=0 satisfy ts <= cutoff => pruned
    expect(w.ratio()).toBe(0);
  });

  it('handles many entries without unbounded growth', () => {
    let t = 0;
    const w = createRatioRollingWindow({ windowMs: 50, now: () => t });
    for (let i = 0; i < 5000; i++) {
      t = i;
      w.recordDenominator();
      if (i % 2 === 0) w.recordNumerator();
    }
    const snap = w.snapshot();
    // only entries from ~ t-50 to t remain
    expect(snap.entries).toBeLessThanOrEqual(60);
  });

  it('zero-weight recordings are no-ops', () => {
    let t = 0;
    const w = createRatioRollingWindow({ windowMs: 100, now: () => t });
    w.recordNumerator(0);
    w.recordDenominator(0);
    expect(w.snapshot().entries).toBe(0);
  });

  it('ratio is 0 when denominator is 0 even with numerator', () => {
    let t = 0;
    const w = createRatioRollingWindow({ windowMs: 100, now: () => t });
    w.recordNumerator();
    expect(w.ratio()).toBe(0);
  });

  it('snapshot ratio matches ratio()', () => {
    let t = 0;
    const w = createRatioRollingWindow({ windowMs: 100, now: () => t });
    w.recordDenominator(5);
    w.recordNumerator(2);
    const s = w.snapshot();
    expect(s.ratio).toBeCloseTo(w.ratio());
  });

  it('default clock works (smoke)', () => {
    const w = createRatioRollingWindow({ windowMs: 100000 });
    w.recordDenominator();
    w.recordNumerator();
    expect(w.ratio()).toBe(1);
  });
});
