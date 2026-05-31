import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAccountabilityFlow, unaccountableDtmTopics } from '../dtmTopicAccountabilityFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAccountabilityFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAccountabilityFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAccountabilityFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('accountable', () => {
    const r = summarizeDtmTopicAccountabilityFlow([{ topic: 'values', signal: 'accountable' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('accountable');
  });

  it('owning => mixed', () => {
    const r = summarizeDtmTopicAccountabilityFlow([{ topic: 'values', signal: 'owning' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicAccountabilityFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('deflecting', () => {
    const r = summarizeDtmTopicAccountabilityFlow([{ topic: 'values', signal: 'deflecting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('evading');
  });

  it('evading', () => {
    const r = summarizeDtmTopicAccountabilityFlow([{ topic: 'values', signal: 'evading' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('evading');
  });

  it('mid', () => {
    const r = summarizeDtmTopicAccountabilityFlow([
      { topic: 'values', signal: 'accountable' },
      { topic: 'values', signal: 'evading' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('deflecting');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAccountabilityFlow([{ topic: 'x', signal: 'accountable' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAccountabilityFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAccountabilityFlow([
      { topic: 'values', signal: 'accountable' },
      { topic: 'values', signal: 'evading' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('unaccountableDtmTopics filter', () => {
    const r = summarizeDtmTopicAccountabilityFlow([
      { topic: 'values', signal: 'evading' },
      { topic: 'family', signal: 'deflecting' },
      { topic: 'finance', signal: 'accountable' },
    ]);
    expect(unaccountableDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAccountabilityFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAccountabilityFlow([
      { topic: 'values', signal: 'accountable' },
      { topic: 'family', signal: 'evading' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
