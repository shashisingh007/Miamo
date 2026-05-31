import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicForgivenessVelocity,
  glacialForgivenessDtmTopics,
} from '../dtmTopicForgivenessVelocity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const HOUR = 3600_000;
const DAY = 24 * HOUR;

describe('dtmTopicForgivenessVelocity', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicForgivenessVelocity([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicForgivenessVelocity([])) {
      expect(r.band).toBe('untested');
      expect(r.events).toBe(0);
    }
  });

  it('sub-hour => swift', () => {
    const r = summarizeDtmTopicForgivenessVelocity([
      { topic: 'conflict', rupturedAt: 1000, forgivenAt: 1000 + 30 * 60_000 },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('swift');
  });

  it('within a day => steady', () => {
    const r = summarizeDtmTopicForgivenessVelocity([
      { topic: 'family', rupturedAt: 0, forgivenAt: 12 * HOUR },
    ]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('steady');
  });

  it('several days => slow', () => {
    const r = summarizeDtmTopicForgivenessVelocity([
      { topic: 'finance', rupturedAt: 0, forgivenAt: 3 * DAY },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('slow');
  });

  it('beyond a week => glacial', () => {
    const r = summarizeDtmTopicForgivenessVelocity([
      { topic: 'intimacy', rupturedAt: 0, forgivenAt: 30 * DAY },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('glacial');
  });

  it('median used for band, not mean', () => {
    // Three values: 30min, 30min, 30 days -> median is 30 min -> swift
    const r = summarizeDtmTopicForgivenessVelocity([
      { topic: 'growth', rupturedAt: 0, forgivenAt: 30 * 60_000 },
      { topic: 'growth', rupturedAt: 0, forgivenAt: 30 * 60_000 },
      { topic: 'growth', rupturedAt: 0, forgivenAt: 30 * DAY },
    ]);
    const g = r.find((x) => x.topic === 'growth')!;
    expect(g.band).toBe('swift');
    expect(g.meanLatencyMs).toBeGreaterThan(HOUR);
  });

  it('rejects negative delta', () => {
    const r = summarizeDtmTopicForgivenessVelocity([
      { topic: 'leisure', rupturedAt: 1000, forgivenAt: 500 },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.events).toBe(0);
  });

  it('rejects non-finite timestamps', () => {
    const r = summarizeDtmTopicForgivenessVelocity([
      { topic: 'social', rupturedAt: NaN, forgivenAt: 0 },
      { topic: 'social', rupturedAt: 0, forgivenAt: Infinity },
    ]);
    expect(r.find((x) => x.topic === 'social')!.events).toBe(0);
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicForgivenessVelocity([
      { topic: 'nope', rupturedAt: 0, forgivenAt: 100 },
    ]);
    expect(r.find((x) => x.topic === 'values')!.events).toBe(0);
  });

  it('fastest/slowest min/max', () => {
    const r = summarizeDtmTopicForgivenessVelocity([
      { topic: 'health', rupturedAt: 0, forgivenAt: 100 },
      { topic: 'health', rupturedAt: 0, forgivenAt: 50 },
      { topic: 'health', rupturedAt: 0, forgivenAt: 200 },
    ]);
    const h = r.find((x) => x.topic === 'health')!;
    expect(h.fastestMs).toBe(50);
    expect(h.slowestMs).toBe(200);
  });

  it('even-length median averages middle two', () => {
    const r = summarizeDtmTopicForgivenessVelocity([
      { topic: 'autonomy', rupturedAt: 0, forgivenAt: 100 },
      { topic: 'autonomy', rupturedAt: 0, forgivenAt: 200 },
      { topic: 'autonomy', rupturedAt: 0, forgivenAt: 300 },
      { topic: 'autonomy', rupturedAt: 0, forgivenAt: 400 },
    ]);
    expect(r.find((x) => x.topic === 'autonomy')!.medianLatencyMs).toBe(250);
  });

  it('zero delta => swift', () => {
    const r = summarizeDtmTopicForgivenessVelocity([
      { topic: 'faith', rupturedAt: 1000, forgivenAt: 1000 },
    ]);
    expect(r.find((x) => x.topic === 'faith')!.band).toBe('swift');
  });

  it('boundary 1 hour exactly => swift', () => {
    const r = summarizeDtmTopicForgivenessVelocity([
      { topic: 'ambition', rupturedAt: 0, forgivenAt: HOUR },
    ]);
    expect(r.find((x) => x.topic === 'ambition')!.band).toBe('swift');
  });

  it('boundary 1 day exactly => steady', () => {
    const r = summarizeDtmTopicForgivenessVelocity([
      { topic: 'parenting', rupturedAt: 0, forgivenAt: DAY },
    ]);
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('steady');
  });

  it('all 16 topics handled', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, rupturedAt: 0, forgivenAt: HOUR / 2 });
    for (const r of summarizeDtmTopicForgivenessVelocity(evs)) expect(r.band).toBe('swift');
  });

  it('glacialForgivenessDtmTopics filters glacial', () => {
    const r = summarizeDtmTopicForgivenessVelocity([
      { topic: 'communication', rupturedAt: 0, forgivenAt: 60 * DAY },
      { topic: 'leisure', rupturedAt: 0, forgivenAt: HOUR / 2 },
    ]);
    const g = glacialForgivenessDtmTopics(r);
    expect(g).toContain('communication');
    expect(g).not.toContain('leisure');
  });
});
