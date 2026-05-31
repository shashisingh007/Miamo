import { describe, it, expect } from 'vitest';
import { nextBackoffDelay } from '../backoffJitterPolicy';

const fixedRng = (v: number) => () => v;

describe('backoffJitterPolicy', () => {
  it('throws on invalid baseMs', () => {
    expect(() =>
      nextBackoffDelay({ baseMs: 0, capMs: 100, attempt: 0, strategy: 'full' })
    ).toThrow(RangeError);
  });

  it('throws when cap < base', () => {
    expect(() =>
      nextBackoffDelay({ baseMs: 100, capMs: 50, attempt: 0, strategy: 'full' })
    ).toThrow(RangeError);
  });

  it('none strategy is pure exponential capped', () => {
    const r1 = nextBackoffDelay({ baseMs: 100, capMs: 10_000, attempt: 0, strategy: 'none' });
    expect(r1.sleepMs).toBe(100);
    const r2 = nextBackoffDelay({ baseMs: 100, capMs: 10_000, attempt: 3, strategy: 'none' });
    expect(r2.sleepMs).toBe(800);
    const r3 = nextBackoffDelay({ baseMs: 100, capMs: 500, attempt: 10, strategy: 'none' });
    expect(r3.sleepMs).toBe(500);
  });

  it('full jitter returns value in [0, exp]', () => {
    const r = nextBackoffDelay({
      baseMs: 100,
      capMs: 10_000,
      attempt: 3, // exp = 800
      strategy: 'full',
      rng: fixedRng(0.5),
    });
    expect(r.sleepMs).toBe(400);
  });

  it('full jitter respects cap', () => {
    const r = nextBackoffDelay({
      baseMs: 100,
      capMs: 500,
      attempt: 10,
      strategy: 'full',
      rng: fixedRng(0.99),
    });
    expect(r.sleepMs).toBeLessThanOrEqual(500);
  });

  it('equal jitter returns in [exp/2, exp]', () => {
    const r = nextBackoffDelay({
      baseMs: 100,
      capMs: 10_000,
      attempt: 3, // exp = 800
      strategy: 'equal',
      rng: fixedRng(0),
    });
    expect(r.sleepMs).toBe(400);
    const r2 = nextBackoffDelay({
      baseMs: 100,
      capMs: 10_000,
      attempt: 3,
      strategy: 'equal',
      rng: fixedRng(1),
    });
    expect(r2.sleepMs).toBe(800);
  });

  it('decorrelated jitter uses prev*3 as upper bound', () => {
    const r = nextBackoffDelay({
      baseMs: 100,
      capMs: 10_000,
      attempt: 0,
      prevMs: 200,
      strategy: 'decorrelated',
      rng: fixedRng(0),
    });
    expect(r.sleepMs).toBe(100); // lower bound = base
    const r2 = nextBackoffDelay({
      baseMs: 100,
      capMs: 10_000,
      attempt: 0,
      prevMs: 200,
      strategy: 'decorrelated',
      rng: fixedRng(1),
    });
    // upper = min(cap, 200*3) = 600
    expect(r2.sleepMs).toBe(600);
  });

  it('decorrelated falls back to baseMs when prev missing', () => {
    const r = nextBackoffDelay({
      baseMs: 100,
      capMs: 10_000,
      attempt: 0,
      strategy: 'decorrelated',
      rng: fixedRng(1),
    });
    // upper = 100*3 = 300
    expect(r.sleepMs).toBe(300);
  });

  it('decorrelated respects cap', () => {
    const r = nextBackoffDelay({
      baseMs: 100,
      capMs: 200,
      attempt: 0,
      prevMs: 5000,
      strategy: 'decorrelated',
      rng: fixedRng(1),
    });
    expect(r.sleepMs).toBe(200);
  });

  it('negative attempt is treated as 0', () => {
    const r = nextBackoffDelay({
      baseMs: 100,
      capMs: 10_000,
      attempt: -5,
      strategy: 'none',
    });
    expect(r.sleepMs).toBe(100);
  });

  it('huge attempt does not overflow and clamps to cap', () => {
    const r = nextBackoffDelay({
      baseMs: 100,
      capMs: 5000,
      attempt: 9999,
      strategy: 'none',
    });
    expect(r.sleepMs).toBe(5000);
  });

  it('nextPrevMs mirrors sleepMs for chaining', () => {
    const r = nextBackoffDelay({
      baseMs: 100,
      capMs: 10_000,
      attempt: 2,
      strategy: 'full',
      rng: fixedRng(0.5),
    });
    expect(r.nextPrevMs).toBe(r.sleepMs);
  });

  it('unknown strategy throws', () => {
    expect(() =>
      nextBackoffDelay({
        baseMs: 100,
        capMs: 1000,
        attempt: 0,
        // @ts-expect-error testing runtime guard
        strategy: 'cubic',
      })
    ).toThrow(RangeError);
  });
});
