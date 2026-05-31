import { describe, it, expect } from 'vitest';
import { computeSloBurnRate } from '../sloBurnRate';

describe('sloBurnRate', () => {
  it('all-good traffic -> burn 0 ok', () => {
    const r = computeSloBurnRate({
      sloTarget: 0.999,
      short: { good: 1000, bad: 0 },
      long: { good: 100000, bad: 0 },
    });
    expect(r.shortBurn).toBe(0);
    expect(r.longBurn).toBe(0);
    expect(r.severity).toBe('ok');
  });

  it('error rate equal to budget -> burn ~1', () => {
    const r = computeSloBurnRate({
      sloTarget: 0.99,
      short: { good: 98, bad: 2 },
      long: { good: 98, bad: 2 },
    });
    expect(r.shortBurn).toBeCloseTo(2, 6);
    expect(r.severity).toBe('ticket');
  });

  it('fast-burn both windows -> page', () => {
    const r = computeSloBurnRate({
      sloTarget: 0.999,
      short: { good: 80, bad: 20 },     // burn = 20%/0.1% = 200
      long: { good: 800, bad: 200 },    // also massive
    });
    expect(r.severity).toBe('page');
  });

  it('only long window burns -> ticket', () => {
    const r = computeSloBurnRate({
      sloTarget: 0.99,
      short: { good: 999, bad: 1 },     // ok
      long: { good: 90, bad: 10 },      // burn=10
    });
    expect(r.severity).toBe('ticket');
  });

  it('empty windows handled', () => {
    const r = computeSloBurnRate({
      sloTarget: 0.99,
      short: { good: 0, bad: 0 },
      long: { good: 0, bad: 0 },
    });
    expect(r.shortBurn).toBe(0);
    expect(r.severity).toBe('ok');
  });

  it('SLO target 1 with bad events -> infinite burn', () => {
    const r = computeSloBurnRate({
      sloTarget: 1,
      short: { good: 1, bad: 1 },
      long: { good: 1, bad: 1 },
    });
    expect(r.shortBurn).toBe(Number.POSITIVE_INFINITY);
    expect(r.severity).toBe('page');
  });

  it('SLO target 1 with no bad events -> burn 0', () => {
    const r = computeSloBurnRate({
      sloTarget: 1,
      short: { good: 100, bad: 0 },
      long: { good: 100, bad: 0 },
    });
    expect(r.shortBurn).toBe(0);
  });

  it('custom thresholds honored', () => {
    const r = computeSloBurnRate({
      sloTarget: 0.99,
      short: { good: 95, bad: 5 },    // burn=5
      long: { good: 95, bad: 5 },     // burn=5
      shortFastThreshold: 4,
      longSlowThreshold: 4,
    });
    expect(r.severity).toBe('page');
  });

  it('clamps SLO target to [0,1]', () => {
    const r = computeSloBurnRate({
      sloTarget: 2,
      short: { good: 0, bad: 0 },
      long: { good: 0, bad: 0 },
    });
    expect(r.shortBurn).toBe(0);
  });

  it('long below slow threshold, short hot -> still ok (sre rule)', () => {
    const r = computeSloBurnRate({
      sloTarget: 0.999,
      short: { good: 70, bad: 30 },
      long: { good: 999999, bad: 1 },
    });
    expect(r.severity).toBe('ok');
  });
});
