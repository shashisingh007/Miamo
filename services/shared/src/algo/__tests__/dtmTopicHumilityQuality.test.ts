import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicHumilityQuality, arrogantDtmTopics } from '../dtmTopicHumilityQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicHumilityQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicHumilityQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicHumilityQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('humble => humble', () => {
    const r = summarizeDtmTopicHumilityQuality([{ topic: 'values', signal: 'humble' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('humble');
  });

  it('modest => mixed', () => {
    const r = summarizeDtmTopicHumilityQuality([{ topic: 'values', signal: 'modest' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicHumilityQuality([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('proud => arrogant', () => {
    const r = summarizeDtmTopicHumilityQuality([{ topic: 'values', signal: 'proud' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('arrogant');
  });

  it('arrogant => arrogant', () => {
    const r = summarizeDtmTopicHumilityQuality([{ topic: 'values', signal: 'arrogant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('arrogant');
  });

  it('mid => proud', () => {
    const r = summarizeDtmTopicHumilityQuality([
      { topic: 'values', signal: 'humble' },
      { topic: 'values', signal: 'arrogant' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('proud');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicHumilityQuality([{ topic: 'x', signal: 'humble' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicHumilityQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicHumilityQuality([
      { topic: 'values', signal: 'humble' },
      { topic: 'values', signal: 'proud' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('arrogantDtmTopics filter', () => {
    const r = summarizeDtmTopicHumilityQuality([
      { topic: 'values', signal: 'arrogant' },
      { topic: 'family', signal: 'proud' },
      { topic: 'finance', signal: 'humble' },
    ]);
    expect(arrogantDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicHumilityQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicHumilityQuality([
      { topic: 'values', signal: 'humble' },
      { topic: 'family', signal: 'arrogant' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
