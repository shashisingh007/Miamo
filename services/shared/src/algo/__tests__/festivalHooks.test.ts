import { describe, it, expect } from 'vitest';
import {
  activeFestivals,
  festivalBoostForCandidate,
  festivalHooksForToday,
  daysUntilNextFestival,
  FESTIVAL_CALENDAR_2026,
  FESTIVAL_BOOST_MAX,
  FESTIVAL_PER_HIT_BOOST,
} from '../v8/festivalHooks';

const DIWALI_DAY = Date.UTC(2026, 10, 8); // 2026-11-08 (Nov is month 10 zero-indexed)
const HOLI_DAY = Date.UTC(2026, 2, 3);    // 2026-03-03
const REGULAR_TUESDAY = Date.UTC(2026, 5, 16); // 2026-06-16 (no festival)
const ONAM_MIDDAY = Date.UTC(2026, 7, 27); // 2026-08-27 (during Onam Aug 23–Sep 2)
const CHRISTMAS = Date.UTC(2026, 11, 25);

describe('festivalHooks — activeFestivals', () => {
  it('Diwali date returns Diwali in active list', () => {
    const fests = activeFestivals(DIWALI_DAY);
    const keys = fests.map((f) => f.key);
    expect(keys).toContain('diwali_2026');
  });

  it('Holi date returns Holi', () => {
    const fests = activeFestivals(HOLI_DAY);
    expect(fests.map((f) => f.key)).toContain('holi_2026');
  });

  it('regular Tuesday with no festival returns empty', () => {
    expect(activeFestivals(REGULAR_TUESDAY)).toEqual([]);
  });

  it('Christmas is global → fires for "india" region', () => {
    const fests = activeFestivals(CHRISTMAS, 'india');
    expect(fests.map((f) => f.key)).toContain('christmas_2026');
  });

  it('Onam appears for "kerala" region', () => {
    const fests = activeFestivals(ONAM_MIDDAY, 'kerala');
    expect(fests.map((f) => f.key)).toContain('onam_2026');
  });

  it('Onam appears for "india" rollup (sub-region included)', () => {
    const fests = activeFestivals(ONAM_MIDDAY, 'india');
    expect(fests.map((f) => f.key)).toContain('onam_2026');
  });

  it('Onam does NOT appear for "tamil" (different sub-region)', () => {
    const fests = activeFestivals(ONAM_MIDDAY, 'tamil');
    expect(fests.map((f) => f.key)).not.toContain('onam_2026');
  });

  it('multi-day festival (Diwali Nov 8–10) returns it on each day', () => {
    for (const d of [8, 9, 10]) {
      const fests = activeFestivals(Date.UTC(2026, 10, d));
      expect(fests.map((f) => f.key)).toContain('diwali_2026');
    }
  });
});

