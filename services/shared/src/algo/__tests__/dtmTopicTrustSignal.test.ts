import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicTrustSignal, betrayedDtmTopics } from '../dtmTopicTrustSignal';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicTrustSignal', () => {
  it('returns 16 canonical', () => {
    const r = summarizeDtmTopicTrustSignal([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicTrustSignal([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('unconditional-trust => trust', () => {
    const r = summarizeDtmTopicTrustSignal([
      { topic: 'values', signal: 'unconditional-trust' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('trust');
  });

  it('trust (0.8) => conditional', () => {
    const r = summarizeDtmTopicTrustSignal([{ topic: 'values', signal: 'trust' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('conditional');
  });

  it('conditional-trust => conditional', () => {
    const r = summarizeDtmTopicTrustSignal([
      { topic: 'values', signal: 'conditional-trust' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('conditional');
  });

  it('distrust => betrayal', () => {
    const r = summarizeDtmTopicTrustSignal([{ topic: 'values', signal: 'distrust' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('betrayal');
  });

  it('betrayal => betrayal', () => {
    const r = summarizeDtmTopicTrustSignal([{ topic: 'values', signal: 'betrayal' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('betrayal');
  });

  it('mixed 0.5 => distrust', () => {
    const r = summarizeDtmTopicTrustSignal([
      { topic: 'values', signal: 'unconditional-trust' },
      { topic: 'values', signal: 'betrayal' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('distrust');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicTrustSignal([{ topic: 'q', signal: 'trust' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicTrustSignal([
      { topic: 'values', signal: 'wat' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicTrustSignal([
      { topic: 'values', signal: 'trust' },
      { topic: 'values', signal: 'distrust' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('betrayedDtmTopics filters', () => {
    const r = summarizeDtmTopicTrustSignal([
      { topic: 'values', signal: 'betrayal' },
      { topic: 'family', signal: 'distrust' },
      { topic: 'finance', signal: 'unconditional-trust' },
    ]);
    expect(betrayedDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicTrustSignal([
      { topic: 'values', signal: 'unconditional-trust' },
      { topic: 'family', signal: 'betrayal' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicTrustSignal([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
