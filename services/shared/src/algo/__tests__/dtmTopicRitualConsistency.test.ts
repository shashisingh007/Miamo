import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicRitualConsistency,
  devotedRitualDtmTopics,
} from '../dtmTopicRitualConsistency';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const DAY = 24 * 60 * 60 * 1000;

describe('dtmTopicRitualConsistency', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicRitualConsistency([], 30 * DAY).map((r) => r.topic)).toEqual([
      ...DTM_TOPIC_KEYS,
    ]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicRitualConsistency([], 30 * DAY)) {
      expect(r.band).toBe('untested');
    }
  });

  it('rejects bad window', () => {
    expect(() => summarizeDtmTopicRitualConsistency([], 0)).toThrow();
    expect(() => summarizeDtmTopicRitualConsistency([], -1)).toThrow();
    expect(() => summarizeDtmTopicRitualConsistency([], NaN)).toThrow();
  });

  it('single occurrence => absent', () => {
    const r = summarizeDtmTopicRitualConsistency(
      [{ topic: 'family', ritualKey: 'sunday-call', occurredAt: 0 }],
      30 * DAY
    );
    expect(r.find((x) => x.topic === 'family')!.band).toBe('absent');
  });

  it('daily rhythm => devoted', () => {
    const evs: any[] = [];
    for (let i = 0; i < 30; i++)
      evs.push({ topic: 'communication', ritualKey: 'morning-checkin', occurredAt: i * DAY });
    const r = summarizeDtmTopicRitualConsistency(evs, 30 * DAY);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('devoted');
  });

  it('highly irregular intervals => sporadic or absent', () => {
    const evs: any[] = [
      { topic: 'leisure', ritualKey: 'date-night', occurredAt: 0 },
      { topic: 'leisure', ritualKey: 'date-night', occurredAt: DAY },
      { topic: 'leisure', ritualKey: 'date-night', occurredAt: 25 * DAY },
    ];
    const r = summarizeDtmTopicRitualConsistency(evs, 30 * DAY);
    const l = r.find((x) => x.topic === 'leisure')!;
    expect(['sporadic', 'absent']).toContain(l.band);
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicRitualConsistency(
      [{ topic: 'nope', ritualKey: 'x', occurredAt: 0 }],
      DAY
    );
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('ignores empty ritualKey', () => {
    const r = summarizeDtmTopicRitualConsistency(
      [{ topic: 'values', ritualKey: '', occurredAt: 0 }],
      DAY
    );
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('ignores non-finite occurredAt', () => {
    const r = summarizeDtmTopicRitualConsistency(
      [{ topic: 'values', ritualKey: 'x', occurredAt: NaN }],
      DAY
    );
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('counts multiple ritual keys per topic', () => {
    const r = summarizeDtmTopicRitualConsistency(
      [
        { topic: 'intimacy', ritualKey: 'a', occurredAt: 0 },
        { topic: 'intimacy', ritualKey: 'a', occurredAt: DAY },
        { topic: 'intimacy', ritualKey: 'b', occurredAt: 0 },
        { topic: 'intimacy', ritualKey: 'b', occurredAt: DAY },
      ],
      30 * DAY
    );
    const i = r.find((x) => x.topic === 'intimacy')!;
    expect(i.rituals).toBe(2);
    expect(i.occurrences).toBe(4);
  });

  it('weekly cadence => rhythmic', () => {
    const evs: any[] = [];
    for (let i = 0; i < 5; i++)
      evs.push({ topic: 'social', ritualKey: 'friday-dinner', occurredAt: i * 7 * DAY });
    const r = summarizeDtmTopicRitualConsistency(evs, 35 * DAY);
    expect(['rhythmic', 'sporadic']).toContain(r.find((x) => x.topic === 'social')!.band);
  });

  it('meanIntervalDays reasonable', () => {
    const evs: any[] = [
      { topic: 'health', ritualKey: 'gym', occurredAt: 0 },
      { topic: 'health', ritualKey: 'gym', occurredAt: DAY },
      { topic: 'health', ritualKey: 'gym', occurredAt: 2 * DAY },
    ];
    const r = summarizeDtmTopicRitualConsistency(evs, 7 * DAY);
    expect(r.find((x) => x.topic === 'health')!.meanIntervalDays).toBeCloseTo(1, 5);
  });

  it('consistencyScore in [0,1]', () => {
    const evs: any[] = [];
    for (let i = 0; i < 10; i++)
      evs.push({ topic: 'growth', ritualKey: 'reading', occurredAt: i * DAY });
    const r = summarizeDtmTopicRitualConsistency(evs, 10 * DAY);
    const g = r.find((x) => x.topic === 'growth')!;
    expect(g.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(g.consistencyScore).toBeLessThanOrEqual(1);
  });

  it('handles all 16 topics', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) {
      for (let i = 0; i < 7; i++) evs.push({ topic: t, ritualKey: 'r', occurredAt: i * DAY });
    }
    const rows = summarizeDtmTopicRitualConsistency(evs, 7 * DAY);
    for (const r of rows) expect(['rhythmic', 'devoted']).toContain(r.band);
  });

  it('devotedRitualDtmTopics filter', () => {
    const evs: any[] = [];
    for (let i = 0; i < 30; i++)
      evs.push({ topic: 'faith', ritualKey: 'prayer', occurredAt: i * DAY });
    const rows = summarizeDtmTopicRitualConsistency(evs, 30 * DAY);
    expect(devotedRitualDtmTopics(rows)).toContain('faith');
  });

  it('single ritual single occurrence still counts as absent', () => {
    const r = summarizeDtmTopicRitualConsistency(
      [{ topic: 'autonomy', ritualKey: 'solo-walk', occurredAt: 0 }],
      30 * DAY
    );
    expect(r.find((x) => x.topic === 'autonomy')!.band).toBe('absent');
  });

  it('order-independent results', () => {
    const a = [
      { topic: 'parenting', ritualKey: 'bedtime', occurredAt: 2 * DAY },
      { topic: 'parenting', ritualKey: 'bedtime', occurredAt: 0 },
      { topic: 'parenting', ritualKey: 'bedtime', occurredAt: 1 * DAY },
    ];
    const r = summarizeDtmTopicRitualConsistency(a, 7 * DAY);
    expect(r.find((x) => x.topic === 'parenting')!.meanIntervalDays).toBeCloseTo(1, 5);
  });
});
