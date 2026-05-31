import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAffectionTone, coldDtmTopics } from '../dtmTopicAffectionTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAffectionTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAffectionTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAffectionTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('warm', () => {
    const r = summarizeDtmTopicAffectionTone([{ topic: 'values', signal: 'warm' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('warm');
  });

  it('caring => mixed', () => {
    const r = summarizeDtmTopicAffectionTone([{ topic: 'values', signal: 'caring' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicAffectionTone([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('cool', () => {
    const r = summarizeDtmTopicAffectionTone([{ topic: 'values', signal: 'cool' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cold');
  });

  it('cold', () => {
    const r = summarizeDtmTopicAffectionTone([{ topic: 'values', signal: 'cold' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cold');
  });

  it('mid', () => {
    const r = summarizeDtmTopicAffectionTone([
      { topic: 'values', signal: 'warm' },
      { topic: 'values', signal: 'cold' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cool');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAffectionTone([{ topic: 'x', signal: 'warm' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAffectionTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAffectionTone([
      { topic: 'values', signal: 'warm' },
      { topic: 'values', signal: 'cold' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('coldDtmTopics filter', () => {
    const r = summarizeDtmTopicAffectionTone([
      { topic: 'values', signal: 'cold' },
      { topic: 'family', signal: 'cool' },
      { topic: 'finance', signal: 'warm' },
    ]);
    expect(coldDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAffectionTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAffectionTone([
      { topic: 'values', signal: 'warm' },
      { topic: 'family', signal: 'cold' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
