import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicValidationDepth,
  invalidatedDtmTopics,
} from '../dtmTopicValidationDepth';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicValidationDepth', () => {
  it('returns 16', () => {
    const r = summarizeDtmTopicValidationDepth([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty untested', () => {
    expect(summarizeDtmTopicValidationDepth([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('deep-resonance => deep', () => {
    const r = summarizeDtmTopicValidationDepth([{ topic: 'intimacy', signal: 'deep-resonance' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('deep');
  });

  it('reflective (0.8) => surface', () => {
    const r = summarizeDtmTopicValidationDepth([{ topic: 'intimacy', signal: 'reflective' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('surface');
  });

  it('surface (0.55) => surface', () => {
    const r = summarizeDtmTopicValidationDepth([{ topic: 'intimacy', signal: 'surface' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('surface');
  });

  it('token (0.25) => invalidated', () => {
    const r = summarizeDtmTopicValidationDepth([{ topic: 'intimacy', signal: 'token' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('invalidated');
  });

  it('invalidated => invalidated', () => {
    const r = summarizeDtmTopicValidationDepth([{ topic: 'intimacy', signal: 'invalidated' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('invalidated');
  });

  it('mixed (0.5) => token', () => {
    const r = summarizeDtmTopicValidationDepth([
      { topic: 'intimacy', signal: 'deep-resonance' },
      { topic: 'intimacy', signal: 'invalidated' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('token');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicValidationDepth([{ topic: 'xx', signal: 'deep-resonance' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicValidationDepth([{ topic: 'intimacy', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'intimacy')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicValidationDepth([
      { topic: 'intimacy', signal: 'deep-resonance' },
      { topic: 'intimacy', signal: 'invalidated' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.n).toBe(2);
  });

  it('invalidatedDtmTopics filters', () => {
    const r = summarizeDtmTopicValidationDepth([
      { topic: 'intimacy', signal: 'invalidated' },
      { topic: 'leisure', signal: 'deep-resonance' },
    ]);
    expect(invalidatedDtmTopics(r)).toHaveLength(1);
  });

  it('score bounds', () => {
    const r = summarizeDtmTopicValidationDepth([
      { topic: 'intimacy', signal: 'deep-resonance' },
      { topic: 'leisure', signal: 'invalidated' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order', () => {
    const r = summarizeDtmTopicValidationDepth([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
