import { describe, it, expect } from 'vitest';
import {
  decayDtm,
  recordTopicAsk,
  resetOnAnswer,
  topicAskPenalty,
} from '../dtmFatigueCounter';

const NOW = 1_700_000_000_000;
const H = 3_600_000;

describe('dtmFatigueCounter — decayDtm', () => {
  it('halves after one half-life (default 72h)', () => {
    const r = decayDtm({ count: 4, updatedAtMs: NOW }, NOW + 72 * H);
    expect(r.count).toBeCloseTo(2, 6);
  });
  it('is a no-op when dt = 0', () => {
    const r = decayDtm({ count: 3, updatedAtMs: NOW }, NOW);
    expect(r.count).toBe(3);
  });
  it('does not go negative when nowMs is earlier', () => {
    const r = decayDtm({ count: 2, updatedAtMs: NOW }, NOW - 10 * H);
    expect(r.count).toBe(2);
  });
});

describe('dtmFatigueCounter — recordTopicAsk', () => {
  it('seeds at 1 when rec is null', () => {
    const r = recordTopicAsk(null, NOW);
    expect(r.count).toBe(1);
  });
  it('decays then +1 on subsequent asks', () => {
    const r0 = recordTopicAsk(null, NOW);
    const r1 = recordTopicAsk(r0, NOW + 72 * H);
    expect(r1.count).toBeCloseTo(1.5, 6); // 0.5 + 1
  });
});

describe('dtmFatigueCounter — resetOnAnswer', () => {
  it('resets count to 0 at the supplied timestamp', () => {
    expect(resetOnAnswer(NOW)).toEqual({ count: 0, updatedAtMs: NOW });
  });
});

describe('dtmFatigueCounter — topicAskPenalty', () => {
  it('returns 0 for null record', () => {
    expect(topicAskPenalty(null, NOW)).toBe(0);
  });
  it('scales linearly with decayed count (default step=0.05)', () => {
    expect(topicAskPenalty({ count: 3, updatedAtMs: NOW }, NOW)).toBeCloseTo(0.15, 6);
  });
  it('caps at maxPenalty (default 0.20)', () => {
    expect(topicAskPenalty({ count: 100, updatedAtMs: NOW }, NOW)).toBe(0.20);
  });
  it('honours custom maxPenalty / step', () => {
    expect(
      topicAskPenalty({ count: 4, updatedAtMs: NOW }, NOW, { step: 0.1, maxPenalty: 0.5 }),
    ).toBeCloseTo(0.4, 6);
  });
  it('applies decay before computing penalty', () => {
    const p = topicAskPenalty({ count: 4, updatedAtMs: NOW }, NOW + 72 * H);
    expect(p).toBeCloseTo(0.10, 6); // decays to 2, * 0.05
  });
});
