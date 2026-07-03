import { describe, it, expect } from 'vitest';
import {
  creditForAction,
  isRageLike,
  rageLikeAudit,
  meetsDailyTop10Threshold,
  applyPremiumMultiplier,
  CREDIT_RULES,
  RAGE_LIKE_THRESHOLDS,
  DAILY_TOP10_CREDIT_THRESHOLD,
  PREMIUM_MULTIPLIER,
  MAX_PREMIUM_MULTIPLIER,
} from '../v8/exposureCredits';

describe('v8/exposureCredits — creditForAction base slots', () => {
  it('sticky_like → 1', () => {
    expect(creditForAction('sticky_like', false).slots).toBe(CREDIT_RULES.stickyLikeSlots);
    expect(creditForAction('sticky_like', false).slots).toBe(1);
  });
  it('message_reply → 3', () => {
    expect(creditForAction('message_reply', false).slots).toBe(CREDIT_RULES.messageReplySlots);
  });
  it('dtm_completed → 5', () => {
    expect(creditForAction('dtm_completed', false).slots).toBe(CREDIT_RULES.dtmCompletedSlots);
  });
  it('bio_expand_long → 0.5', () => {
    expect(creditForAction('bio_expand_long', false).slots).toBe(CREDIT_RULES.bioExpandSlots);
  });
  it('view_long → 0.5', () => {
    expect(creditForAction('view_long', false).slots).toBe(CREDIT_RULES.viewLongSlots);
  });
  it('move_accepted → 2', () => {
    expect(creditForAction('move_accepted', false).slots).toBe(CREDIT_RULES.moveAcceptedSlots);
  });
  it('passes through refId when supplied', () => {
    const e = creditForAction('sticky_like', false, 'activity-abc');
    expect(e.refId).toBe('activity-abc');
    expect(e.reason).toBe('sticky_like');
  });
  it('omits refId when not supplied', () => {
    const e = creditForAction('sticky_like', false);
    expect(e.refId).toBeUndefined();
  });
});

describe('v8/exposureCredits — premium multiplier', () => {
  it('non-premium → ×1.0', () => {
    expect(creditForAction('dtm_completed', false).slots).toBe(5);
  });
  it('premium → ×1.5', () => {
    expect(creditForAction('dtm_completed', true).slots).toBeCloseTo(5 * PREMIUM_MULTIPLIER, 6);
    expect(creditForAction('dtm_completed', true).slots).toBe(7.5);
  });
  it('premium multiplier never exceeds 2× ceiling', () => {
    // Forcing-function: even if the constant were tampered with, the Math.min in applyPremiumMultiplier holds the line.
    const base = 10;
    expect(applyPremiumMultiplier(base, true)).toBeLessThanOrEqual(base * MAX_PREMIUM_MULTIPLIER);
    expect(applyPremiumMultiplier(base, true)).toBe(base * PREMIUM_MULTIPLIER);
  });
  it('applyPremiumMultiplier returns base unchanged for non-premium', () => {
    expect(applyPremiumMultiplier(7, false)).toBe(7);
  });
});

describe('v8/exposureCredits — isRageLike', () => {
  it('20 likes in 60s → NOT rage (boundary)', () => {
    const now = 1_000_000;
    const ts = Array.from({ length: 20 }, (_, i) => now - i * 1000); // 20 likes, one per second
    expect(isRageLike(ts, now)).toBe(false);
  });
  it('21 likes in 60s → rage', () => {
    const now = 1_000_000;
    const ts = Array.from({ length: 21 }, (_, i) => now - i * 1000);
    expect(isRageLike(ts, now)).toBe(true);
  });
  it('51 likes spread across the hour → rage (per-hour cap)', () => {
    const now = 1_000_000;
    // 51 likes spread evenly so none clusters under the per-minute cap.
    const ts = Array.from({ length: 51 }, (_, i) => now - i * 60_000); // one per minute
    expect(isRageLike(ts, now)).toBe(true);
  });
  it('empty timestamps → not rage', () => {
    expect(isRageLike([], 1_000_000)).toBe(false);
  });
  it('uses thresholds constants', () => {
    expect(RAGE_LIKE_THRESHOLDS.perMinute).toBe(20);
    expect(RAGE_LIKE_THRESHOLDS.perHour).toBe(50);
  });
  it('rageLikeAudit → 0 slots, correct reason', () => {
    const a = rageLikeAudit('like-1');
    expect(a.slots).toBe(0);
    expect(a.reason).toBe('rage_like_zero');
    expect(a.refId).toBe('like-1');
  });
});

describe('v8/exposureCredits — meetsDailyTop10Threshold', () => {
  it('non-premium: exactly at threshold → true', () => {
    expect(meetsDailyTop10Threshold(DAILY_TOP10_CREDIT_THRESHOLD, false)).toBe(true);
  });
  it('non-premium: just below threshold → false', () => {
    expect(meetsDailyTop10Threshold(DAILY_TOP10_CREDIT_THRESHOLD - 0.01, false)).toBe(false);
  });
  it('premium: 20 credits unlocks (threshold scaled 30/1.5 = 20)', () => {
    expect(meetsDailyTop10Threshold(20, true)).toBe(true);
  });
  it('premium: 19.99 credits does NOT unlock', () => {
    expect(meetsDailyTop10Threshold(19.99, true)).toBe(false);
  });
  it('zero credits never unlocks for anyone', () => {
    expect(meetsDailyTop10Threshold(0, false)).toBe(false);
    expect(meetsDailyTop10Threshold(0, true)).toBe(false);
  });
});

describe('v8/exposureCredits — determinism', () => {
  it('creditForAction is pure: same input → same output', () => {
    const a = creditForAction('message_reply', true, 'ref-x');
    const b = creditForAction('message_reply', true, 'ref-x');
    expect(a).toEqual(b);
  });
  it('isRageLike ignores future timestamps gracefully', () => {
    const now = 1_000_000;
    const future = now + 10_000;
    // 21 future timestamps should NOT trigger because they get filtered out.
    const ts = Array.from({ length: 21 }, () => future);
    expect(isRageLike(ts, now)).toBe(false);
  });
});
