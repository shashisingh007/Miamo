import { describe, it, expect } from 'vitest';
import { assignDtmCohort } from '../dtmCohort';

const COHORTS = ['A', 'B', 'C'] as const;

describe('assignDtmCohort', () => {
  it('returns null for empty cohort list', () => {
    expect(assignDtmCohort('u1', { experimentKey: 'k', cohorts: [] })).toBeNull();
  });
  it('is deterministic for (user, experiment)', () => {
    const a = assignDtmCohort('u1', { experimentKey: 'k', cohorts: COHORTS });
    const b = assignDtmCohort('u1', { experimentKey: 'k', cohorts: COHORTS });
    expect(a).toBe(b);
  });
  it('different experiment keys can reassign the same user', () => {
    const a = assignDtmCohort('u1', { experimentKey: 'k1', cohorts: COHORTS });
    const b = assignDtmCohort('u1', { experimentKey: 'k2', cohorts: COHORTS });
    expect([a, b].every((x) => COHORTS.includes(x as any))).toBe(true);
    // Not equal is highly likely (~2/3) but we can't assert it; just verify
    // both are valid cohorts.
  });
  it('always returns a cohort from the supplied list', () => {
    for (let i = 0; i < 500; i++) {
      const c = assignDtmCohort(`u${i}`, { experimentKey: 'k', cohorts: COHORTS });
      expect(COHORTS).toContain(c);
    }
  });
  it('uniform-ish distribution over 3 cohorts (chi-square is loose)', () => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0 };
    for (let i = 0; i < 3000; i++) {
      const c = assignDtmCohort(`u${i}`, { experimentKey: 'k', cohorts: COHORTS });
      if (c) counts[c]++;
    }
    for (const k of COHORTS) {
      expect(counts[k]).toBeGreaterThan(750);  // ≥ 25%
      expect(counts[k]).toBeLessThan(1250);    // ≤ ~42%
    }
  });
  it('weights skew distribution', () => {
    const counts: Record<string, number> = { A: 0, B: 0 };
    for (let i = 0; i < 2000; i++) {
      const c = assignDtmCohort(`u${i}`, {
        experimentKey: 'k', cohorts: ['A', 'B'], weights: [9, 1],
      });
      if (c) counts[c]++;
    }
    expect(counts.A).toBeGreaterThan(counts.B * 3);
  });
  it('zero weights fall back to first cohort safely', () => {
    const c = assignDtmCohort('u', {
      experimentKey: 'k', cohorts: ['X', 'Y'], weights: [0, 0],
    });
    expect(c).toBe('X');
  });
});
