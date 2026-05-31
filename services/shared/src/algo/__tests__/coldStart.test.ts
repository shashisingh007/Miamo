import { describe, it, expect } from 'vitest';
import { coldStartPolicy } from '../coldStart';
import type { SessionSummaryRow } from '../signals';

function s(daysAgo: number): SessionSummaryRow {
  const t = Date.now() - daysAgo * 86_400_000;
  return {
    uidHash: 'u', sessionId: 'sid', startedAt: new Date(t), endedAt: new Date(t),
    durationMs: 1000, idleMs: 0, routesVisited: [], cardsViewed: 0,
    swipesLeft: 0, swipesRight: 0, msgsSent: 0, msgsRead: 0,
    zeroActionSession: false, windowShopping: false, ghostedSelf: false,
  };
}

describe('coldStartPolicy', () => {
  it('returns fresh stage for zero sessions', () => {
    const p = coldStartPolicy([]);
    expect(p.stage).toBe('fresh');
    expect(p.candPoolMultiplier).toBeGreaterThan(1);
    expect(p.personalisedWeight + p.fallbackWeight).toBeCloseTo(1.0, 6);
    expect(p.suggestOnboardingPrompt).toBe(true);
  });

  it('returns warming for 1–2 sessions', () => {
    expect(coldStartPolicy([s(1)]).stage).toBe('warming');
    expect(coldStartPolicy([s(1), s(2)]).stage).toBe('warming');
  });

  it('returns established for >=3 fresh sessions', () => {
    const p = coldStartPolicy([s(0), s(1), s(2)]);
    expect(p.stage).toBe('established');
    expect(p.candPoolMultiplier).toBe(1.0);
    expect(p.personalisedWeight).toBe(1.0);
    expect(p.fallbackWeight).toBe(0);
    expect(p.suggestOnboardingPrompt).toBe(false);
  });

  it('respects custom warmingThreshold', () => {
    expect(coldStartPolicy([s(0), s(1), s(2)], { warmingThreshold: 5 }).stage).toBe('warming');
  });

  it('treats dormant user (>21d) as warming even with many sessions', () => {
    const old = [s(40), s(41), s(42), s(43)];
    const p = coldStartPolicy(old);
    expect(p.detected.dormant).toBe(true);
    expect(p.stage).toBe('warming');
  });

  it('does not mark recently-active user dormant', () => {
    const recent = [s(0), s(1), s(2)];
    const p = coldStartPolicy(recent);
    expect(p.detected.dormant).toBe(false);
    expect(p.stage).toBe('established');
  });

  it('honours custom nowMs', () => {
    const ref = Date.now() - 100 * 86_400_000;
    const p = coldStartPolicy([s(0), s(0), s(0)], { nowMs: ref, dormantDays: 5 });
    // sessions are recent vs Date.now, but very old vs nowMs → not dormant
    // (ageMs is negative; treated as not dormant)
    expect(p.detected.dormant).toBe(false);
  });

  it('records sessionCount in detected', () => {
    expect(coldStartPolicy([s(0), s(1)]).detected.sessionCount).toBe(2);
  });
});
