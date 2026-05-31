import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicEmotionalRegulation, floodedDtmTopics } from '../dtmTopicEmotionalRegulation';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicEmotionalRegulation', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicEmotionalRegulation([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicEmotionalRegulation([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('regulated => regulated', () => {
    const r = summarizeDtmTopicEmotionalRegulation([{ topic: 'values', signal: 'regulated' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('regulated');
  });

  it('composed => wobbly', () => {
    const r = summarizeDtmTopicEmotionalRegulation([{ topic: 'values', signal: 'composed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('wobbly');
  });

  it('wobbly => wobbly', () => {
    const r = summarizeDtmTopicEmotionalRegulation([{ topic: 'values', signal: 'wobbly' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('wobbly');
  });

  it('reactive => flooded', () => {
    const r = summarizeDtmTopicEmotionalRegulation([{ topic: 'values', signal: 'reactive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flooded');
  });

  it('flooded => flooded', () => {
    const r = summarizeDtmTopicEmotionalRegulation([{ topic: 'values', signal: 'flooded' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flooded');
  });

  it('mixed 0.5 => reactive', () => {
    const r = summarizeDtmTopicEmotionalRegulation([
      { topic: 'values', signal: 'regulated' },
      { topic: 'values', signal: 'flooded' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('reactive');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicEmotionalRegulation([{ topic: 'x', signal: 'composed' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicEmotionalRegulation([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicEmotionalRegulation([
      { topic: 'values', signal: 'composed' },
      { topic: 'values', signal: 'wobbly' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('floodedDtmTopics filters', () => {
    const r = summarizeDtmTopicEmotionalRegulation([
      { topic: 'values', signal: 'flooded' },
      { topic: 'family', signal: 'reactive' },
      { topic: 'finance', signal: 'regulated' },
    ]);
    expect(floodedDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicEmotionalRegulation([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicEmotionalRegulation([
      { topic: 'values', signal: 'regulated' },
      { topic: 'family', signal: 'flooded' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
