import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicTrend } from '../dtmTopicTrendSlope';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicTrendSlope', () => {
  it('one row per topic in order', () => {
    const r = summarizeDtmTopicTrend(new Map());
    expect(r.length).toBe(DTM_TOPIC_KEYS.length);
    expect(r[0].topic).toBe(DTM_TOPIC_KEYS[0]);
  });

  it('empty -> flat slope 0', () => {
    const r = summarizeDtmTopicTrend(new Map());
    expect(r.every((x) => x.slope === 0 && x.direction === 'flat')).toBe(true);
  });

  it('rising series', () => {
    const r = summarizeDtmTopicTrend(new Map([['values', [-0.5, 0, 0.3, 0.6, 0.9]]]));
    const row = r.find((x) => x.topic === 'values')!;
    expect(row.slope).toBeGreaterThan(0.1);
    expect(row.direction).toBe('rising');
  });

  it('falling series', () => {
    const r = summarizeDtmTopicTrend(new Map([['family', [0.9, 0.6, 0.3, 0, -0.5]]]));
    expect(r.find((x) => x.topic === 'family')!.direction).toBe('falling');
  });

  it('flat series', () => {
    const r = summarizeDtmTopicTrend(new Map([['faith', [0.5, 0.5, 0.5, 0.5]]]));
    const row = r.find((x) => x.topic === 'faith')!;
    expect(row.slope).toBe(0);
    expect(row.direction).toBe('flat');
  });

  it('single point -> flat', () => {
    const r = summarizeDtmTopicTrend(new Map([['health', [0.9]]]));
    expect(r.find((x) => x.topic === 'health')!.direction).toBe('flat');
  });

  it('clamps out-of-range values', () => {
    const r = summarizeDtmTopicTrend(new Map([['ambition', [-5, 0, 5]]]));
    const row = r.find((x) => x.topic === 'ambition')!;
    expect(row.direction).toBe('rising');
    expect(row.slope).toBeLessThanOrEqual(1);
  });

  it('ignores NaN/Infinity', () => {
    const r = summarizeDtmTopicTrend(new Map([['social', [NaN, Infinity, 0.5, 0.5]]]));
    expect(r.find((x) => x.topic === 'social')!.direction).toBe('flat');
  });

  it('near-flat slope (within dead zone) -> flat', () => {
    const r = summarizeDtmTopicTrend(new Map([['leisure', [0.50, 0.51, 0.50, 0.51]]]));
    expect(r.find((x) => x.topic === 'leisure')!.direction).toBe('flat');
  });

  it('unknown keys ignored', () => {
    const m = new Map<any, number[]>([['notatopic', [1, -1, 1, -1]]]);
    const r = summarizeDtmTopicTrend(m as any);
    expect(r.length).toBe(DTM_TOPIC_KEYS.length);
  });
});
