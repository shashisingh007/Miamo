import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicCoverage,
  overallDtmCoverageRatio,
} from '../dtmTopicCoverageMap';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicCoverageMap', () => {
  it('returns one row per topic in order', () => {
    const r = summarizeDtmTopicCoverage(new Map(), 3);
    expect(r.length).toBe(DTM_TOPIC_KEYS.length);
    for (let i = 0; i < r.length; i++) expect(r[i].topic).toBe(DTM_TOPIC_KEYS[i]);
  });

  it('untouched when answered=0', () => {
    const r = summarizeDtmTopicCoverage(new Map(), 3);
    expect(r.every((x) => x.tier === 'untouched')).toBe(true);
  });

  it('partial when ratio < 0.5', () => {
    const r = summarizeDtmTopicCoverage(new Map([['values', 1]]), 4);
    expect(r.find((x) => x.topic === 'values')!.tier).toBe('partial');
  });

  it('covered when 0.5 <= ratio < 1', () => {
    const r = summarizeDtmTopicCoverage(new Map([['family', 2]]), 4);
    expect(r.find((x) => x.topic === 'family')!.tier).toBe('covered');
  });

  it('saturated when ratio >= 1', () => {
    const r = summarizeDtmTopicCoverage(new Map([['faith', 8]]), 4);
    expect(r.find((x) => x.topic === 'faith')!.tier).toBe('saturated');
  });

  it('per-topic target map honored', () => {
    const r = summarizeDtmTopicCoverage(
      new Map([['leisure', 3]]),
      new Map([['leisure', 6]]),
    );
    expect(r.find((x) => x.topic === 'leisure')!.ratio).toBeCloseTo(0.5, 5);
  });

  it('target=0 with answered>0 -> saturated', () => {
    const r = summarizeDtmTopicCoverage(new Map([['health', 1]]), 0);
    expect(r.find((x) => x.topic === 'health')!.tier).toBe('saturated');
  });

  it('target=0 with answered=0 -> untouched', () => {
    const r = summarizeDtmTopicCoverage(new Map(), 0);
    expect(r.every((x) => x.tier === 'untouched')).toBe(true);
  });

  it('NaN/negative answered clamped to 0', () => {
    const r = summarizeDtmTopicCoverage(
      new Map<any, number>([['ambition', -5], ['social', NaN]]) as any,
      3,
    );
    expect(r.find((x) => x.topic === 'ambition')!.answered).toBe(0);
    expect(r.find((x) => x.topic === 'social')!.answered).toBe(0);
  });

  it('overallDtmCoverageRatio averages clamped ratios', () => {
    const r = summarizeDtmTopicCoverage(
      new Map<any, number>([['values', 8]]),
      4,
    );
    const o = overallDtmCoverageRatio(r);
    expect(o).toBeCloseTo(1 / DTM_TOPIC_KEYS.length, 5);
  });

  it('overallDtmCoverageRatio empty -> 0', () => {
    expect(overallDtmCoverageRatio([])).toBe(0);
  });
});
