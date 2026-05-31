import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAccountabilityStance, blamingDtmTopics } from '../dtmTopicAccountabilityStance';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAccountabilityStance', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAccountabilityStance([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAccountabilityStance([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('owning => accountable', () => {
    const r = summarizeDtmTopicAccountabilityStance([{ topic: 'values', signal: 'owning' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('accountable');
  });

  it('accountable => partial', () => {
    const r = summarizeDtmTopicAccountabilityStance([{ topic: 'values', signal: 'accountable' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial');
  });

  it('partial => partial', () => {
    const r = summarizeDtmTopicAccountabilityStance([{ topic: 'values', signal: 'partial' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial');
  });

  it('deflecting => blaming', () => {
    const r = summarizeDtmTopicAccountabilityStance([{ topic: 'values', signal: 'deflecting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('blaming');
  });

  it('blaming => blaming', () => {
    const r = summarizeDtmTopicAccountabilityStance([{ topic: 'values', signal: 'blaming' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('blaming');
  });

  it('mixed 0.5 => deflecting', () => {
    const r = summarizeDtmTopicAccountabilityStance([
      { topic: 'values', signal: 'owning' },
      { topic: 'values', signal: 'blaming' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('deflecting');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAccountabilityStance([{ topic: 'x', signal: 'owning' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAccountabilityStance([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAccountabilityStance([
      { topic: 'values', signal: 'owning' },
      { topic: 'values', signal: 'partial' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('blamingDtmTopics filters', () => {
    const r = summarizeDtmTopicAccountabilityStance([
      { topic: 'values', signal: 'blaming' },
      { topic: 'family', signal: 'deflecting' },
      { topic: 'finance', signal: 'owning' },
    ]);
    expect(blamingDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicAccountabilityStance([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAccountabilityStance([
      { topic: 'values', signal: 'owning' },
      { topic: 'family', signal: 'blaming' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
