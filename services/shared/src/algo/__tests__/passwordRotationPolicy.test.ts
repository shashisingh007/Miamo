import { describe, it, expect } from 'vitest';
import { evaluateRotation } from '../passwordRotationPolicy';

describe('passwordRotationPolicy', () => {
  it('fresh password -> ok', () => {
    const r = evaluateRotation({ passwordAgeDays: 5 });
    expect(r.verdict).toBe('ok');
    expect(r.reason).toBe('fresh');
  });

  it('aging password (past warn) -> should_rotate / aging', () => {
    const r = evaluateRotation({ passwordAgeDays: 65 });
    expect(r.verdict).toBe('should_rotate');
    expect(r.reason).toBe('aging');
  });

  it('weak password -> should_rotate / weak', () => {
    const r = evaluateRotation({ passwordAgeDays: 5, weak: true });
    expect(r.verdict).toBe('should_rotate');
    expect(r.reason).toBe('weak');
  });

  it('breached -> must_rotate / breached', () => {
    const r = evaluateRotation({ passwordAgeDays: 5, breached: true });
    expect(r.verdict).toBe('must_rotate');
    expect(r.reason).toBe('breached');
  });

  it('forced by admin -> must_rotate / forced', () => {
    const r = evaluateRotation({ passwordAgeDays: 5, forcedByAdmin: true });
    expect(r.verdict).toBe('must_rotate');
    expect(r.reason).toBe('forced');
  });

  it('age past max but within grace -> must_rotate / expired', () => {
    const r = evaluateRotation({ passwordAgeDays: 95 });
    expect(r.verdict).toBe('must_rotate');
    expect(r.reason).toBe('expired');
    expect(r.graceDaysRemaining).toBeGreaterThan(0);
  });

  it('age past max+grace -> expired (lockout)', () => {
    const r = evaluateRotation({ passwordAgeDays: 200 });
    expect(r.verdict).toBe('expired');
    expect(r.graceDaysRemaining).toBe(0);
  });

  it('breach takes precedence over fresh age', () => {
    const r = evaluateRotation({ passwordAgeDays: 1, breached: true });
    expect(r.verdict).toBe('must_rotate');
    expect(r.reason).toBe('breached');
  });

  it('custom warn/max thresholds', () => {
    const r = evaluateRotation({ passwordAgeDays: 35, warnAtDays: 30, maxAgeDays: 60 });
    expect(r.verdict).toBe('should_rotate');
    expect(r.reason).toBe('aging');
  });

  it('expired even when breached if past grace', () => {
    const r = evaluateRotation({ passwordAgeDays: 500, breached: true });
    expect(r.verdict).toBe('expired');
  });

  it('negative age clamps to 0', () => {
    const r = evaluateRotation({ passwordAgeDays: -10 });
    expect(r.verdict).toBe('ok');
  });

  it('NaN age treated as 0', () => {
    const r = evaluateRotation({ passwordAgeDays: NaN as any });
    expect(r.verdict).toBe('ok');
  });

  it('graceDaysRemaining shrinks as age grows', () => {
    const young = evaluateRotation({ passwordAgeDays: 50 });
    const old = evaluateRotation({ passwordAgeDays: 80 });
    expect(old.graceDaysRemaining).toBeLessThan(young.graceDaysRemaining);
  });
});
