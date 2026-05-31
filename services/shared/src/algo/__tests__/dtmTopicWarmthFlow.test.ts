import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicWarmthFlow, coldDtmTopics } from '../dtmTopicWarmthFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicWarmthFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicWarmthFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicWarmthFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('tender => warm', () => {
    const r = summarizeDtmTopicWarmthFlow([{ topic: 'values', signal: 'tender' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('warm');
  });

  it('warm => mixed', () => {
    const r = summarizeDtmTopicWarmthFlow([{ topic: 'values', signal: 'warm' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicWarmthFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('cool', () => {
    const r = summarizeDtmTopicWarmthFlow([{ topic: 'values', signal: 'cool' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cold');
  });

  it('cold', () => {
    const r = summarizeDtmTopicWarmthFlow([{ topic: 'values', signal: 'cold' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cold');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicWarmthFlow([
      { topic: 'values', signal: 'tender' },
      { topic: 'values', signal: 'cold' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cool');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicWarmthFlow([{ topic: 'x', signal: 'tender' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicWarmthFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicWarmthFlow([
      { topic: 'values', signal: 'tender' },
      { topic: 'values', signal: 'cold' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('coldDtmTopics filter', () => {
    const r = summarizeDtmTopicWarmthFlow([
      { topic: 'values', signal: 'cold' },
      { topic: 'family', signal: 'cool' },
      { topic: 'finance', signal: 'tender' },
    ]);
    expect(coldDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicWarmthFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicWarmthFlow([
      { topic: 'values', signal: 'tender' },
      { topic: 'family', signal: 'cold' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
