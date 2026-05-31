import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicGratitudeCycle, resentfulDtmTopics } from '../dtmTopicGratitudeCycle';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGratitudeCycle', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicGratitudeCycle([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicGratitudeCycle([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('profound => grateful', () => {
    const r = summarizeDtmTopicGratitudeCycle([{ topic: 'values', signal: 'profound' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('grateful');
  });

  it('grateful => mixed', () => {
    const r = summarizeDtmTopicGratitudeCycle([{ topic: 'values', signal: 'grateful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicGratitudeCycle([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('indifferent => resentful', () => {
    const r = summarizeDtmTopicGratitudeCycle([{ topic: 'values', signal: 'indifferent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('resentful');
  });

  it('resentful => resentful', () => {
    const r = summarizeDtmTopicGratitudeCycle([{ topic: 'values', signal: 'resentful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('resentful');
  });

  it('mixed midpoint => indifferent', () => {
    const r = summarizeDtmTopicGratitudeCycle([
      { topic: 'values', signal: 'profound' },
      { topic: 'values', signal: 'resentful' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('indifferent');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicGratitudeCycle([{ topic: 'x', signal: 'profound' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicGratitudeCycle([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicGratitudeCycle([
      { topic: 'values', signal: 'profound' },
      { topic: 'values', signal: 'indifferent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('resentfulDtmTopics filter', () => {
    const r = summarizeDtmTopicGratitudeCycle([
      { topic: 'values', signal: 'resentful' },
      { topic: 'family', signal: 'indifferent' },
      { topic: 'finance', signal: 'profound' },
    ]);
    expect(resentfulDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicGratitudeCycle([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicGratitudeCycle([
      { topic: 'values', signal: 'profound' },
      { topic: 'family', signal: 'resentful' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
