import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicEngagementCadence,
  staleDtmTopics,
} from '../dtmTopicEngagementCadence';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

describe('dtmTopicEngagementCadence', () => {
  it('returns empty when now is non-finite', () => {
    expect(summarizeDtmTopicEngagementCadence([], Number.NaN)).toEqual([]);
  });

  it('returns empty when window is non-positive', () => {
    expect(
      summarizeDtmTopicEngagementCadence([], NOW, { windowMs: 0 })
    ).toEqual([]);
  });

  it('ignores unknown topics', () => {
    expect(
      summarizeDtmTopicEngagementCadence(
        [{ topic: 'banana', tsMs: NOW - DAY }],
        NOW
      )
    ).toEqual([]);
  });

  it('ignores out-of-window events', () => {
    const rows = summarizeDtmTopicEngagementCadence(
      [{ topic: 'values', tsMs: NOW - 365 * DAY }],
      NOW
    );
    expect(rows).toEqual([]);
  });

  it('ignores future-dated events', () => {
    const rows = summarizeDtmTopicEngagementCadence(
      [{ topic: 'values', tsMs: NOW + DAY }],
      NOW
    );
    expect(rows).toEqual([]);
  });

  it('single recent touch → occasional', () => {
    const rows = summarizeDtmTopicEngagementCadence(
      [{ topic: 'leisure', tsMs: NOW - DAY }],
      NOW
    );
    expect(rows[0].touches).toBe(1);
    expect(rows[0].band).toBe('occasional');
  });

  it('many recent touches → frequent or saturated', () => {
    const events = Array.from({ length: 30 }, (_, i) => ({
      topic: 'finance',
      tsMs: NOW - i * (DAY / 2),
    }));
    const rows = summarizeDtmTopicEngagementCadence(events, NOW);
    expect(['frequent', 'saturated']).toContain(rows[0].band);
    expect(rows[0].ratePerDay).toBeGreaterThan(1);
  });

  it('saturated when 3+ touches/day', () => {
    const events = Array.from({ length: 100 }, (_, i) => ({
      topic: 'social',
      tsMs: NOW - i * (DAY / 4),
    }));
    const rows = summarizeDtmTopicEngagementCadence(events, NOW);
    expect(rows[0].band).toBe('saturated');
  });

  it('regular band on moderate cadence', () => {
    // 14 touches across 28-day window with most recent at NOW-2d → 0.5/day → regular
    const events = Array.from({ length: 14 }, (_, i) => ({
      topic: 'family',
      tsMs: NOW - 2 * DAY - i * DAY,
    }));
    const rows = summarizeDtmTopicEngagementCadence(events, NOW);
    expect(rows[0].band).toBe('regular');
  });

  it('stale touches downgrade band to occasional regardless of count', () => {
    // 14 touches but all 20+ days old in a 28-day window → high count but stale
    const events = Array.from({ length: 14 }, (_, i) => ({
      topic: 'growth',
      tsMs: NOW - 20 * DAY - i * (DAY / 4),
    }));
    const rows = summarizeDtmTopicEngagementCadence(events, NOW);
    expect(rows[0].band).toBe('occasional');
    expect(rows[0].ageMs).toBeGreaterThan(14 * DAY);
  });

  it('respects custom window', () => {
    const rows = summarizeDtmTopicEngagementCadence(
      [{ topic: 'health', tsMs: NOW - 60 * DAY }],
      NOW,
      { windowMs: 90 * DAY }
    );
    expect(rows[0].touches).toBe(1);
  });

  it('preserves canonical topic order', () => {
    const rows = summarizeDtmTopicEngagementCadence(
      [
        { topic: 'future', tsMs: NOW - DAY },
        { topic: 'values', tsMs: NOW - DAY },
      ],
      NOW
    );
    expect(rows.map((r) => r.topic)).toEqual(['values', 'future']);
  });

  it('staleDtmTopics surfaces dormant/occasional', () => {
    const rows = summarizeDtmTopicEngagementCadence(
      [
        { topic: 'leisure', tsMs: NOW - DAY }, // occasional
        ...Array.from({ length: 100 }, (_, i) => ({
          topic: 'social' as const,
          tsMs: NOW - i * (DAY / 4),
        })), // saturated
      ],
      NOW
    );
    const stale = staleDtmTopics(rows);
    expect(stale).toContain('leisure');
    expect(stale).not.toContain('social');
  });
});
