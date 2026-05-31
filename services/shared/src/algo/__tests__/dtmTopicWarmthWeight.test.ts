import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicWarmthWeight, coldDtmTopics } from '../dtmTopicWarmthWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicWarmthWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicWarmthWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicWarmthWeight([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('warm => warm', () => {
    const r = summarizeDtmTopicWarmthWeight([{ topic: 'values', signal: 'warm' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('warm');
  });

  it('cordial => mixed', () => {
    const r = summarizeDtmTopicWarmthWeight([{ topic: 'values', signal: 'cordial' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicWarmthWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('cool => cold', () => {
    const r = summarizeDtmTopicWarmthWeight([{ topic: 'values', signal: 'cool' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cold');
  });

  it('cold => cold', () => {
    const r = summarizeDtmTopicWarmthWeight([{ topic: 'values', signal: 'cold' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cold');
  });

  it('mid => cool', () => {
    const r = summarizeDtmTopicWarmthWeight([
      { topic: 'values', signal: 'warm' },
      { topic: 'values', signal: 'cold' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cool');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicWarmthWeight([{ topic: 'x', signal: 'warm' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicWarmthWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicWarmthWeight([
      { topic: 'values', signal: 'warm' },
      { topic: 'values', signal: 'cool' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('coldDtmTopics filter', () => {
    const r = summarizeDtmTopicWarmthWeight([
      { topic: 'values', signal: 'cold' },
      { topic: 'family', signal: 'cool' },
      { topic: 'finance', signal: 'warm' },
    ]);
    expect(coldDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicWarmthWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicWarmthWeight([
      { topic: 'values', signal: 'warm' },
      { topic: 'family', signal: 'cold' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
