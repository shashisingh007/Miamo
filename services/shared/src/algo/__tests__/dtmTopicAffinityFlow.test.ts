import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAffinityFlow, aversiveDtmTopics } from '../dtmTopicAffinityFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAffinityFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAffinityFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAffinityFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('aligned', () => {
    const r = summarizeDtmTopicAffinityFlow([{ topic: 'values', signal: 'aligned' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('aligned');
  });

  it('drawn => mixed', () => {
    const r = summarizeDtmTopicAffinityFlow([{ topic: 'values', signal: 'drawn' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicAffinityFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('distant => averse', () => {
    const r = summarizeDtmTopicAffinityFlow([{ topic: 'values', signal: 'distant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('averse');
  });

  it('averse', () => {
    const r = summarizeDtmTopicAffinityFlow([{ topic: 'values', signal: 'averse' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('averse');
  });

  it('mid', () => {
    const r = summarizeDtmTopicAffinityFlow([
      { topic: 'values', signal: 'aligned' },
      { topic: 'values', signal: 'averse' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('distant');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAffinityFlow([{ topic: 'x', signal: 'aligned' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAffinityFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAffinityFlow([
      { topic: 'values', signal: 'aligned' },
      { topic: 'values', signal: 'averse' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('aversiveDtmTopics filter', () => {
    const r = summarizeDtmTopicAffinityFlow([
      { topic: 'values', signal: 'averse' },
      { topic: 'family', signal: 'distant' },
      { topic: 'finance', signal: 'aligned' },
    ]);
    expect(aversiveDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAffinityFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAffinityFlow([
      { topic: 'values', signal: 'aligned' },
      { topic: 'family', signal: 'averse' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
