import { describe, it, expect } from 'vitest';
import { initQuota, checkQuota } from '../quotaEnforcer';

const T0 = Date.UTC(2025, 0, 15, 12, 0, 0); // 2025-01-15 12:00 UTC

describe('quotaEnforcer', () => {
  it('init produces today key with 0 used', () => {
    const q = initQuota(T0);
    expect(q.dayKey).toBe('2025-01-15');
    expect(q.used).toBe(0);
  });

  it('allows up to limit', () => {
    let state = initQuota(T0);
    for (let i = 0; i < 5; i++) {
      const r = checkQuota(state, { nowMs: T0, dailyLimit: 5 });
      expect(r.allowed).toBe(true);
      state = r.next;
    }
    expect(state.used).toBe(5);
  });

  it('denies when exceeded', () => {
    const state = { dayKey: '2025-01-15', used: 5 };
    const r = checkQuota(state, { nowMs: T0, dailyLimit: 5 });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('exceeded');
    expect(r.remaining).toBe(0);
  });

  it('resets at next day boundary', () => {
    const yesterday = { dayKey: '2025-01-14', used: 99 };
    const r = checkQuota(yesterday, { nowMs: T0, dailyLimit: 5 });
    expect(r.allowed).toBe(true);
    expect(r.next.dayKey).toBe('2025-01-15');
    expect(r.next.used).toBe(1);
  });

  it('respects custom cost', () => {
    const r = checkQuota(initQuota(T0), { nowMs: T0, dailyLimit: 10, cost: 4 });
    expect(r.allowed).toBe(true);
    expect(r.next.used).toBe(4);
    expect(r.remaining).toBe(6);
  });

  it('rejects invalid cost', () => {
    const r = checkQuota(initQuota(T0), { nowMs: T0, dailyLimit: 10, cost: -1 });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('invalid_cost');
  });

  it('limit 0 denies everything', () => {
    const r = checkQuota(null, { nowMs: T0, dailyLimit: 0 });
    expect(r.allowed).toBe(false);
  });

  it('partial deny when cost > remaining', () => {
    const state = { dayKey: '2025-01-15', used: 4 };
    const r = checkQuota(state, { nowMs: T0, dailyLimit: 5, cost: 3 });
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(1);
  });

  it('resetAtMs is in the future on same day', () => {
    const r = checkQuota(null, { nowMs: T0, dailyLimit: 5 });
    expect(r.resetAtMs).toBeGreaterThan(T0);
  });

  it('honours tz offset for day boundary', () => {
    // -480 = PST (UTC-8). 12:00 UTC = 04:00 PST same day.
    const r = checkQuota(null, { nowMs: T0, dailyLimit: 5, tzOffsetMinutes: -480 });
    expect(r.next.dayKey).toBe('2025-01-15');
  });
});
