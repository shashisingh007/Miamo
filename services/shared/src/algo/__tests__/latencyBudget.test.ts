import { describe, it, expect } from 'vitest';
import { startBudget, recordSegment, statusOf, summarise } from '../latencyBudget';

describe('latencyBudget', () => {
  it('startBudget initialises zero', () => {
    const b = startBudget(1000, 500);
    expect(b.startedAtMs).toBe(1000);
    expect(b.budgetMs).toBe(500);
    expect(b.spentMs).toBe(0);
    expect(b.segments).toEqual([]);
  });

  it('records segments and accumulates spentMs', () => {
    let b = startBudget(0, 1000);
    b = recordSegment(b, 'db', 100);
    b = recordSegment(b, 'cache', 50);
    expect(b.spentMs).toBe(150);
    expect(b.segments).toHaveLength(2);
  });

  it('ignores invalid ms', () => {
    let b = startBudget(0, 100);
    b = recordSegment(b, 'x', NaN);
    b = recordSegment(b, 'x', -1);
    expect(b.spentMs).toBe(0);
  });

  it('status reports remaining vs burned', () => {
    let b = startBudget(0, 100);
    b = recordSegment(b, 'a', 40);
    const s = statusOf(b, 40);
    expect(s.remainingMs).toBe(60);
    expect(s.burnedPct).toBeCloseTo(0.4, 6);
    expect(s.exhausted).toBe(false);
    expect(s.shouldShed).toBe(false);
  });

  it('shouldShed at 80% burn', () => {
    let b = startBudget(0, 100);
    b = recordSegment(b, 'a', 80);
    expect(statusOf(b, 80).shouldShed).toBe(true);
  });

  it('exhausted true when budget exceeded', () => {
    let b = startBudget(0, 50);
    b = recordSegment(b, 'a', 200);
    const s = statusOf(b, 200);
    expect(s.exhausted).toBe(true);
    expect(s.remainingMs).toBeLessThan(0);
  });

  it('uses wall-clock when greater than recorded segments', () => {
    const b = startBudget(0, 100);
    const s = statusOf(b, 90);
    expect(s.remainingMs).toBe(10);
  });

  it('zero budget -> burnedPct 1', () => {
    const s = statusOf(startBudget(0, 0), 0);
    expect(s.burnedPct).toBe(1);
    expect(s.exhausted).toBe(true);
  });

  it('summarise returns top segment', () => {
    let b = startBudget(0, 1000);
    b = recordSegment(b, 'db', 100);
    b = recordSegment(b, 'cache', 500);
    b = recordSegment(b, 'render', 20);
    expect(summarise(b)).toEqual({ topSegmentName: 'cache', topSegmentMs: 500 });
  });

  it('summarise empty -> nulls', () => {
    expect(summarise(startBudget(0, 100))).toEqual({ topSegmentName: null, topSegmentMs: 0 });
  });
});
