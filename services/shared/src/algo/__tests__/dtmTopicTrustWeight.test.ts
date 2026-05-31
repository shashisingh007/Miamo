import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicTrustWeight, distrustfulDtmTopics } from '../dtmTopicTrustWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicTrustWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicTrustWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicTrustWeight([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('trusting => trusting', () => {
    const r = summarizeDtmTopicTrustWeight([{ topic: 'values', signal: 'trusting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('trusting');
  });

  it('confiding => mixed', () => {
    const r = summarizeDtmTopicTrustWeight([{ topic: 'values', signal: 'confiding' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicTrustWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('wary => distrustful', () => {
    const r = summarizeDtmTopicTrustWeight([{ topic: 'values', signal: 'wary' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('distrustful');
  });

  it('distrustful => distrustful', () => {
    const r = summarizeDtmTopicTrustWeight([{ topic: 'values', signal: 'distrustful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('distrustful');
  });

  it('mixed midpoint => wary', () => {
    const r = summarizeDtmTopicTrustWeight([
      { topic: 'values', signal: 'trusting' },
      { topic: 'values', signal: 'distrustful' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('wary');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicTrustWeight([{ topic: 'x', signal: 'trusting' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicTrustWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicTrustWeight([
      { topic: 'values', signal: 'trusting' },
      { topic: 'values', signal: 'wary' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('distrustfulDtmTopics filter', () => {
    const r = summarizeDtmTopicTrustWeight([
      { topic: 'values', signal: 'distrustful' },
      { topic: 'family', signal: 'wary' },
      { topic: 'finance', signal: 'trusting' },
    ]);
    expect(distrustfulDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicTrustWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicTrustWeight([
      { topic: 'values', signal: 'trusting' },
      { topic: 'family', signal: 'distrustful' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
