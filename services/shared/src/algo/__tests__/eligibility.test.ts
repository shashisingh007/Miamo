import { describe, it, expect } from 'vitest';
import { filterEligibility, type EligibilityCandidate } from '../eligibility';

const NOW = 1_700_000_000_000;

function c(id: string, overrides: Partial<EligibilityCandidate> = {}): EligibilityCandidate {
  return { id, age: 30, cityKm: 5, lastShownAt: null, ...overrides };
}

describe('filterEligibility', () => {
  it('rejects self', () => {
    const r = filterEligibility([c('me'), c('other')], { meId: 'me', now: NOW });
    expect(r.pass.map((x) => x.id)).toEqual(['other']);
    expect(r.reject[0].reason).toBe('self');
  });

  it('rejects blocked users', () => {
    const r = filterEligibility([c('a'), c('b')], {
      meId: 'me', now: NOW, blockSet: new Set(['b']),
    });
    expect(r.pass.map((x) => x.id)).toEqual(['a']);
    expect(r.reject[0]).toMatchObject({ id: 'b', reason: 'blocked' });
  });

  it('rejects candidates outside age window', () => {
    const r = filterEligibility([c('young', { age: 20 }), c('old', { age: 60 }), c('ok', { age: 28 })], {
      meId: 'me', now: NOW, ageMin: 25, ageMax: 40,
    });
    expect(r.pass.map((x) => x.id)).toEqual(['ok']);
    expect(r.reject).toHaveLength(2);
  });

  it('passes candidates with unknown age', () => {
    const r = filterEligibility([c('x', { age: null })], {
      meId: 'me', now: NOW, ageMin: 25, ageMax: 40,
    });
    expect(r.pass).toHaveLength(1);
  });

  it('rejects candidates beyond maxKm', () => {
    const r = filterEligibility([c('near', { cityKm: 5 }), c('far', { cityKm: 500 })], {
      meId: 'me', now: NOW, maxKm: 50,
    });
    expect(r.pass.map((x) => x.id)).toEqual(['near']);
  });

  it('passes when maxKm is null (no distance cap)', () => {
    const r = filterEligibility([c('far', { cityKm: 500 })], { meId: 'me', now: NOW });
    expect(r.pass).toHaveLength(1);
  });

  it('rejects recently-shown candidates', () => {
    const r = filterEligibility([
      c('fresh', { lastShownAt: null }),
      c('recent', { lastShownAt: NOW - 1000 }),
    ], { meId: 'me', now: NOW, recentShownWindowMs: 60 * 60 * 1000 });
    expect(r.pass.map((x) => x.id)).toEqual(['fresh']);
    expect(r.reject[0]).toMatchObject({ id: 'recent', reason: 'recently_shown' });
  });

  it('passes candidates shown longer ago than the window', () => {
    const r = filterEligibility([
      c('a', { lastShownAt: NOW - 10 * 60 * 60 * 1000 }),
    ], { meId: 'me', now: NOW, recentShownWindowMs: 6 * 60 * 60 * 1000 });
    expect(r.pass).toHaveLength(1);
  });

  it('returns empty pass list when all rejected', () => {
    const r = filterEligibility([c('me')], { meId: 'me', now: NOW });
    expect(r.pass).toEqual([]);
    expect(r.reject).toHaveLength(1);
  });

  it('produces a reason for every rejection', () => {
    const r = filterEligibility([c('me'), c('old', { age: 90 })], {
      meId: 'me', now: NOW, ageMax: 40,
    });
    expect(r.reject.map((x) => x.reason)).toEqual(['self', 'age_window']);
  });
});
