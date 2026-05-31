import { describe, it, expect } from 'vitest';
import { assignCohort } from '../cohortBucket';

describe('cohortBucket', () => {
  it('default cohorts are control / a / b', () => {
    const r = assignCohort({ uid: 'u1', experimentKey: 'exp_x' });
    expect(['control', 'a', 'b']).toContain(r.cohort);
  });

  it('is deterministic for same (uid, experimentKey)', () => {
    const a = assignCohort({ uid: 'u1', experimentKey: 'exp_x' });
    const b = assignCohort({ uid: 'u1', experimentKey: 'exp_x' });
    expect(a).toEqual(b);
  });

  it('different experiments give independent assignments', () => {
    let same = 0;
    for (let i = 0; i < 200; i++) {
      const a = assignCohort({ uid: `u${i}`, experimentKey: 'exp_x' });
      const b = assignCohort({ uid: `u${i}`, experimentKey: 'exp_y' });
      if (a.cohort === b.cohort) same++;
    }
    // With 3 cohorts, random would be ~66 same; allow a wide range.
    expect(same).toBeLessThan(150);
    expect(same).toBeGreaterThan(20);
  });

  it('distribution is roughly uniform across 3 cohorts', () => {
    const counts = { control: 0, a: 0, b: 0 } as Record<string, number>;
    const N = 6000;
    for (let i = 0; i < N; i++) {
      counts[assignCohort({ uid: `user_${i}`, experimentKey: 'exp_z' }).cohort]++;
    }
    for (const k of Object.keys(counts)) {
      expect(counts[k]).toBeGreaterThan(N / 4);
      expect(counts[k]).toBeLessThan((N * 5) / 12);
    }
  });

  it('honours custom cohort labels', () => {
    const r = assignCohort({ uid: 'u', experimentKey: 'e', cohorts: ['x', 'y', 'z', 'w'] });
    expect(['x', 'y', 'z', 'w']).toContain(r.cohort);
    expect(r.index).toBeGreaterThanOrEqual(0);
    expect(r.index).toBeLessThan(4);
  });

  it('single-cohort allocation always returns that cohort', () => {
    const r = assignCohort({ uid: 'u', experimentKey: 'e', cohorts: ['only'] });
    expect(r.cohort).toBe('only');
    expect(r.index).toBe(0);
  });

  it('invalid input falls back to first cohort', () => {
    const r = assignCohort({ uid: '', experimentKey: 'e' });
    expect(r.cohort).toBe('control');
    expect(r.index).toBe(0);
    expect(r.bucket).toBe(0);
  });

  it('empty cohorts array falls back to default', () => {
    const r = assignCohort({ uid: 'u', experimentKey: 'e', cohorts: [] });
    expect(['control', 'a', 'b']).toContain(r.cohort);
  });
});
