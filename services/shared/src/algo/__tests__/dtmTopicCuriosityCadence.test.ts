import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicCuriosityCadence,
  staleDtmTopics,
} from '../dtmTopicCuriosityCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCuriosityCadence', () => {
  it('returns 16 canonical topics', () => {
    const rows = summarizeDtmTopicCuriosityCadence([]);
    expect(rows).toHaveLength(16);
    expect(rows.map((r) => r.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested when empty', () => {
    const rows = summarizeDtmTopicCuriosityCadence([]);
    expect(rows.every((r) => r.band === 'untested')).toBe(true);
  });

  it('single question => curious (single-event span = 1hr)', () => {
    const rows = summarizeDtmTopicCuriosityCadence([
      { topic: 'growth', timestampMs: 0, kind: 'question' },
    ]);
    expect(rows.find((r) => r.topic === 'growth')!.band).toBe('curious');
  });

  it('only statements => stale', () => {
    const rows = summarizeDtmTopicCuriosityCadence([
      { topic: 'growth', timestampMs: 0, kind: 'statement' },
      { topic: 'growth', timestampMs: 60_000, kind: 'statement' },
    ]);
    expect(rows.find((r) => r.topic === 'growth')!.band).toBe('stale');
  });

  it('only dismissals => stale', () => {
    const rows = summarizeDtmTopicCuriosityCadence([
      { topic: 'growth', timestampMs: 0, kind: 'dismiss' },
    ]);
    expect(rows.find((r) => r.topic === 'growth')!.band).toBe('stale');
  });

  it('dense follow-ups => investigative', () => {
    const rows = summarizeDtmTopicCuriosityCadence([
      { topic: 'growth', timestampMs: 0, kind: 'question' },
      { topic: 'growth', timestampMs: 60_000, kind: 'follow-up' },
      { topic: 'growth', timestampMs: 120_000, kind: 'follow-up' },
      { topic: 'growth', timestampMs: 180_000, kind: 'follow-up' },
    ]);
    const r = rows.find((x) => x.topic === 'growth')!;
    expect(r.band).toBe('investigative');
    expect(r.followUpRatio).toBeGreaterThanOrEqual(0.25);
  });

  it('counts n per topic', () => {
    const rows = summarizeDtmTopicCuriosityCadence([
      { topic: 'growth', timestampMs: 0, kind: 'question' },
      { topic: 'growth', timestampMs: 1, kind: 'statement' },
      { topic: 'family', timestampMs: 0, kind: 'question' },
    ]);
    expect(rows.find((r) => r.topic === 'growth')!.n).toBe(2);
    expect(rows.find((r) => r.topic === 'family')!.n).toBe(1);
  });

  it('ignores unknown topic', () => {
    const rows = summarizeDtmTopicCuriosityCadence([
      { topic: 'nope', timestampMs: 0, kind: 'question' },
    ]);
    expect(rows.every((r) => r.n === 0)).toBe(true);
  });

  it('followUpRatio in [0,1]', () => {
    const rows = summarizeDtmTopicCuriosityCadence([
      { topic: 'growth', timestampMs: 0, kind: 'question' },
      { topic: 'growth', timestampMs: 60_000, kind: 'follow-up' },
    ]);
    for (const r of rows) {
      expect(r.followUpRatio).toBeGreaterThanOrEqual(0);
      expect(r.followUpRatio).toBeLessThanOrEqual(1);
    }
  });

  it('questionsPerHour is non-negative', () => {
    const rows = summarizeDtmTopicCuriosityCadence([
      { topic: 'growth', timestampMs: 0, kind: 'question' },
      { topic: 'growth', timestampMs: 3_600_000, kind: 'question' },
    ]);
    for (const r of rows) expect(r.questionsPerHour).toBeGreaterThanOrEqual(0);
  });

  it('spread questions over 10hr => sparse', () => {
    const events = [];
    for (let i = 0; i < 3; i++) {
      events.push({ topic: 'growth', timestampMs: i * 10 * 3_600_000, kind: 'question' as const });
    }
    const rows = summarizeDtmTopicCuriosityCadence(events);
    expect(rows.find((r) => r.topic === 'growth')!.band).toBe('sparse');
  });

  it('staleDtmTopics filters', () => {
    const rows = summarizeDtmTopicCuriosityCadence([
      { topic: 'growth', timestampMs: 0, kind: 'statement' },
      { topic: 'family', timestampMs: 0, kind: 'question' },
    ]);
    const s = staleDtmTopics(rows);
    expect(s).toHaveLength(1);
    expect(s[0].topic).toBe('growth');
  });

  it('ignores unknown kind silently (n increments though)', () => {
    const rows = summarizeDtmTopicCuriosityCadence([
      { topic: 'growth', timestampMs: 0, kind: 'wat' as any },
    ]);
    expect(rows.find((r) => r.topic === 'growth')!.questionsPerHour).toBe(0);
  });

  it('canonical order preserved', () => {
    const rows = summarizeDtmTopicCuriosityCadence([
      { topic: 'future', timestampMs: 0, kind: 'question' },
      { topic: 'values', timestampMs: 0, kind: 'statement' },
    ]);
    expect(rows[0].topic).toBe('values');
    expect(rows[15].topic).toBe('future');
  });

  it('two simultaneous questions => uses fallback span', () => {
    const rows = summarizeDtmTopicCuriosityCadence([
      { topic: 'growth', timestampMs: 100, kind: 'question' },
      { topic: 'growth', timestampMs: 100, kind: 'question' },
    ]);
    expect(rows.find((r) => r.topic === 'growth')!.questionsPerHour).toBeGreaterThan(0);
  });
});
