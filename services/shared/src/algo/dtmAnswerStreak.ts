/**
 * dtmAnswerStreak \u2014 DTM Phase 16 daily-streak counter (pure).
 *
 * Given a sorted-or-unsorted list of session timestamps (ms) and a
 * "today" anchor, computes the current consecutive-day answer streak
 * plus the user's best historical streak. Day boundaries are derived
 * from a fixed UTC-offset to keep behaviour identical across machines.
 */
const MS_PER_DAY = 86_400_000;

export type DtmStreakInputs = {
  answerTimestampsMs: number[];
  nowMs: number;
  tzOffsetMin?: number; // default 0 (UTC)
};

export type DtmStreakResult = {
  currentStreakDays: number;
  longestStreakDays: number;
  lastAnswerDayIndex: number | null;
};

function dayIndex(ms: number, tzOffsetMin: number): number {
  return Math.floor((ms + tzOffsetMin * 60_000) / MS_PER_DAY);
}

export function computeDtmStreak(inp: DtmStreakInputs): DtmStreakResult {
  const tz = inp.tzOffsetMin ?? 0;
  if (!inp.answerTimestampsMs.length) {
    return { currentStreakDays: 0, longestStreakDays: 0, lastAnswerDayIndex: null };
  }
  // Unique days, ascending
  const days = Array.from(new Set(inp.answerTimestampsMs.map(t => dayIndex(t, tz)))).sort((a, b) => a - b);

  // Longest run of consecutive days
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] === days[i - 1] + 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak: walk backwards from `today` (or `today-1` if no entry today yet).
  const today = dayIndex(inp.nowMs, tz);
  const lastDay = days[days.length - 1];
  let current = 0;
  if (lastDay === today || lastDay === today - 1) {
    const set = new Set(days);
    let d = lastDay;
    while (set.has(d)) { current++; d--; }
  }

  return {
    currentStreakDays: current,
    longestStreakDays: Math.max(longest, current),
    lastAnswerDayIndex: lastDay,
  };
}
