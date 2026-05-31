import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicValuingFlow, stalledDtmTopics } from '../dtmTopicValuingFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicValuingFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicValuingFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicValuingFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('flowing => flowing', () => {
    const r = summarizeDtmTopicValuingFlow([{ topic: 'values', signal: 'flowing-valuation' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flowing');
  });

  it('steady => partial', () => {
    const r = summarizeDtmTopicValuingFlow([{ topic: 'values', signal: 'steady-valuation' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial');
  });

  it('partial => partial', () => {
    const r = summarizeDtmTopicValuingFlow([{ topic: 'values', signal: 'partial-valuation' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial');
  });

  it('sporadic => stalled', () => {
    const r = summarizeDtmTopicValuingFlow([{ topic: 'values', signal: 'sporadic-valuation' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('stalled');
  });

  it('stalled => stalled', () => {
    const r = summarizeDtmTopicValuingFlow([{ topic: 'values', signal: 'stalled-valuation' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('stalled');
  });

  it('mixed 0.5 => sporadic', () => {
    const r = summarizeDtmTopicValuingFlow([
      { topic: 'values', signal: 'flowing-valuation' },
      { topic: 'values', signal: 'stalled-valuation' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('sporadic');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicValuingFlow([{ topic: 'x', signal: 'steady-valuation' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicValuingFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicValuingFlow([
      { topic: 'values', signal: 'steady-valuation' },
      { topic: 'values', signal: 'partial-valuation' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('stalledDtmTopics filters', () => {
    const r = summarizeDtmTopicValuingFlow([
      { topic: 'values', signal: 'stalled-valuation' },
      { topic: 'family', signal: 'sporadic-valuation' },
      { topic: 'finance', signal: 'flowing-valuation' },
    ]);
    expect(stalledDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicValuingFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicValuingFlow([
      { topic: 'values', signal: 'flowing-valuation' },
      { topic: 'family', signal: 'stalled-valuation' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
