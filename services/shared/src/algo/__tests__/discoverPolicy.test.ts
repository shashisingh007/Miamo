import { describe, it, expect } from 'vitest';
import { computeDiscoverPolicy, DEFAULT_POLICY } from '../discoverPolicy';
import type { SessionSummaryRow } from '../signals';

function s(over: Partial<SessionSummaryRow> = {}): SessionSummaryRow {
  return {
    uidHash: 'h', sessionId: 's',
    startedAt: new Date(), endedAt: new Date(),
    durationMs: 60_000, idleMs: 0, routesVisited: [],
    cardsViewed: 5, swipesLeft: 0, swipesRight: 0,
    msgsSent: 0, msgsRead: 0,
    zeroActionSession: false, windowShopping: false, ghostedSelf: false,
    ...over,
  };
}

describe('computeDiscoverPolicy', () => {
  it('returns DEFAULT_POLICY for empty input', () => {
    expect(computeDiscoverPolicy([])).toEqual(DEFAULT_POLICY);
  });

  it('detects windowShopping after 3 consecutive ws sessions', () => {
    const out = computeDiscoverPolicy([
      s({ sessionId: 's3', windowShopping: true }),
      s({ sessionId: 's2', windowShopping: true }),
      s({ sessionId: 's1', windowShopping: true }),
    ]);
    expect(out.detected.windowShopping).toBe(true);
    expect(out.candPoolMultiplier).toBeLessThan(1);
  });

  it('does NOT detect windowShopping after only 2 ws sessions', () => {
    const out = computeDiscoverPolicy([
      s({ sessionId: 's2', windowShopping: true }),
      s({ sessionId: 's1', windowShopping: true }),
    ]);
    expect(out.detected.windowShopping).toBe(false);
    expect(out.candPoolMultiplier).toBe(1);
  });

  it('detects zeroActionRecovery and applies reciprocityBoost', () => {
    const out = computeDiscoverPolicy([
      s({ sessionId: 's2', zeroActionSession: true }),
      s({ sessionId: 's1', zeroActionSession: true }),
    ]);
    expect(out.detected.zeroActionRecovery).toBe(true);
    expect(out.reciprocityBoost).toBeGreaterThan(1);
    expect(out.injectGentleNudge).toBe('who_liked_you');
  });

  it('detects ghostedSelf and surfaces easy_reply prompt', () => {
    const out = computeDiscoverPolicy([s({ ghostedSelf: true })]);
    expect(out.detected.ghostedSelf).toBe(true);
    expect(out.injectGentleNudge).toBe('easy_reply');
  });

  it('zero-action overrides ghostedSelf nudge', () => {
    const out = computeDiscoverPolicy([
      s({ sessionId: 's2', zeroActionSession: true, ghostedSelf: true }),
      s({ sessionId: 's1', zeroActionSession: true }),
    ]);
    expect(out.injectGentleNudge).toBe('who_liked_you');
  });
});
