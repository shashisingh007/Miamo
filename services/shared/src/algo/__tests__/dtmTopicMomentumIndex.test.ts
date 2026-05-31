import { describe, it, expect } from 'vitest';
import {
  computeDtmTopicMomentum,
  topDtmMomentumTopics,
} from '../dtmTopicMomentumIndex';

const DAY = 86_400_000;
const NOW = 1_700_000_000_000;

describe('dtmTopicMomentumIndex', () => {
  it('returns empty when now is non-finite', () => {
    expect(computeDtmTopicMomentum([], Number.NaN)).toEqual([]);
  });

  it('ignores samples on unknown topics', () => {
    const rows = computeDtmTopicMomentum(
      [{ topic: 'banana', value: 0.5, tsMs: NOW - DAY }],
      NOW
    );
    expect(rows).toEqual([]);
  });

  it('accelerating when short mean > long mean by threshold', () => {
    const rows = computeDtmTopicMomentum(
      [
        { topic: 'growth', value: -0.5, tsMs: NOW - 25 * DAY },
        { topic: 'growth', value: -0.5, tsMs: NOW - 20 * DAY },
        { topic: 'growth', value: 0.6, tsMs: NOW - 2 * DAY },
        { topic: 'growth', value: 0.8, tsMs: NOW - 1 * DAY },
      ],
      NOW
    );
    expect(rows[0].direction).toBe('accelerating');
    expect(rows[0].momentum).toBeGreaterThan(0.1);
  });

  it('decelerating when short mean < long mean by threshold', () => {
    const rows = computeDtmTopicMomentum(
      [
        { topic: 'leisure', value: 0.8, tsMs: NOW - 25 * DAY },
        { topic: 'leisure', value: 0.6, tsMs: NOW - 20 * DAY },
        { topic: 'leisure', value: -0.3, tsMs: NOW - 2 * DAY },
        { topic: 'leisure', value: -0.5, tsMs: NOW - 1 * DAY },
      ],
      NOW
    );
    expect(rows[0].direction).toBe('decelerating');
    expect(rows[0].momentum).toBeLessThan(-0.1);
  });

  it('steady when |momentum| within threshold', () => {
    const rows = computeDtmTopicMomentum(
      [
        { topic: 'values', value: 0.5, tsMs: NOW - 20 * DAY },
        { topic: 'values', value: 0.5, tsMs: NOW - 1 * DAY },
      ],
      NOW
    );
    expect(rows[0].direction).toBe('steady');
    expect(rows[0].momentum).toBe(0);
  });

  it('unknown direction when no short-window samples exist', () => {
    const rows = computeDtmTopicMomentum(
      [{ topic: 'family', value: 0.4, tsMs: NOW - 20 * DAY }],
      NOW
    );
    expect(rows[0].direction).toBe('unknown');
    expect(rows[0].shortMean).toBe(0);
    expect(rows[0].longMean).toBe(0.4);
  });

  it('excludes samples older than long window', () => {
    const rows = computeDtmTopicMomentum(
      [{ topic: 'health', value: 0.9, tsMs: NOW - 100 * DAY }],
      NOW
    );
    expect(rows).toEqual([]);
  });

  it('ignores future-dated samples (negative age)', () => {
    const rows = computeDtmTopicMomentum(
      [
        { topic: 'finance', value: 0.5, tsMs: NOW + DAY },
        { topic: 'finance', value: 0.5, tsMs: NOW - DAY },
      ],
      NOW
    );
    expect(rows[0].longMean).toBe(0.5);
  });

  it('clamps out-of-range values', () => {
    const rows = computeDtmTopicMomentum(
      [
        { topic: 'intimacy', value: 5, tsMs: NOW - 1 * DAY },
        { topic: 'intimacy', value: -5, tsMs: NOW - 20 * DAY },
      ],
      NOW
    );
    expect(rows[0].shortMean).toBe(1);
    // longMean averages clamped values across all samples in long window (both included)
    expect(rows[0].longMean).toBe(0);
  });

  it('respects custom threshold', () => {
    const rows = computeDtmTopicMomentum(
      [
        { topic: 'social', value: 0.2, tsMs: NOW - 20 * DAY },
        { topic: 'social', value: 0.35, tsMs: NOW - 1 * DAY },
      ],
      NOW,
      { threshold: 0.05 }
    );
    expect(rows[0].direction).toBe('accelerating');
  });

  it('topDtmMomentumTopics ranks by absolute momentum', () => {
    const rows = computeDtmTopicMomentum(
      [
        { topic: 'values', value: 0.5, tsMs: NOW - 20 * DAY },
        { topic: 'values', value: 0.55, tsMs: NOW - 1 * DAY },
        { topic: 'growth', value: -0.6, tsMs: NOW - 20 * DAY },
        { topic: 'growth', value: 0.6, tsMs: NOW - 1 * DAY },
      ],
      NOW
    );
    const top = topDtmMomentumTopics(rows, 1);
    expect(top[0].topic).toBe('growth');
  });

  it('topDtmMomentumTopics handles k<=0', () => {
    expect(topDtmMomentumTopics([], 0)).toEqual([]);
    expect(topDtmMomentumTopics([], -3)).toEqual([]);
  });
});
