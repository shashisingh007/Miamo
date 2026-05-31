import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicReverieQuality, joltedDtmTopics } from '../dtmTopicReverieQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicReverieQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicReverieQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicReverieQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('immersed => wandering', () => {
    const r = summarizeDtmTopicReverieQuality([{ topic: 'values', signal: 'immersed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('wandering');
  });

  it('wandering => mixed', () => {
    const r = summarizeDtmTopicReverieQuality([{ topic: 'values', signal: 'wandering' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicReverieQuality([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('distracted => jolted', () => {
    const r = summarizeDtmTopicReverieQuality([{ topic: 'values', signal: 'distracted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('jolted');
  });

  it('jolted => jolted', () => {
    const r = summarizeDtmTopicReverieQuality([{ topic: 'values', signal: 'jolted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('jolted');
  });

  it('mixed midpoint => distracted', () => {
    const r = summarizeDtmTopicReverieQuality([
      { topic: 'values', signal: 'immersed' },
      { topic: 'values', signal: 'jolted' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('distracted');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicReverieQuality([{ topic: 'x', signal: 'immersed' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicReverieQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicReverieQuality([
      { topic: 'values', signal: 'immersed' },
      { topic: 'values', signal: 'distracted' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('joltedDtmTopics filter', () => {
    const r = summarizeDtmTopicReverieQuality([
      { topic: 'values', signal: 'jolted' },
      { topic: 'family', signal: 'distracted' },
      { topic: 'finance', signal: 'immersed' },
    ]);
    expect(joltedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicReverieQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicReverieQuality([
      { topic: 'values', signal: 'immersed' },
      { topic: 'family', signal: 'jolted' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
