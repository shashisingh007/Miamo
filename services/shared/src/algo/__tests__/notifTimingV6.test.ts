import { describe, it, expect } from 'vitest';
import {
  notifTimingScore, inQuietHours, pickBestSendHour, type NotifTimingInputs,
} from '../notifTimingV6';

const BASE: NotifTimingInputs = {
  sendHourLocal: 19,
  chronotype: 'evening',
  peakHours: [20, 21, 22],
  minutesSinceActive: 120,
  notifsLast4h: 0,
};

describe('inQuietHours', () => {
  it('detects standard 23-07 quiet band', () => {
    expect(inQuietHours(2, 23, 7)).toBe(true);
    expect(inQuietHours(23, 23, 7)).toBe(true);
    expect(inQuietHours(6, 23, 7)).toBe(true);
    expect(inQuietHours(7, 23, 7)).toBe(false);
    expect(inQuietHours(22, 23, 7)).toBe(false);
  });
  it('handles non-wrapping band', () => {
    expect(inQuietHours(13, 12, 14)).toBe(true);
    expect(inQuietHours(14, 12, 14)).toBe(false);
  });
  it('start == end means no quiet band', () => {
    expect(inQuietHours(2, 5, 5)).toBe(false);
  });
});

describe('notifTimingScore', () => {
  it('scores high in peak hour with no over-cap', () => {
    const out = notifTimingScore({ ...BASE, sendHourLocal: 20 });
    expect(out.score).toBeGreaterThan(0.5);
    expect(out.parts.chronoFit).toBe(1.0);
  });

  it('scores 0 inside quiet hours', () => {
    const out = notifTimingScore({ ...BASE, sendHourLocal: 2 });
    expect(out.score).toBe(0);
    expect(out.parts.quietHourFit).toBe(0);
  });

  it('over-cap (>=3 notifs in 4h) drives score to 0', () => {
    const out = notifTimingScore({ ...BASE, sendHourLocal: 20, notifsLast4h: 3 });
    expect(out.score).toBe(0);
  });

  it('exactly 2 notifs in 4h halves the score', () => {
    const open = notifTimingScore({ ...BASE, sendHourLocal: 20, notifsLast4h: 0 });
    const half = notifTimingScore({ ...BASE, sendHourLocal: 20, notifsLast4h: 2 });
    expect(half.parts.capFit).toBe(0.5);
    expect(half.score).toBeCloseTo(open.score * 0.5, 5);
  });

  it('falls back to chronotype defaults when peakHours empty', () => {
    const morning = notifTimingScore({
      ...BASE, peakHours: [], chronotype: 'morning', sendHourLocal: 9, minutesSinceActive: 120,
    });
    expect(morning.parts.chronoFit).toBe(1.0);
  });

  it('mixed chronotype prefers midday-evening band', () => {
    const out = notifTimingScore({
      ...BASE, peakHours: [], chronotype: 'mixed', sendHourLocal: 15, minutesSinceActive: 120,
    });
    expect(out.parts.chronoFit).toBe(0.7);
  });

  it('within ±2h of a peak hour gets 0.6 chronoFit', () => {
    const out = notifTimingScore({ ...BASE, sendHourLocal: 18 });
    expect(out.parts.chronoFit).toBe(0.6);
  });

  it('outside ±2h of any peak gets 0.3 chronoFit', () => {
    const out = notifTimingScore({ ...BASE, sendHourLocal: 14 });
    expect(out.parts.chronoFit).toBe(0.3);
  });

  it('recencyFit peaks in 1-4h window', () => {
    const sweet = notifTimingScore({ ...BASE, sendHourLocal: 20, minutesSinceActive: 120 });
    const old   = notifTimingScore({ ...BASE, sendHourLocal: 20, minutesSinceActive: 5000 });
    expect(sweet.parts.recencyFit).toBeGreaterThan(old.parts.recencyFit);
  });

  it('null minutesSinceActive yields neutral 0.5 recencyFit', () => {
    const out = notifTimingScore({ ...BASE, sendHourLocal: 20, minutesSinceActive: null });
    expect(out.parts.recencyFit).toBe(0.5);
  });

  it('honours custom quiet-hour overrides', () => {
    const out = notifTimingScore({
      ...BASE, sendHourLocal: 13, quietStartHour: 12, quietEndHour: 14,
    });
    expect(out.score).toBe(0);
  });
});

describe('pickBestSendHour', () => {
  it('picks the highest-scoring hour from a window', () => {
    const best = pickBestSendHour([18, 20, 21, 22], {
      chronotype: 'evening', peakHours: [20, 21], minutesSinceActive: 120, notifsLast4h: 0,
    });
    expect([20, 21]).toContain(best?.hour);
  });

  it('returns null when all candidates are below threshold', () => {
    const best = pickBestSendHour([2, 3, 4], {
      chronotype: 'morning', peakHours: [9, 10], minutesSinceActive: 120, notifsLast4h: 0,
    });
    expect(best).toBeNull();
  });

  it('returns null when all candidates are inside quiet hours', () => {
    const best = pickBestSendHour([23, 0, 1, 6], {
      chronotype: 'evening', peakHours: [22], minutesSinceActive: 60, notifsLast4h: 0,
    });
    expect(best).toBeNull();
  });
});
