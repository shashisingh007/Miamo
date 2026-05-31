import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicDevotionDepth, indifferentDtmTopics } from '../dtmTopicDevotionDepth';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicDevotionDepth', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicDevotionDepth([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicDevotionDepth([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('consecrated => devoted', () => {
    const r = summarizeDtmTopicDevotionDepth([{ topic: 'values', signal: 'consecrated' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('devoted');
  });

  it('devoted => committed', () => {
    const r = summarizeDtmTopicDevotionDepth([{ topic: 'values', signal: 'devoted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('committed');
  });

  it('committed => committed', () => {
    const r = summarizeDtmTopicDevotionDepth([{ topic: 'values', signal: 'committed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('committed');
  });

  it('distracted => indifferent', () => {
    const r = summarizeDtmTopicDevotionDepth([{ topic: 'values', signal: 'distracted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('indifferent');
  });

  it('indifferent => indifferent', () => {
    const r = summarizeDtmTopicDevotionDepth([{ topic: 'values', signal: 'indifferent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('indifferent');
  });

  it('mixed 0.5 => distracted', () => {
    const r = summarizeDtmTopicDevotionDepth([
      { topic: 'values', signal: 'consecrated' },
      { topic: 'values', signal: 'indifferent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('distracted');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicDevotionDepth([{ topic: 'x', signal: 'consecrated' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicDevotionDepth([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicDevotionDepth([
      { topic: 'values', signal: 'consecrated' },
      { topic: 'values', signal: 'distracted' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('indifferentDtmTopics filter', () => {
    const r = summarizeDtmTopicDevotionDepth([
      { topic: 'values', signal: 'indifferent' },
      { topic: 'family', signal: 'distracted' },
      { topic: 'finance', signal: 'consecrated' },
    ]);
    expect(indifferentDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicDevotionDepth([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicDevotionDepth([
      { topic: 'values', signal: 'consecrated' },
      { topic: 'family', signal: 'indifferent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
