import { describe, it, expect } from 'vitest';
import { computeDtmTopicMomentum } from '../dtmTopicMomentum';

const DAY = 24 * 60 * 60 * 1000;

describe('dtmTopicMomentum', () => {
  const NOW = 1_700_000_000_000;

  it('empty events -> empty list', () => {
    expect(computeDtmTopicMomentum([], { nowMs: NOW })).toEqual([]);
  });

  it('topic with only recent activity -> momentum 1', () => {
    const r = computeDtmTopicMomentum(
      [{ topicKey: 'values', weight: 1, atMs: NOW - 1 * DAY }],
      { nowMs: NOW },
    );
    expect(r).toHaveLength(1);
    expect(r[0].topicKey).toBe('values');
    expect(r[0].momentum).toBe(1);
  });

  it('topic with only prior activity -> momentum -1', () => {
    const r = computeDtmTopicMomentum(
      [{ topicKey: 'family', weight: 2, atMs: NOW - 20 * DAY }],
      { nowMs: NOW },
    );
    expect(r[0].momentum).toBe(-1);
  });

  it('equal recent and prior -> momentum 0', () => {
    const r = computeDtmTopicMomentum(
      [
        { topicKey: 'intimacy', weight: 1, atMs: NOW - 1 * DAY },
        { topicKey: 'intimacy', weight: 1, atMs: NOW - 20 * DAY },
      ],
      { nowMs: NOW },
    );
    expect(r[0].momentum).toBe(0);
    expect(r[0].recent).toBe(1);
    expect(r[0].prior).toBe(1);
  });

  it('ignores events older than 2*window', () => {
    const r = computeDtmTopicMomentum(
      [{ topicKey: 'growth', weight: 1, atMs: NOW - 90 * DAY }],
      { nowMs: NOW },
    );
    expect(r).toEqual([]);
  });

  it('rejects unknown topic keys', () => {
    const r = computeDtmTopicMomentum(
      [{ topicKey: 'bogus' as any, weight: 1, atMs: NOW }],
      { nowMs: NOW },
    );
    expect(r).toEqual([]);
  });

  it('ignores zero / negative weights', () => {
    const r = computeDtmTopicMomentum(
      [
        { topicKey: 'values', weight: 0, atMs: NOW - 1 * DAY },
        { topicKey: 'values', weight: -3, atMs: NOW - 1 * DAY },
      ],
      { nowMs: NOW },
    );
    expect(r).toEqual([]);
  });

  it('honours custom windowMs', () => {
    const r = computeDtmTopicMomentum(
      [
        { topicKey: 'leisure', weight: 1, atMs: NOW - 3 * DAY },
        { topicKey: 'leisure', weight: 1, atMs: NOW - 5 * DAY },
      ],
      { nowMs: NOW, windowMs: 4 * DAY },
    );
    expect(r[0].recent).toBe(1);
    expect(r[0].prior).toBe(1);
  });

  it('sorts by |momentum| desc', () => {
    const r = computeDtmTopicMomentum(
      [
        { topicKey: 'values', weight: 1, atMs: NOW - 1 * DAY },     // mom 1
        { topicKey: 'family', weight: 1, atMs: NOW - 1 * DAY },     // tied
        { topicKey: 'family', weight: 1, atMs: NOW - 20 * DAY },    // mom 0
      ],
      { nowMs: NOW },
    );
    expect(r[0].topicKey).toBe('values');
    expect(r[r.length - 1].topicKey).toBe('family');
  });

  it('skips malformed events without throwing', () => {
    const r = computeDtmTopicMomentum(
      [
        null as any,
        { topicKey: 'values', weight: 1, atMs: 'x' as any },
        { topicKey: 'values', weight: 1, atMs: NOW - 1 * DAY },
      ],
      { nowMs: NOW },
    );
    expect(r).toHaveLength(1);
  });
});