describe('festivalHooks — festivalBoostForCandidate', () => {
  it('candidate posting "diwali plans?" on Diwali earns >0 boost', () => {
    const boost = festivalBoostForCandidate(DIWALI_DAY, [
      { contentLowercase: 'diwali plans?' },
    ]);
    expect(boost).toBeGreaterThan(0);
    expect(boost).toBeLessThanOrEqual(FESTIVAL_BOOST_MAX);
  });

  it('zero posts → zero boost', () => {
    expect(festivalBoostForCandidate(DIWALI_DAY, [])).toBe(0);
  });

  it('off-festival day → zero boost regardless of post content', () => {
    const boost = festivalBoostForCandidate(REGULAR_TUESDAY, [
      { contentLowercase: 'diwali plans?' },
    ]);
    expect(boost).toBe(0);
  });

  it('boost is capped at FESTIVAL_BOOST_MAX even with many hits', () => {
    const spam = Array.from({ length: 20 }, (_, i) => ({
      // Each post hits a different phrase from Diwali's hookPhrases.
      contentLowercase: ['diwali', 'diwali plans', 'lakshmi puja', 'deepavali', 'rangoli'][i % 5],
    }));
    const boost = festivalBoostForCandidate(DIWALI_DAY, spam);
    expect(boost).toBe(FESTIVAL_BOOST_MAX);
  });

  it('duplicate phrase across multiple posts only counts once', () => {
    const boost = festivalBoostForCandidate(DIWALI_DAY, [
      { contentLowercase: 'diwali' },
      { contentLowercase: 'diwali' },
      { contentLowercase: 'diwali' },
    ]);
    // 1 unique phrase × FESTIVAL_PER_HIT_BOOST.
    expect(boost).toBeCloseTo(FESTIVAL_PER_HIT_BOOST, 6);
  });

  it('two distinct phrases stack', () => {
    // "deepavali" and "rangoli" each match exactly one Diwali phrase
    // (avoid the "diwali plans" substring overlap with "diwali").
    const boost = festivalBoostForCandidate(DIWALI_DAY, [
      { contentLowercase: 'happy deepavali everyone' },
      { contentLowercase: 'rangoli all set' },
    ]);
    expect(boost).toBeCloseTo(FESTIVAL_PER_HIT_BOOST * 2, 6);
  });

  it('region filter excludes Onam from non-Kerala viewers (tamil region)', () => {
    const boost = festivalBoostForCandidate(
      ONAM_MIDDAY,
      [{ contentLowercase: 'onam sadhya was great' }],
      'tamil',
    );
    expect(boost).toBe(0);
  });
});

describe('festivalHooks — festivalHooksForToday', () => {
  it('Diwali day returns Diwali phrases', () => {
    const hooks = festivalHooksForToday(DIWALI_DAY);
    expect(hooks).toContain('diwali');
    expect(hooks).toContain('diwali plans');
  });

  it('regular day returns empty', () => {
    expect(festivalHooksForToday(REGULAR_TUESDAY)).toEqual([]);
  });

  it('hooks are de-duplicated', () => {
    const hooks = festivalHooksForToday(DIWALI_DAY);
    expect(new Set(hooks).size).toBe(hooks.length);
  });
});

describe('festivalHooks — daysUntilNextFestival', () => {
  it('returns days to Diwali when querying 5 days before', () => {
    const fiveDaysBefore = DIWALI_DAY - 5 * 24 * 60 * 60 * 1000;
    const r = daysUntilNextFestival(fiveDaysBefore, 'india', 30);
    expect(r).not.toBeNull();
    expect(r?.festival.key).toBe('diwali_2026');
    expect(r?.days).toBe(5);
  });

  it('returns null when no festival is within look-ahead window', () => {
    // Mid-July 2026 with a 7-day window has no upcoming festival
    // (next is Onam Aug 23, > 7 days out).
    const r = daysUntilNextFestival(Date.UTC(2026, 6, 15), 'india', 7);
    expect(r).toBeNull();
  });
});

describe('festivalHooks — calendar invariants', () => {
  it('calendar is non-empty and contains key Indian festivals', () => {
    const keys = FESTIVAL_CALENDAR_2026.map((f) => f.key);
    expect(keys).toContain('diwali_2026');
    expect(keys).toContain('holi_2026');
    expect(keys).toContain('onam_2026');
    expect(keys).toContain('pongal_2026');
  });

  it('every entry has at least one hookPhrase', () => {
    for (const f of FESTIVAL_CALENDAR_2026) {
      expect(f.hookPhrases.length).toBeGreaterThan(0);
    }
  });

  it('every entry has startDateIso ≤ endDateIso', () => {
    for (const f of FESTIVAL_CALENDAR_2026) {
      expect(f.startDateIso <= f.endDateIso).toBe(true);
    }
  });

  it('FESTIVAL_PER_HIT_BOOST × 4 saturates at FESTIVAL_BOOST_MAX', () => {
    // 4 × 0.03 = 0.12, capped to 0.10. Documents the calibration.
    expect(FESTIVAL_PER_HIT_BOOST * 4).toBeGreaterThanOrEqual(FESTIVAL_BOOST_MAX);
  });
});
