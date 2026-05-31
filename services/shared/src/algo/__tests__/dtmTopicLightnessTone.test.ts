import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicLightnessTone, burdenedDtmTopics } from '../dtmTopicLightnessTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicLightnessTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicLightnessTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicLightnessTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('light => light', () => {
    const r = summarizeDtmTopicLightnessTone([{ topic: 'values', signal: 'light' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('light');
  });

  it('easy => mixed', () => {
    const r = summarizeDtmTopicLightnessTone([{ topic: 'values', signal: 'easy' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicLightnessTone([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('heavy => burdened', () => {
    const r = summarizeDtmTopicLightnessTone([{ topic: 'values', signal: 'heavy' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('burdened');
  });

  it('burdened => burdened', () => {
    const r = summarizeDtmTopicLightnessTone([{ topic: 'values', signal: 'burdened' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('burdened');
  });

  it('mixed midpoint => heavy', () => {
    const r = summarizeDtmTopicLightnessTone([
      { topic: 'values', signal: 'light' },
      { topic: 'values', signal: 'burdened' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('heavy');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicLightnessTone([{ topic: 'x', signal: 'light' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicLightnessTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicLightnessTone([
      { topic: 'values', signal: 'light' },
      { topic: 'values', signal: 'heavy' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('burdenedDtmTopics filter', () => {
    const r = summarizeDtmTopicLightnessTone([
      { topic: 'values', signal: 'burdened' },
      { topic: 'family', signal: 'heavy' },
      { topic: 'finance', signal: 'light' },
    ]);
    expect(burdenedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicLightnessTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicLightnessTone([
      { topic: 'values', signal: 'light' },
      { topic: 'family', signal: 'burdened' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
