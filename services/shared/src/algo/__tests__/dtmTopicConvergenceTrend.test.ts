import { describe, it, expect } from 'vitest';
import {
  computeDtmTopicConvergence,
  overallDtmConvergenceShift,
} from '../dtmTopicConvergenceTrend';

const PIVOT = 1_700_000_000_000;
const DAY = 86_400_000;

describe('dtmTopicConvergenceTrend', () => {
  it('returns empty when pivot is non-finite', () => {
    expect(computeDtmTopicConvergence([], { pivotMs: Number.NaN })).toEqual([]);
  });

  it('returns empty when no samples', () => {
    expect(computeDtmTopicConvergence([], { pivotMs: PIVOT })).toEqual([]);
  });

  it('ignores unknown topics', () => {
    expect(
      computeDtmTopicConvergence(
        [{ topic: 'banana', self: 0.5, partner: 0.2, tsMs: PIVOT - DAY }],
        { pivotMs: PIVOT }
      )
    ).toEqual([]);
  });

  it('drops samples with non-finite fields', () => {
    expect(
      computeDtmTopicConvergence(
        [{ topic: 'values', self: Number.NaN, partner: 0.5, tsMs: PIVOT - DAY }],
        { pivotMs: PIVOT }
      )
    ).toEqual([]);
  });

  it('marks topics with only early samples as unknown', () => {
    const rows = computeDtmTopicConvergence(
      [{ topic: 'family', self: 0.5, partner: -0.5, tsMs: PIVOT - DAY }],
      { pivotMs: PIVOT }
    );
    expect(rows[0].direction).toBe('unknown');
    expect(rows[0].earlyGap).toBe(0.5);
    expect(rows[0].recentGap).toBe(0);
    expect(rows[0].delta).toBe(0);
  });

  it('marks topics with only recent samples as unknown', () => {
    const rows = computeDtmTopicConvergence(
      [{ topic: 'finance', self: 0.5, partner: -0.5, tsMs: PIVOT + DAY }],
      { pivotMs: PIVOT }
    );
    expect(rows[0].direction).toBe('unknown');
  });

  it('converging when early gap larger than recent gap', () => {
    const rows = computeDtmTopicConvergence(
      [
        { topic: 'leisure', self: 1, partner: -1, tsMs: PIVOT - 2 * DAY },
        { topic: 'leisure', self: 1, partner: -1, tsMs: PIVOT - DAY },
        { topic: 'leisure', self: 0.5, partner: 0.4, tsMs: PIVOT + DAY },
        { topic: 'leisure', self: 0.4, partner: 0.5, tsMs: PIVOT + 2 * DAY },
      ],
      { pivotMs: PIVOT }
    );
    expect(rows[0].direction).toBe('converging');
    expect(rows[0].delta).toBeGreaterThan(0.1);
  });

  it('diverging when gap widens', () => {
    const rows = computeDtmTopicConvergence(
      [
        { topic: 'growth', self: 0.5, partner: 0.4, tsMs: PIVOT - DAY },
        { topic: 'growth', self: 1, partner: -1, tsMs: PIVOT + DAY },
      ],
      { pivotMs: PIVOT }
    );
    expect(rows[0].direction).toBe('diverging');
    expect(rows[0].delta).toBeLessThan(-0.1);
  });

  it('stable when delta within ±0.1', () => {
    const rows = computeDtmTopicConvergence(
      [
        { topic: 'health', self: 0.4, partner: 0.2, tsMs: PIVOT - DAY },
        { topic: 'health', self: 0.5, partner: 0.3, tsMs: PIVOT + DAY },
      ],
      { pivotMs: PIVOT }
    );
    expect(rows[0].direction).toBe('stable');
  });

  it('pivot is inclusive on the recent side', () => {
    const rows = computeDtmTopicConvergence(
      [
        { topic: 'social', self: 1, partner: -1, tsMs: PIVOT - DAY },
        { topic: 'social', self: 0.5, partner: 0.5, tsMs: PIVOT },
      ],
      { pivotMs: PIVOT }
    );
    expect(rows[0].direction).toBe('converging');
    expect(rows[0].recentGap).toBe(0);
  });

  it('clamps out-of-range values', () => {
    const rows = computeDtmTopicConvergence(
      [
        { topic: 'intimacy', self: 5, partner: -5, tsMs: PIVOT - DAY },
        { topic: 'intimacy', self: 5, partner: -5, tsMs: PIVOT + DAY },
      ],
      { pivotMs: PIVOT }
    );
    expect(rows[0].earlyGap).toBe(1);
    expect(rows[0].recentGap).toBe(1);
  });

  it('preserves canonical topic order', () => {
    const rows = computeDtmTopicConvergence(
      [
        { topic: 'future', self: 0.5, partner: 0.5, tsMs: PIVOT - DAY },
        { topic: 'future', self: 0.5, partner: 0.5, tsMs: PIVOT + DAY },
        { topic: 'values', self: 0.5, partner: 0.5, tsMs: PIVOT - DAY },
        { topic: 'values', self: 0.5, partner: 0.5, tsMs: PIVOT + DAY },
      ],
      { pivotMs: PIVOT }
    );
    expect(rows.map((r) => r.topic)).toEqual(['values', 'future']);
  });

  it('overallDtmConvergenceShift averages only scored rows', () => {
    const rows = computeDtmTopicConvergence(
      [
        // converging
        { topic: 'values', self: 1, partner: -1, tsMs: PIVOT - DAY },
        { topic: 'values', self: 0.2, partner: 0.2, tsMs: PIVOT + DAY },
        // unknown (only early)
        { topic: 'family', self: 0.5, partner: 0.5, tsMs: PIVOT - DAY },
      ],
      { pivotMs: PIVOT }
    );
    const shift = overallDtmConvergenceShift(rows);
    expect(shift).toBeGreaterThan(0);
  });

  it('overallDtmConvergenceShift returns 0 when nothing scored', () => {
    expect(overallDtmConvergenceShift([])).toBe(0);
  });
});
