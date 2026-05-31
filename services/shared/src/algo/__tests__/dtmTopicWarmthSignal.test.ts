import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicWarmthSignal, coldDtmTopics } from '../dtmTopicWarmthSignal';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicWarmthSignal', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicWarmthSignal([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicWarmthSignal([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('radiantly-warm => warm', () => {
    const r = summarizeDtmTopicWarmthSignal([{ topic: 'values', signal: 'radiantly-warm' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('warm');
  });

  it('warm => lukewarm', () => {
    const r = summarizeDtmTopicWarmthSignal([{ topic: 'values', signal: 'warm' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('lukewarm');
  });

  it('lukewarm => lukewarm', () => {
    const r = summarizeDtmTopicWarmthSignal([{ topic: 'values', signal: 'lukewarm' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('lukewarm');
  });

  it('cool => cold', () => {
    const r = summarizeDtmTopicWarmthSignal([{ topic: 'values', signal: 'cool' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cold');
  });

  it('cold => cold', () => {
    const r = summarizeDtmTopicWarmthSignal([{ topic: 'values', signal: 'cold' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cold');
  });

  it('mixed 0.5 => cool', () => {
    const r = summarizeDtmTopicWarmthSignal([
      { topic: 'values', signal: 'radiantly-warm' },
      { topic: 'values', signal: 'cold' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cool');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicWarmthSignal([{ topic: 'x', signal: 'warm' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicWarmthSignal([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicWarmthSignal([
      { topic: 'values', signal: 'warm' },
      { topic: 'values', signal: 'lukewarm' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('coldDtmTopics filters', () => {
    const r = summarizeDtmTopicWarmthSignal([
      { topic: 'values', signal: 'cold' },
      { topic: 'family', signal: 'cool' },
      { topic: 'finance', signal: 'radiantly-warm' },
    ]);
    expect(coldDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicWarmthSignal([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicWarmthSignal([
      { topic: 'values', signal: 'radiantly-warm' },
      { topic: 'family', signal: 'cold' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
