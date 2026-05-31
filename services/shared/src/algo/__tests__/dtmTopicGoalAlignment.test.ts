import { describe, it, expect } from 'vitest';
import { summarizeDtmGoalAlignment } from '../dtmTopicGoalAlignment';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicGoalAlignment', () => {
  it('one row per topic in order', () => {
    const s = summarizeDtmGoalAlignment({ self: new Map(), goal: new Map() });
    expect(s.rows.length).toBe(DTM_TOPIC_KEYS.length);
    expect(s.rows[0].topic).toBe(DTM_TOPIC_KEYS[0]);
  });

  it('two empty maps -> overall 1, all on_track', () => {
    const s = summarizeDtmGoalAlignment({ self: new Map(), goal: new Map() });
    expect(s.overall).toBe(1);
    expect(s.rows.every((r) => r.status === 'on_track')).toBe(true);
  });

  it('identical -> overall 1', () => {
    const self = new Map(DTM_TOPIC_KEYS.map((k) => [k, 0.5] as const));
    const goal = new Map(DTM_TOPIC_KEYS.map((k) => [k, 0.5] as const));
    expect(summarizeDtmGoalAlignment({ self, goal }).overall).toBe(1);
  });

  it('drift band between 0.2 and 0.6', () => {
    const s = summarizeDtmGoalAlignment({
      self: new Map([['values', 0.1]]),
      goal: new Map([['values', 0.5]]),
    });
    expect(s.rows.find((r) => r.topic === 'values')!.status).toBe('drift');
  });

  it('off_track when gap > 0.6', () => {
    const s = summarizeDtmGoalAlignment({
      self: new Map([['family', 1]]),
      goal: new Map([['family', -0.5]]),
    });
    const row = s.rows.find((r) => r.topic === 'family')!;
    expect(row.status).toBe('off_track');
    expect(row.gap).toBeCloseTo(1.5, 5);
  });

  it('clamps inputs', () => {
    const s = summarizeDtmGoalAlignment({
      self: new Map([['faith', 5]]),
      goal: new Map([['faith', -5]]),
    });
    expect(s.rows.find((r) => r.topic === 'faith')!.gap).toBe(2);
  });

  it('NaN treated as 0', () => {
    const s = summarizeDtmGoalAlignment({
      self: new Map([['social', NaN]]) as any,
      goal: new Map([['social', 0.5]]),
    });
    expect(s.rows.find((r) => r.topic === 'social')!.gap).toBe(0.5);
  });

  it('boundary at gap=0.2 -> on_track', () => {
    const s = summarizeDtmGoalAlignment({
      self: new Map([['ambition', 0.3]]),
      goal: new Map([['ambition', 0.1]]),
    });
    expect(s.rows.find((r) => r.topic === 'ambition')!.status).toBe('on_track');
  });

  it('boundary at gap=0.6 -> drift', () => {
    const s = summarizeDtmGoalAlignment({
      self: new Map([['leisure', 0.5]]),
      goal: new Map([['leisure', 1]]),
    });
    expect(s.rows.find((r) => r.topic === 'leisure')!.status).toBe('drift');
  });

  it('alignment = 1 - gap/2', () => {
    const s = summarizeDtmGoalAlignment({
      self: new Map([['health', 1]]),
      goal: new Map([['health', -1]]),
    });
    expect(s.rows.find((r) => r.topic === 'health')!.alignment).toBe(0);
  });
});
