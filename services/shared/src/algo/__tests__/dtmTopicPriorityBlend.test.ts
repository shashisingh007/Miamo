import { describe, it, expect } from 'vitest';
import { blendDtmTopicPriority } from '../dtmTopicPriorityBlend';

describe('dtmTopicPriorityBlend', () => {
  it('empty signals -> empty list', () => {
    expect(blendDtmTopicPriority({})).toEqual([]);
  });

  it('only listed topics appear', () => {
    const out = blendDtmTopicPriority({
      values: { recency: 0.5, momentum: 0, confidence: 0.5 },
    });
    expect(out.map((r) => r.topicKey)).toEqual(['values']);
  });

  it('high recency raises priority', () => {
    const out = blendDtmTopicPriority({
      values: { recency: 1, momentum: 0, confidence: 1 },
      family: { recency: 0, momentum: 0, confidence: 1 },
    });
    expect(out[0].topicKey).toBe('values');
  });

  it('cooling momentum raises priority; positive momentum does not', () => {
    const out = blendDtmTopicPriority({
      values: { recency: 0, momentum: -1, confidence: 1 },
      family: { recency: 0, momentum: 1, confidence: 1 },
    });
    expect(out[0].topicKey).toBe('values');
    expect(out[1].priority).toBe(0);
  });

  it('low confidence raises priority via gap', () => {
    const out = blendDtmTopicPriority({
      values: { recency: 0, momentum: 0, confidence: 0 },
      family: { recency: 0, momentum: 0, confidence: 1 },
    });
    expect(out[0].topicKey).toBe('values');
  });

  it('weights normalise even when not summing to 1', () => {
    const a = blendDtmTopicPriority(
      { values: { recency: 1, momentum: 0, confidence: 1 } },
      { recencyWeight: 5, momentumWeight: 5, confidenceGapWeight: 5 },
    );
    const b = blendDtmTopicPriority(
      { values: { recency: 1, momentum: 0, confidence: 1 } },
      { recencyWeight: 1, momentumWeight: 1, confidenceGapWeight: 1 },
    );
    expect(a[0].priority).toBeCloseTo(b[0].priority, 6);
  });

  it('output sorted desc', () => {
    const out = blendDtmTopicPriority({
      values: { recency: 0.2, momentum: 0, confidence: 0.9 },
      family: { recency: 0.9, momentum: -0.5, confidence: 0.1 },
      growth: { recency: 0.5, momentum: 0, confidence: 0.5 },
    });
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].priority).toBeGreaterThanOrEqual(out[i].priority);
    }
  });

  it('all-zero weights still yields finite priority', () => {
    const out = blendDtmTopicPriority(
      { values: { recency: 0.5, momentum: -0.5, confidence: 0.5 } },
      { recencyWeight: 0, momentumWeight: 0, confidenceGapWeight: 0 },
    );
    expect(Number.isFinite(out[0].priority)).toBe(true);
  });

  it('clamps out-of-range inputs', () => {
    const out = blendDtmTopicPriority({
      values: { recency: 5, momentum: -10, confidence: -1 },
    });
    expect(out[0].priority).toBeLessThanOrEqual(1);
    expect(out[0].priority).toBeGreaterThanOrEqual(0);
  });

  it('handles non-finite values safely', () => {
    const out = blendDtmTopicPriority({
      values: { recency: NaN, momentum: NaN, confidence: NaN },
    });
    expect(out[0].priority).toBeCloseTo(1 / 3, 6); // only the confidence-gap term contributes (1)
  });
});
