import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicLoyaltyWeight, disloyalDtmTopics } from '../dtmTopicLoyaltyWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicLoyaltyWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicLoyaltyWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicLoyaltyWeight([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('loyal => loyal', () => {
    const r = summarizeDtmTopicLoyaltyWeight([{ topic: 'values', signal: 'loyal' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('loyal');
  });

  it('devoted => mixed', () => {
    const r = summarizeDtmTopicLoyaltyWeight([{ topic: 'values', signal: 'devoted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicLoyaltyWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('wavering => disloyal', () => {
    const r = summarizeDtmTopicLoyaltyWeight([{ topic: 'values', signal: 'wavering' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('disloyal');
  });

  it('disloyal => disloyal', () => {
    const r = summarizeDtmTopicLoyaltyWeight([{ topic: 'values', signal: 'disloyal' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('disloyal');
  });

  it('mixed midpoint => wavering', () => {
    const r = summarizeDtmTopicLoyaltyWeight([
      { topic: 'values', signal: 'loyal' },
      { topic: 'values', signal: 'disloyal' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('wavering');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicLoyaltyWeight([{ topic: 'x', signal: 'loyal' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicLoyaltyWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicLoyaltyWeight([
      { topic: 'values', signal: 'loyal' },
      { topic: 'values', signal: 'wavering' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('disloyalDtmTopics filter', () => {
    const r = summarizeDtmTopicLoyaltyWeight([
      { topic: 'values', signal: 'disloyal' },
      { topic: 'family', signal: 'wavering' },
      { topic: 'finance', signal: 'loyal' },
    ]);
    expect(disloyalDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicLoyaltyWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicLoyaltyWeight([
      { topic: 'values', signal: 'loyal' },
      { topic: 'family', signal: 'disloyal' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
