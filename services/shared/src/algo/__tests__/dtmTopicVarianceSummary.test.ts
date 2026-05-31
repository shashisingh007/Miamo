import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicVariance } from '../dtmTopicVarianceSummary';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicVarianceSummary', () => {
  it('returns one row per topic', () => {
    const r = summarizeDtmTopicVariance(new Map());
    expect(r.length).toBe(DTM_TOPIC_KEYS.length);
  });

  it('empty answers -> variance 0, stable', () => {
    const r = summarizeDtmTopicVariance(new Map());
    expect(r.every(x => x.variance === 0 && x.stability === 'stable')).toBe(true);
  });

  it('identical answers -> variance 0', () => {
    const r = summarizeDtmTopicVariance(new Map([['values', [0.5, 0.5, 0.5, 0.5]]]));
    expect(r.find(x => x.topic === 'values')!.variance).toBe(0);
  });

  it('volatile classified when high spread', () => {
    const r = summarizeDtmTopicVariance(new Map([['family', [-1, 1, -1, 1]]]));
    expect(r.find(x => x.topic === 'family')!.stability).toBe('volatile');
  });

  it('mixed classified between thresholds', () => {
    const r = summarizeDtmTopicVariance(new Map([['leisure', [0, 0.4, -0.2, 0.3]]]));
    expect(r.find(x => x.topic === 'leisure')!.stability).toBe('mixed');
  });

  it('clamps out-of-range values', () => {
    const r = summarizeDtmTopicVariance(new Map([['faith', [5, -5, 5, -5]]]));
    const row = r.find(x => x.topic === 'faith')!;
    expect(row.variance).toBeGreaterThan(0.5);
  });

  it('ignores NaN/Infinity', () => {
    const r = summarizeDtmTopicVariance(new Map([['ambition', [NaN, Infinity, 0.5, 0.5]]]));
    expect(r.find(x => x.topic === 'ambition')!.variance).toBe(0);
  });

  it('single answer treated as variance 0', () => {
    const r = summarizeDtmTopicVariance(new Map([['health', [0.9]]]));
    expect(r.find(x => x.topic === 'health')!.variance).toBe(0);
  });

  it('unknown topic keys are ignored', () => {
    const m = new Map<any, number[]>([['notatopic', [1, -1]]]);
    const r = summarizeDtmTopicVariance(m as any);
    expect(r.length).toBe(DTM_TOPIC_KEYS.length);
  });

  it('row order matches DTM_TOPIC_KEYS', () => {
    const r = summarizeDtmTopicVariance(new Map());
    for (let i = 0; i < DTM_TOPIC_KEYS.length; i++) {
      expect(r[i].topic).toBe(DTM_TOPIC_KEYS[i]);
    }
  });
});
