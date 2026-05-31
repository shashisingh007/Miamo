import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicHabitPersistence,
  coreDtmTopics,
} from '../dtmTopicHabitPersistence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicHabitPersistence', () => {
  it('canonical row order', () => {
    const r = summarizeDtmTopicHabitPersistence([]);
    expect(r.map((x) => x.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty input => all untested', () => {
    const r = summarizeDtmTopicHabitPersistence([]);
    for (const row of r) {
      expect(row.band).toBe('untested');
      expect(row.persistenceRatio).toBe(0);
      expect(row.longestStreak).toBe(0);
      expect(row.currentStreak).toBe(0);
    }
  });

  it('ignores unknown topic + invalid sessionId', () => {
    const r = summarizeDtmTopicHabitPersistence([
      { topic: 'nope', sessionId: 's1', ts: 0 },
      { topic: 'finance', sessionId: '', ts: 1 },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('untested');
  });

  it('one topic in one session => sporadic when total=1 is also "core"? ratio=1', () => {
    const r = summarizeDtmTopicHabitPersistence([
      { topic: 'values', sessionId: 's1', ts: 0 },
    ]).find((x) => x.topic === 'values')!;
    // ratio=1/1=1 -> core
    expect(r.band).toBe('core');
    expect(r.sessionsTouched).toBe(1);
    expect(r.longestStreak).toBe(1);
    expect(r.currentStreak).toBe(1);
  });

  it('topic present in every session => core, persistenceRatio=1', () => {
    const evs = [];
    for (let i = 0; i < 5; i++) {
      evs.push({ topic: 'family', sessionId: 's' + i, ts: i * 1000 });
    }
    const r = summarizeDtmTopicHabitPersistence(evs).find((x) => x.topic === 'family')!;
    expect(r.persistenceRatio).toBe(1);
    expect(r.band).toBe('core');
    expect(r.longestStreak).toBe(5);
    expect(r.currentStreak).toBe(5);
  });

  it('persistenceRatio 0.5 => habit', () => {
    const evs = [
      { topic: 'growth', sessionId: 's1', ts: 0 },
      { topic: 'growth', sessionId: 's3', ts: 30 },
      // also add other-topic events so totalSessions=4
      { topic: 'values', sessionId: 's2', ts: 10 },
      { topic: 'values', sessionId: 's4', ts: 40 },
    ];
    const r = summarizeDtmTopicHabitPersistence(evs).find((x) => x.topic === 'growth')!;
    expect(r.persistenceRatio).toBe(0.5);
    expect(r.band).toBe('habit');
  });

  it('persistenceRatio 0.25 => recurring', () => {
    const evs = [
      { topic: 'leisure', sessionId: 's1', ts: 0 },
      { topic: 'values', sessionId: 's2', ts: 10 },
      { topic: 'values', sessionId: 's3', ts: 20 },
      { topic: 'values', sessionId: 's4', ts: 30 },
    ];
    const r = summarizeDtmTopicHabitPersistence(evs).find((x) => x.topic === 'leisure')!;
    expect(r.persistenceRatio).toBe(0.25);
    expect(r.band).toBe('recurring');
  });

  it('persistenceRatio < 0.25 => sporadic', () => {
    const evs: any[] = [];
    for (let i = 0; i < 10; i++) evs.push({ topic: 'values', sessionId: 's' + i, ts: i });
    evs.push({ topic: 'finance', sessionId: 's0', ts: 0 });
    const r = summarizeDtmTopicHabitPersistence(evs).find((x) => x.topic === 'finance')!;
    expect(r.persistenceRatio).toBe(0.1);
    expect(r.band).toBe('sporadic');
  });

  it('longestStreak measures consecutive sessions', () => {
    const evs = [
      { topic: 'intimacy', sessionId: 's1', ts: 0 },
      { topic: 'intimacy', sessionId: 's2', ts: 10 },
      { topic: 'intimacy', sessionId: 's3', ts: 20 },
      { topic: 'values', sessionId: 's4', ts: 30 },
      { topic: 'intimacy', sessionId: 's5', ts: 40 },
    ];
    const r = summarizeDtmTopicHabitPersistence(evs).find((x) => x.topic === 'intimacy')!;
    expect(r.longestStreak).toBe(3);
  });

  it('currentStreak counts back from latest', () => {
    const evs = [
      { topic: 'health', sessionId: 's1', ts: 0 },
      { topic: 'values', sessionId: 's2', ts: 10 },
      { topic: 'health', sessionId: 's3', ts: 20 },
      { topic: 'health', sessionId: 's4', ts: 30 },
    ];
    const r = summarizeDtmTopicHabitPersistence(evs).find((x) => x.topic === 'health')!;
    expect(r.currentStreak).toBe(2);
  });

  it('currentStreak=0 when topic missing in latest session', () => {
    const evs = [
      { topic: 'parenting', sessionId: 's1', ts: 0 },
      { topic: 'parenting', sessionId: 's2', ts: 10 },
      { topic: 'values', sessionId: 's3', ts: 20 },
    ];
    const r = summarizeDtmTopicHabitPersistence(evs).find((x) => x.topic === 'parenting')!;
    expect(r.currentStreak).toBe(0);
  });

  it('session ordering uses first ts per session', () => {
    const evs = [
      { topic: 'finance', sessionId: 'b', ts: 5 },
      { topic: 'values', sessionId: 'a', ts: 1 },
      { topic: 'values', sessionId: 'b', ts: 6 },
    ];
    const r = summarizeDtmTopicHabitPersistence(evs);
    const v = r.find((x) => x.topic === 'values')!;
    expect(v.persistenceRatio).toBe(1);
  });

  it('coreDtmTopics returns core + habit', () => {
    const evs = [
      { topic: 'family', sessionId: 's1', ts: 0 },
      { topic: 'family', sessionId: 's2', ts: 10 },
      { topic: 'family', sessionId: 's3', ts: 20 },
      { topic: 'family', sessionId: 's4', ts: 30 },
      { topic: 'finance', sessionId: 's3', ts: 21 },
      { topic: 'finance', sessionId: 's4', ts: 31 },
    ];
    const rows = summarizeDtmTopicHabitPersistence(evs);
    const c = coreDtmTopics(rows);
    expect(c).toContain('family');
    expect(c).toContain('finance');
    expect(c).not.toContain('values');
  });

  it('coreDtmTopics excludes sporadic + recurring', () => {
    const evs: any[] = [];
    for (let i = 0; i < 10; i++) evs.push({ topic: 'values', sessionId: 's' + i, ts: i });
    evs.push({ topic: 'social', sessionId: 's0', ts: 0 });
    const rows = summarizeDtmTopicHabitPersistence(evs);
    expect(coreDtmTopics(rows)).not.toContain('social');
  });

  it('multiple touches per session count once', () => {
    const evs = [
      { topic: 'autonomy', sessionId: 's1', ts: 0 },
      { topic: 'autonomy', sessionId: 's1', ts: 1 },
      { topic: 'autonomy', sessionId: 's1', ts: 2 },
    ];
    const r = summarizeDtmTopicHabitPersistence(evs).find((x) => x.topic === 'autonomy')!;
    expect(r.sessionsTouched).toBe(1);
  });

  it('persistenceRatio bounded [0,1]', () => {
    const evs = [
      { topic: 'faith', sessionId: 's1', ts: 0 },
      { topic: 'faith', sessionId: 's2', ts: 10 },
    ];
    const r = summarizeDtmTopicHabitPersistence(evs).find((x) => x.topic === 'faith')!;
    expect(r.persistenceRatio).toBeGreaterThanOrEqual(0);
    expect(r.persistenceRatio).toBeLessThanOrEqual(1);
  });
});
