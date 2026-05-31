import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicFreedomQuality, trappedDtmTopics } from '../dtmTopicFreedomQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicFreedomQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicFreedomQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicFreedomQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('free => open', () => {
    const r = summarizeDtmTopicFreedomQuality([{ topic: 'values', signal: 'free' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('open');
  });

  it('open => mixed', () => {
    const r = summarizeDtmTopicFreedomQuality([{ topic: 'values', signal: 'open' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicFreedomQuality([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('constrained => trapped', () => {
    const r = summarizeDtmTopicFreedomQuality([{ topic: 'values', signal: 'constrained' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('trapped');
  });

  it('trapped => trapped', () => {
    const r = summarizeDtmTopicFreedomQuality([{ topic: 'values', signal: 'trapped' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('trapped');
  });

  it('mixed midpoint => constrained', () => {
    const r = summarizeDtmTopicFreedomQuality([
      { topic: 'values', signal: 'free' },
      { topic: 'values', signal: 'trapped' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('constrained');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicFreedomQuality([{ topic: 'x', signal: 'free' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicFreedomQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicFreedomQuality([
      { topic: 'values', signal: 'free' },
      { topic: 'values', signal: 'constrained' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('trappedDtmTopics filter', () => {
    const r = summarizeDtmTopicFreedomQuality([
      { topic: 'values', signal: 'trapped' },
      { topic: 'family', signal: 'constrained' },
      { topic: 'finance', signal: 'free' },
    ]);
    expect(trappedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicFreedomQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicFreedomQuality([
      { topic: 'values', signal: 'free' },
      { topic: 'family', signal: 'trapped' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
