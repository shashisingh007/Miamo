import { describe, it, expect } from 'vitest';
import { classifyQuery, shouldSampleQuery } from '../slowQueryFlag';

describe('slowQueryFlag', () => {
  it('default tiers', () => {
    expect(classifyQuery(0)).toBe('ok');
    expect(classifyQuery(50)).toBe('ok');
    expect(classifyQuery(100)).toBe('warn');
    expect(classifyQuery(499)).toBe('warn');
    expect(classifyQuery(500)).toBe('slow');
    expect(classifyQuery(1999)).toBe('slow');
    expect(classifyQuery(2000)).toBe('critical');
    expect(classifyQuery(60_000)).toBe('critical');
  });

  it('honours custom thresholds', () => {
    const t = { warnMs: 10, slowMs: 30, criticalMs: 60 };
    expect(classifyQuery(5, t)).toBe('ok');
    expect(classifyQuery(15, t)).toBe('warn');
    expect(classifyQuery(40, t)).toBe('slow');
    expect(classifyQuery(120, t)).toBe('critical');
  });

  it('treats bogus input as ok', () => {
    expect(classifyQuery(Number.NaN)).toBe('ok');
    expect(classifyQuery(-50)).toBe('ok');
    expect(classifyQuery(Number.POSITIVE_INFINITY)).toBe('ok');
  });

  it('shouldSampleQuery only fires for slow/critical', () => {
    expect(shouldSampleQuery(50)).toBe(false);
    expect(shouldSampleQuery(150)).toBe(false);
    expect(shouldSampleQuery(700)).toBe(true);
    expect(shouldSampleQuery(5000)).toBe(true);
  });

  it('boundary values are inclusive of the higher tier', () => {
    expect(classifyQuery(100)).toBe('warn');
    expect(classifyQuery(500)).toBe('slow');
    expect(classifyQuery(2000)).toBe('critical');
  });
});
