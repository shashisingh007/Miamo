import { describe, it, expect } from 'vitest';
import { computeConnectionPoolStats } from '../connectionPoolStats';

describe('connectionPoolStats', () => {
  it('quiet pool -> ok', () => {
    const r = computeConnectionPoolStats({ active: 1, idle: 9, waiting: 0, max: 10 });
    expect(r.severity).toBe('ok');
    expect(r.utilisation).toBeCloseTo(0.1, 6);
    expect(r.idleRatio).toBeCloseTo(0.9, 6);
    expect(r.saturated).toBe(false);
  });

  it('warn band at 70% utilisation', () => {
    const r = computeConnectionPoolStats({ active: 7, idle: 3, waiting: 0, max: 10 });
    expect(r.severity).toBe('warn');
  });

  it('degraded at 90% util', () => {
    const r = computeConnectionPoolStats({ active: 9, idle: 1, waiting: 0, max: 10 });
    expect(r.severity).toBe('degraded');
  });

  it('any waiter -> at least degraded', () => {
    const r = computeConnectionPoolStats({ active: 5, idle: 5, waiting: 1, max: 10 });
    expect(r.severity).toBe('degraded');
  });

  it('critical when util >= 1', () => {
    const r = computeConnectionPoolStats({ active: 10, idle: 0, waiting: 0, max: 10 });
    expect(r.severity).toBe('critical');
    expect(r.saturated).toBe(true);
  });

  it('critical when waitPressure >= 0.5', () => {
    const r = computeConnectionPoolStats({ active: 5, idle: 5, waiting: 5, max: 10 });
    expect(r.severity).toBe('critical');
    expect(r.waitPressure).toBeCloseTo(0.5, 6);
  });

  it('over-cap active still classified critical', () => {
    const r = computeConnectionPoolStats({ active: 12, idle: 0, waiting: 0, max: 10 });
    expect(r.severity).toBe('critical');
    expect(r.utilisation).toBeGreaterThan(1);
  });

  it('zero max -> zero ratios, ok', () => {
    const r = computeConnectionPoolStats({ active: 0, idle: 0, waiting: 0, max: 0 });
    expect(r.utilisation).toBe(0);
    expect(r.severity).toBe('ok');
  });

  it('clamps negative inputs', () => {
    const r = computeConnectionPoolStats({ active: -3, idle: -1, waiting: -1, max: 10 });
    expect(r.total).toBe(0);
    expect(r.severity).toBe('ok');
  });

  it('handles NaN inputs', () => {
    const r = computeConnectionPoolStats({ active: NaN as any, idle: 5, waiting: 0, max: 10 });
    expect(r.utilisation).toBe(0);
    expect(r.severity).toBe('ok');
  });

  it('reports total = active + idle', () => {
    const r = computeConnectionPoolStats({ active: 3, idle: 4, waiting: 0, max: 10 });
    expect(r.total).toBe(7);
  });
});
