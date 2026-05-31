import { describe, it, expect } from 'vitest';
import { computeDtmStreak } from '../dtmAnswerStreak';

const DAY = 86_400_000;
// Anchor "today" at a known UTC midnight + 12h so we're well inside a day.
const TODAY = 1_700_000_000_000;
const TODAY_DAY = Math.floor(TODAY / DAY);

function tsAtDay(offset: number): number {
  return (TODAY_DAY + offset) * DAY + 3_600_000; // 01:00 UTC of that day
}

describe('dtmAnswerStreak', () => {
  it('empty input -> zeros', () => {
    expect(computeDtmStreak({ answerTimestampsMs: [], nowMs: TODAY }))
      .toEqual({ currentStreakDays: 0, longestStreakDays: 0, lastAnswerDayIndex: null });
  });

  it('single answer today -> current=1, longest=1', () => {
    const r = computeDtmStreak({ answerTimestampsMs: [TODAY], nowMs: TODAY });
    expect(r.currentStreakDays).toBe(1);
    expect(r.longestStreakDays).toBe(1);
  });

  it('answered yesterday but not today -> still counts as current', () => {
    const r = computeDtmStreak({ answerTimestampsMs: [tsAtDay(-1)], nowMs: TODAY });
    expect(r.currentStreakDays).toBe(1);
  });

  it('gap of >1 day breaks current streak', () => {
    const r = computeDtmStreak({ answerTimestampsMs: [tsAtDay(-3)], nowMs: TODAY });
    expect(r.currentStreakDays).toBe(0);
    expect(r.longestStreakDays).toBe(1);
  });

  it('5 consecutive days ending today -> current=5', () => {
    const ts = [-4, -3, -2, -1, 0].map(tsAtDay);
    const r = computeDtmStreak({ answerTimestampsMs: ts, nowMs: TODAY });
    expect(r.currentStreakDays).toBe(5);
    expect(r.longestStreakDays).toBe(5);
  });

  it('historic longer run is retained as longest', () => {
    const ts = [
      ...[-20, -19, -18, -17, -16, -15, -14].map(tsAtDay), // run of 7
      ...[-2, -1, 0].map(tsAtDay),                          // current run of 3
    ];
    const r = computeDtmStreak({ answerTimestampsMs: ts, nowMs: TODAY });
    expect(r.currentStreakDays).toBe(3);
    expect(r.longestStreakDays).toBe(7);
  });

  it('multiple answers same day collapse to one', () => {
    const ts = [TODAY, TODAY + 60_000, TODAY + 3_600_000];
    const r = computeDtmStreak({ answerTimestampsMs: ts, nowMs: TODAY });
    expect(r.currentStreakDays).toBe(1);
    expect(r.longestStreakDays).toBe(1);
  });

  it('unsorted input is handled', () => {
    const ts = [0, -2, -1].map(tsAtDay);
    const r = computeDtmStreak({ answerTimestampsMs: ts, nowMs: TODAY });
    expect(r.currentStreakDays).toBe(3);
  });

  it('tzOffset shifts day boundary', () => {
    // Late-night Pacific timestamp (UTC+0 puts it on next day) \u2014 with
    // tzOffsetMin = -480 (PST), it stays on the original day.
    const lateNight = TODAY - 600_000; // 10 minutes before UTC midnight
    const r = computeDtmStreak({ answerTimestampsMs: [lateNight], nowMs: TODAY, tzOffsetMin: -480 });
    expect(r.currentStreakDays).toBeGreaterThanOrEqual(1);
  });

  it('lastAnswerDayIndex matches the most recent day', () => {
    const r = computeDtmStreak({ answerTimestampsMs: [tsAtDay(-5), tsAtDay(-1)], nowMs: TODAY });
    expect(r.lastAnswerDayIndex).toBe(TODAY_DAY - 1);
  });
});
