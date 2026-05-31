import { describe, it, expect } from 'vitest';
import {
  fibonacciBackoffDelay,
  fibonacciBackoffSchedule,
} from '../fibonacciBackoffPolicy';

const CFG = { baseMs: 100, maxMs: 10000 };

describe('fibonacciBackoffPolicy', () => {
  it('attempt 1 => fib(1)*base = 100', () => {
    expect(fibonacciBackoffDelay(1, CFG).delayMs).toBe(100);
  });

  it('attempt 2 => fib(2)*base = 100', () => {
    expect(fibonacciBackoffDelay(2, CFG).delayMs).toBe(100);
  });

  it('attempt 3 => fib(3)*base = 200', () => {
    expect(fibonacciBackoffDelay(3, CFG).delayMs).toBe(200);
  });

  it('attempt 6 => fib(6)*base = 800', () => {
    expect(fibonacciBackoffDelay(6, CFG).delayMs).toBe(800);
  });

  it('cap applied beyond max', () => {
    const d = fibonacciBackoffDelay(20, { baseMs: 100, maxMs: 5000 });
    expect(d.cappedMs).toBe(5000);
    expect(d.delayMs).toBe(5000);
    expect(d.rawMs).toBeGreaterThan(5000);
  });

  it('full jitter in [0, capped]', () => {
    const rng = () => 0.5;
    const d = fibonacciBackoffDelay(5, { ...CFG, jitter: 'full' }, rng);
    // fib(5)=5 -> 500; jitter half -> 250
    expect(d.delayMs).toBe(250);
  });

  it('full jitter with rng=0 yields 0', () => {
    const d = fibonacciBackoffDelay(3, { ...CFG, jitter: 'full' }, () => 0);
    expect(d.delayMs).toBe(0);
  });

  it('full jitter with rng=1 yields capped', () => {
    const d = fibonacciBackoffDelay(3, { ...CFG, jitter: 'full' }, () => 1);
    expect(d.delayMs).toBe(200);
  });

  it('equal jitter in [capped/2, capped]', () => {
    const d0 = fibonacciBackoffDelay(3, { ...CFG, jitter: 'equal' }, () => 0);
    const d1 = fibonacciBackoffDelay(3, { ...CFG, jitter: 'equal' }, () => 1);
    expect(d0.delayMs).toBe(100);
    expect(d1.delayMs).toBe(200);
  });

  it('rng outside [0,1] clamped', () => {
    const d = fibonacciBackoffDelay(3, { ...CFG, jitter: 'full' }, () => 5);
    expect(d.delayMs).toBe(200);
  });

  it('rng NaN treated as 0', () => {
    const d = fibonacciBackoffDelay(3, { ...CFG, jitter: 'full' }, () => NaN);
    expect(d.delayMs).toBe(0);
  });

  it('throws on attempt < 1', () => {
    expect(() => fibonacciBackoffDelay(0, CFG)).toThrow();
  });

  it('throws on non-integer attempt', () => {
    expect(() => fibonacciBackoffDelay(1.5, CFG)).toThrow();
  });

  it('throws on bad base/max', () => {
    expect(() => fibonacciBackoffDelay(1, { baseMs: 0, maxMs: 10 })).toThrow();
    expect(() => fibonacciBackoffDelay(1, { baseMs: 100, maxMs: 50 })).toThrow();
  });

  it('schedule returns N steps with rising raw values', () => {
    const sch = fibonacciBackoffSchedule(7, CFG);
    expect(sch.map((s) => s.rawMs)).toEqual([100, 100, 200, 300, 500, 800, 1300]);
  });

  it('schedule applies cap consistently', () => {
    const sch = fibonacciBackoffSchedule(15, { baseMs: 100, maxMs: 2000 });
    const last = sch[sch.length - 1];
    expect(last.cappedMs).toBe(2000);
  });

  it('schedule rejects bad attempts', () => {
    expect(() => fibonacciBackoffSchedule(0, CFG)).toThrow();
  });

  it('default jitter is none', () => {
    expect(fibonacciBackoffDelay(4, CFG).delayMs).toBe(300);
  });

  it('rawMs preserved even when capped', () => {
    const d = fibonacciBackoffDelay(10, { baseMs: 100, maxMs: 1000 });
    expect(d.rawMs).toBe(5500);
    expect(d.cappedMs).toBe(1000);
  });
});
