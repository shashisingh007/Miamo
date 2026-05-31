import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicValenceVolatility,
  volatileDtmTopics,
} from '../dtmTopicValenceVolatility';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicValenceVolatility', () => {
  it('canonical row order', () => {
    expect(summarizeDtmTopicValenceVolatility([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => all untested', () => {
    for (const r of summarizeDtmTopicValenceVolatility([])) {
      expect(r.band).toBe('untested');
      expect(r.samples).toBe(0);
    }
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicValenceVolatility([{ topic: 'nope', valence: 0.5, ts: 0 }]);
    expect(r.find((x) => x.topic === 'values')!.samples).toBe(0);
  });

  it('clamps valence to [-1,1]', () => {
    const r = summarizeDtmTopicValenceVolatility([
      { topic: 'values', valence: 5, ts: 0 },
      { topic: 'values', valence: -5, ts: 1 },
    ]);
    const v = r.find((x) => x.topic === 'values')!;
    expect(v.mean).toBe(0);
    expect(v.swingRange).toBe(2);
  });

  it('rejects NaN/Infinity', () => {
    const r = summarizeDtmTopicValenceVolatility([
      { topic: 'values', valence: NaN, ts: 0 },
      { topic: 'values', valence: Infinity, ts: 1 },
    ]);
    expect(r.find((x) => x.topic === 'values')!.samples).toBe(0);
  });

  it('single sample => steady', () => {
    const r = summarizeDtmTopicValenceVolatility([{ topic: 'family', valence: 0.5, ts: 0 }]);
    const f = r.find((x) => x.topic === 'family')!;
    expect(f.band).toBe('steady');
    expect(f.variance).toBe(0);
  });

  it('flat samples => steady, var=0', () => {
    const r = summarizeDtmTopicValenceVolatility([
      { topic: 'growth', valence: 0.3, ts: 0 },
      { topic: 'growth', valence: 0.3, ts: 1 },
      { topic: 'growth', valence: 0.3, ts: 2 },
    ]);
    const g = r.find((x) => x.topic === 'growth')!;
    expect(g.stdDev).toBe(0);
    expect(g.band).toBe('steady');
  });

  it('mild noise => fluctuating', () => {
    const r = summarizeDtmTopicValenceVolatility([
      { topic: 'finance', valence: 0.2, ts: 0 },
      { topic: 'finance', valence: -0.05, ts: 1 },
      { topic: 'finance', valence: 0.1, ts: 2 },
      { topic: 'finance', valence: -0.15, ts: 3 },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('fluctuating');
  });

  it('wider swings => volatile', () => {
    const r = summarizeDtmTopicValenceVolatility([
      { topic: 'conflict', valence: 0.6, ts: 0 },
      { topic: 'conflict', valence: -0.4, ts: 1 },
      { topic: 'conflict', valence: 0.5, ts: 2 },
      { topic: 'conflict', valence: -0.3, ts: 3 },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('volatile');
  });

  it('extreme swings => erratic', () => {
    const r = summarizeDtmTopicValenceVolatility([
      { topic: 'intimacy', valence: 1, ts: 0 },
      { topic: 'intimacy', valence: -1, ts: 1 },
      { topic: 'intimacy', valence: 1, ts: 2 },
      { topic: 'intimacy', valence: -1, ts: 3 },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('erratic');
  });

  it('variance uses sample (n-1) denominator', () => {
    const r = summarizeDtmTopicValenceVolatility([
      { topic: 'leisure', valence: 0, ts: 0 },
      { topic: 'leisure', valence: 1, ts: 1 },
    ]);
    const l = r.find((x) => x.topic === 'leisure')!;
    expect(l.variance).toBeCloseTo(0.5, 10);
  });

  it('swingRange = max - min', () => {
    const r = summarizeDtmTopicValenceVolatility([
      { topic: 'social', valence: -0.2, ts: 0 },
      { topic: 'social', valence: 0.5, ts: 1 },
    ]);
    expect(r.find((x) => x.topic === 'social')!.swingRange).toBeCloseTo(0.7, 10);
  });

  it('mean computed', () => {
    const r = summarizeDtmTopicValenceVolatility([
      { topic: 'faith', valence: 0.2, ts: 0 },
      { topic: 'faith', valence: 0.4, ts: 1 },
    ]);
    expect(r.find((x) => x.topic === 'faith')!.mean).toBeCloseTo(0.3, 10);
  });

  it('volatileDtmTopics returns volatile + erratic', () => {
    const rows = summarizeDtmTopicValenceVolatility([
      { topic: 'conflict', valence: 0.6, ts: 0 },
      { topic: 'conflict', valence: -0.4, ts: 1 },
      { topic: 'conflict', valence: 0.5, ts: 2 },
      { topic: 'intimacy', valence: 1, ts: 0 },
      { topic: 'intimacy', valence: -1, ts: 1 },
      { topic: 'values', valence: 0.1, ts: 0 },
      { topic: 'values', valence: 0.1, ts: 1 },
    ]);
    const v = volatileDtmTopics(rows);
    expect(v).toContain('conflict');
    expect(v).toContain('intimacy');
    expect(v).not.toContain('values');
  });

  it('large dataset uniform => steady', () => {
    const evs: any[] = [];
    for (let i = 0; i < 100; i++) evs.push({ topic: 'health', valence: 0.5, ts: i });
    expect(summarizeDtmTopicValenceVolatility(evs).find((x) => x.topic === 'health')!.band).toBe('steady');
  });

  it('handles all 16 topics independently', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) {
      evs.push({ topic: t, valence: 0.5, ts: 0 });
      evs.push({ topic: t, valence: -0.5, ts: 1 });
    }
    const rows = summarizeDtmTopicValenceVolatility(evs);
    for (const r of rows) expect(r.samples).toBe(2);
  });
});
