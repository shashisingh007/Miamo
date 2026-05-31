import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicVitalityQuality, depletedDtmTopics } from '../dtmTopicVitalityQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicVitalityQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicVitalityQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicVitalityQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('vibrant => energized', () => {
    const r = summarizeDtmTopicVitalityQuality([{ topic: 'values', signal: 'vibrant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('energized');
  });

  it('energized => mixed', () => {
    const r = summarizeDtmTopicVitalityQuality([{ topic: 'values', signal: 'energized' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicVitalityQuality([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('tired => depleted', () => {
    const r = summarizeDtmTopicVitalityQuality([{ topic: 'values', signal: 'tired' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('depleted');
  });

  it('depleted => depleted', () => {
    const r = summarizeDtmTopicVitalityQuality([{ topic: 'values', signal: 'depleted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('depleted');
  });

  it('mixed midpoint => tired', () => {
    const r = summarizeDtmTopicVitalityQuality([
      { topic: 'values', signal: 'vibrant' },
      { topic: 'values', signal: 'depleted' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tired');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicVitalityQuality([{ topic: 'x', signal: 'vibrant' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicVitalityQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicVitalityQuality([
      { topic: 'values', signal: 'vibrant' },
      { topic: 'values', signal: 'tired' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('depletedDtmTopics filter', () => {
    const r = summarizeDtmTopicVitalityQuality([
      { topic: 'values', signal: 'depleted' },
      { topic: 'family', signal: 'tired' },
      { topic: 'finance', signal: 'vibrant' },
    ]);
    expect(depletedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicVitalityQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicVitalityQuality([
      { topic: 'values', signal: 'vibrant' },
      { topic: 'family', signal: 'depleted' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
