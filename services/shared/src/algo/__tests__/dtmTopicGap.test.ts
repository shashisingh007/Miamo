import { describe, it, expect } from 'vitest';
import { computeDtmTopicGap } from '../dtmTopicGap';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicGap', () => {
  it('all-zero counts -> all gaps 0 (target=0)', () => {
    const out = computeDtmTopicGap({});
    expect(out).toHaveLength(DTM_TOPIC_KEYS.length);
    expect(out.every((r) => r.gap === 0)).toBe(true);
  });

  it('uses explicit perTopicTarget when provided', () => {
    const out = computeDtmTopicGap({ values: 5 }, { perTopicTarget: 10 });
    const v = out.find((r) => r.topicKey === 'values')!;
    expect(v.gap).toBeCloseTo(0.5, 6);
  });

  it('topics above target have gap 0', () => {
    const out = computeDtmTopicGap({ values: 20 }, { perTopicTarget: 10 });
    expect(out.find((r) => r.topicKey === 'values')!.gap).toBe(0);
  });

  it('untouched topics with explicit target -> gap 1', () => {
    const out = computeDtmTopicGap({}, { perTopicTarget: 10 });
    expect(out.every((r) => r.gap === 1)).toBe(true);
  });

  it('infers fair share from total when no target given', () => {
    const counts: Record<string, number> = {};
    DTM_TOPIC_KEYS.forEach((k) => (counts[k] = 5));
    counts.values = 0;
    const out = computeDtmTopicGap(counts);
    const v = out.find((r) => r.topicKey === 'values')!;
    expect(v.gap).toBeGreaterThan(0);
  });

  it('sorted by gap desc then count asc', () => {
    const out = computeDtmTopicGap({ values: 0, family: 1 }, { perTopicTarget: 5 });
    expect(out[0].gap).toBeGreaterThanOrEqual(out[1].gap);
  });

  it('clamps negative counts to 0', () => {
    const out = computeDtmTopicGap({ values: -5 }, { perTopicTarget: 4 });
    expect(out.find((r) => r.topicKey === 'values')!.count).toBe(0);
    expect(out.find((r) => r.topicKey === 'values')!.gap).toBe(1);
  });

  it('counts always reflected even when gap is 0', () => {
    const out = computeDtmTopicGap({ values: 100 }, { perTopicTarget: 1 });
    expect(out.find((r) => r.topicKey === 'values')!.count).toBe(100);
  });

  it('zero target with answers -> all gap 0', () => {
    const out = computeDtmTopicGap({ values: 5 }, { perTopicTarget: 0 });
    expect(out.every((r) => r.gap === 0)).toBe(true);
  });
});
