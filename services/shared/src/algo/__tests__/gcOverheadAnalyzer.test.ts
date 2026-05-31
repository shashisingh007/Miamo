import { describe, it, expect } from 'vitest';
import { analyzeGcOverhead } from '../gcOverheadAnalyzer';

describe('gcOverheadAnalyzer', () => {
  it('quiet run -> ok', () => {
    const r = analyzeGcOverhead({ gcMs: 5, windowMs: 10_000 });
    expect(r.overheadPct).toBeCloseTo(0.05, 6);
    expect(r.severity).toBe('ok');
  });

  it('warn band at 2%', () => {
    const r = analyzeGcOverhead({ gcMs: 200, windowMs: 10_000 });
    expect(r.overheadPct).toBeCloseTo(2, 6);
    expect(r.severity).toBe('warn');
  });

  it('degraded at 5%', () => {
    const r = analyzeGcOverhead({ gcMs: 500, windowMs: 10_000 });
    expect(r.severity).toBe('degraded');
  });

  it('critical at 10%+', () => {
    const r = analyzeGcOverhead({ gcMs: 1500, windowMs: 10_000 });
    expect(r.severity).toBe('critical');
  });

  it('heap >= 0.9 bumps severity up one notch', () => {
    const r = analyzeGcOverhead({
      gcMs: 200,            // warn
      windowMs: 10_000,
      heapUsedBytes: 95,
      heapLimitBytes: 100,
    });
    expect(r.heapPressure).toBeCloseTo(0.95, 6);
    expect(r.severity).toBe('degraded');
  });

  it('heap pressure cannot bump past critical', () => {
    const r = analyzeGcOverhead({
      gcMs: 2000,
      windowMs: 10_000,
      heapUsedBytes: 100,
      heapLimitBytes: 100,
    });
    expect(r.severity).toBe('critical');
  });

  it('heap below 0.9 leaves severity unchanged', () => {
    const r = analyzeGcOverhead({
      gcMs: 200,
      windowMs: 10_000,
      heapUsedBytes: 50,
      heapLimitBytes: 100,
    });
    expect(r.severity).toBe('warn');
  });

  it('windowMs=0 -> 0% overhead', () => {
    const r = analyzeGcOverhead({ gcMs: 100, windowMs: 0 });
    expect(r.overheadPct).toBe(0);
    expect(r.severity).toBe('ok');
  });

  it('negative gc/window clamped to 0', () => {
    const r = analyzeGcOverhead({ gcMs: -10, windowMs: -5 });
    expect(r.overheadPct).toBe(0);
    expect(r.severity).toBe('ok');
  });

  it('NaN inputs treated as 0', () => {
    const r = analyzeGcOverhead({ gcMs: NaN as any, windowMs: 1000 });
    expect(r.overheadPct).toBe(0);
  });

  it('partial heap info ignored gracefully', () => {
    const r = analyzeGcOverhead({ gcMs: 100, windowMs: 10_000, heapUsedBytes: 95 });
    expect(r.heapPressure).toBe(0);
  });

  it('heap clamps to [0,1]', () => {
    const r = analyzeGcOverhead({
      gcMs: 100, windowMs: 10_000,
      heapUsedBytes: 500, heapLimitBytes: 100,
    });
    expect(r.heapPressure).toBe(1);
  });
});
