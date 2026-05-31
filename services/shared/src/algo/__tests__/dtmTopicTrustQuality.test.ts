import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicTrustQuality, untrustworthyDtmTopics } from '../dtmTopicTrustQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicTrustQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicTrustQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicTrustQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('trustworthy => trustworthy', () => {
    const r = summarizeDtmTopicTrustQuality([{ topic: 'values', signal: 'trustworthy' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('trustworthy');
  });

  it('reliable => mixed', () => {
    const r = summarizeDtmTopicTrustQuality([{ topic: 'values', signal: 'reliable' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicTrustQuality([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('unreliable => untrustworthy', () => {
    const r = summarizeDtmTopicTrustQuality([{ topic: 'values', signal: 'unreliable' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untrustworthy');
  });

  it('untrustworthy => untrustworthy', () => {
    const r = summarizeDtmTopicTrustQuality([{ topic: 'values', signal: 'untrustworthy' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untrustworthy');
  });

  it('mid => unreliable', () => {
    const r = summarizeDtmTopicTrustQuality([
      { topic: 'values', signal: 'trustworthy' },
      { topic: 'values', signal: 'untrustworthy' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unreliable');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicTrustQuality([{ topic: 'x', signal: 'trustworthy' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicTrustQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicTrustQuality([
      { topic: 'values', signal: 'trustworthy' },
      { topic: 'values', signal: 'unreliable' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('untrustworthyDtmTopics filter', () => {
    const r = summarizeDtmTopicTrustQuality([
      { topic: 'values', signal: 'untrustworthy' },
      { topic: 'family', signal: 'unreliable' },
      { topic: 'finance', signal: 'trustworthy' },
    ]);
    expect(untrustworthyDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicTrustQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicTrustQuality([
      { topic: 'values', signal: 'trustworthy' },
      { topic: 'family', signal: 'untrustworthy' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
