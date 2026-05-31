import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicHumilityTone, arrogantDtmTopics } from '../dtmTopicHumilityTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicHumilityTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicHumilityTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicHumilityTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('humble => modest band', () => {
    const r = summarizeDtmTopicHumilityTone([{ topic: 'values', signal: 'humble' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('modest');
  });

  it('modest => mixed', () => {
    const r = summarizeDtmTopicHumilityTone([{ topic: 'values', signal: 'modest' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicHumilityTone([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('assertive', () => {
    const r = summarizeDtmTopicHumilityTone([{ topic: 'values', signal: 'assertive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('arrogant');
  });

  it('arrogant', () => {
    const r = summarizeDtmTopicHumilityTone([{ topic: 'values', signal: 'arrogant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('arrogant');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicHumilityTone([
      { topic: 'values', signal: 'humble' },
      { topic: 'values', signal: 'arrogant' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('assertive');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicHumilityTone([{ topic: 'x', signal: 'humble' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicHumilityTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicHumilityTone([
      { topic: 'values', signal: 'humble' },
      { topic: 'values', signal: 'arrogant' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('arrogantDtmTopics filter', () => {
    const r = summarizeDtmTopicHumilityTone([
      { topic: 'values', signal: 'arrogant' },
      { topic: 'family', signal: 'assertive' },
      { topic: 'finance', signal: 'humble' },
    ]);
    expect(arrogantDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicHumilityTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicHumilityTone([
      { topic: 'values', signal: 'humble' },
      { topic: 'family', signal: 'arrogant' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
