import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicEffortReciprocity,
  extractiveDtmTopics,
} from '../dtmTopicEffortReciprocity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicEffortReciprocity', () => {
  it('returns 16', () => {
    const r = summarizeDtmTopicEffortReciprocity([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty untested', () => {
    expect(summarizeDtmTopicEffortReciprocity([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('balanced => balanced', () => {
    const r = summarizeDtmTopicEffortReciprocity([{ topic: 'parenting', signal: 'balanced' }]);
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('balanced');
  });

  it('leaning-in (0.8) => tilted', () => {
    const r = summarizeDtmTopicEffortReciprocity([{ topic: 'parenting', signal: 'leaning-in' }]);
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('tilted');
  });

  it('asymmetric (0.55) => tilted', () => {
    const r = summarizeDtmTopicEffortReciprocity([{ topic: 'parenting', signal: 'asymmetric' }]);
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('tilted');
  });

  it('one-sided (0.25) => extractive', () => {
    const r = summarizeDtmTopicEffortReciprocity([{ topic: 'parenting', signal: 'one-sided' }]);
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('extractive');
  });

  it('extractive => extractive', () => {
    const r = summarizeDtmTopicEffortReciprocity([{ topic: 'parenting', signal: 'extractive' }]);
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('extractive');
  });

  it('mixed (0.5) => one-sided', () => {
    const r = summarizeDtmTopicEffortReciprocity([
      { topic: 'parenting', signal: 'balanced' },
      { topic: 'parenting', signal: 'extractive' },
    ]);
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('one-sided');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicEffortReciprocity([{ topic: 'xx', signal: 'balanced' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicEffortReciprocity([{ topic: 'parenting', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'parenting')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicEffortReciprocity([
      { topic: 'parenting', signal: 'balanced' },
      { topic: 'parenting', signal: 'extractive' },
    ]);
    expect(r.find((x) => x.topic === 'parenting')!.n).toBe(2);
  });

  it('extractiveDtmTopics filters', () => {
    const r = summarizeDtmTopicEffortReciprocity([
      { topic: 'parenting', signal: 'extractive' },
      { topic: 'leisure', signal: 'balanced' },
    ]);
    expect(extractiveDtmTopics(r)).toHaveLength(1);
  });

  it('score bounds', () => {
    const r = summarizeDtmTopicEffortReciprocity([
      { topic: 'parenting', signal: 'balanced' },
      { topic: 'leisure', signal: 'extractive' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order', () => {
    const r = summarizeDtmTopicEffortReciprocity([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
