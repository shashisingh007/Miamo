import { describe, it, expect } from 'vitest';
import { nextDelayMs, shouldRetry, delaySchedule } from '../retryBackoff';

describe('retryBackoff', () => {
  it('shouldRetry respects maxAttempts', () => {
    expect(shouldRetry(1)).toBe(true);
    expect(shouldRetry(5)).toBe(true);
    expect(shouldRetry(6)).toBe(false);
    expect(shouldRetry(0)).toBe(false);
    expect(shouldRetry(-1)).toBe(false);
    expect(shouldRetry(3, { maxAttempts: 2 })).toBe(false);
  });

  it('returns 0 for non-positive attempt', () => {
    expect(nextDelayMs(0, 0, 0.5)).toBe(0);
    expect(nextDelayMs(-3, 1000, 0.5)).toBe(0);
  });

  it('lower bound is baseMs when rand=0', () => {
    expect(nextDelayMs(1, 0, 0, { baseMs: 100 })).toBe(100);
    expect(nextDelayMs(3, 800, 0, { baseMs: 100 })).toBe(100);
  });

  it('upper bound is 3*prevDelay (or 3*base) when rand=1', () => {
    expect(nextDelayMs(1, 0, 1, { baseMs: 100 })).toBe(300);
    expect(nextDelayMs(2, 200, 1, { baseMs: 100 })).toBe(600);
  });

  it('caps at maxMs', () => {
    expect(nextDelayMs(8, 20_000, 1, { baseMs: 100, maxMs: 5_000 })).toBe(5_000);
  });

  it('clamps rand outside [0,1]', () => {
    expect(nextDelayMs(1, 0, -5, { baseMs: 100 })).toBe(100);
    expect(nextDelayMs(1, 0, 9, { baseMs: 100 })).toBe(300);
    expect(nextDelayMs(1, 0, Number.NaN, { baseMs: 100 })).toBe(100);
  });

  it('delaySchedule is deterministic for a seeded prng', () => {
    const mk = () => { let i = 0; const xs = [0.1, 0.4, 0.7, 0.2, 0.9]; return () => xs[i++ % xs.length]; };
    const a = delaySchedule(mk(), { baseMs: 100, maxMs: 30_000, maxAttempts: 5 });
    const b = delaySchedule(mk(), { baseMs: 100, maxMs: 30_000, maxAttempts: 5 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
    a.forEach(d => { expect(d).toBeGreaterThanOrEqual(100); expect(d).toBeLessThanOrEqual(30_000); });
  });

  it('schedule generally grows (decorrelated jitter)', () => {
    const rand = () => 0.9; // near upper end
    const xs = delaySchedule(rand, { baseMs: 100, maxMs: 1_000_000, maxAttempts: 4 });
    expect(xs[1]).toBeGreaterThan(xs[0]);
    expect(xs[2]).toBeGreaterThan(xs[1]);
  });

  it('honours custom maxAttempts in schedule length', () => {
    const xs = delaySchedule(() => 0.5, { maxAttempts: 3 });
    expect(xs).toHaveLength(3);
  });
});
