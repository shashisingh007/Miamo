import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicMeaningMakingDepth, fragmentedMeaningDtmTopics } from '../dtmTopicMeaningMakingDepth';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicMeaningMakingDepth', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicMeaningMakingDepth([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicMeaningMakingDepth([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('integrative => reflective', () => {
    const r = summarizeDtmTopicMeaningMakingDepth([{ topic: 'values', signal: 'integrative' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('reflective');
  });

  it('reflective => descriptive', () => {
    const r = summarizeDtmTopicMeaningMakingDepth([{ topic: 'values', signal: 'reflective' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('descriptive');
  });

  it('descriptive => descriptive', () => {
    const r = summarizeDtmTopicMeaningMakingDepth([{ topic: 'values', signal: 'descriptive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('descriptive');
  });

  it('fragmentary => incoherent', () => {
    const r = summarizeDtmTopicMeaningMakingDepth([{ topic: 'values', signal: 'fragmentary' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('incoherent');
  });

  it('incoherent => incoherent', () => {
    const r = summarizeDtmTopicMeaningMakingDepth([{ topic: 'values', signal: 'incoherent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('incoherent');
  });

  it('mixed 0.5 => fragmentary', () => {
    const r = summarizeDtmTopicMeaningMakingDepth([
      { topic: 'values', signal: 'integrative' },
      { topic: 'values', signal: 'incoherent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('fragmentary');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicMeaningMakingDepth([{ topic: 'x', signal: 'integrative' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicMeaningMakingDepth([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicMeaningMakingDepth([
      { topic: 'values', signal: 'integrative' },
      { topic: 'values', signal: 'fragmentary' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('fragmentedMeaningDtmTopics filter', () => {
    const r = summarizeDtmTopicMeaningMakingDepth([
      { topic: 'values', signal: 'incoherent' },
      { topic: 'family', signal: 'fragmentary' },
      { topic: 'finance', signal: 'integrative' },
    ]);
    expect(fragmentedMeaningDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicMeaningMakingDepth([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicMeaningMakingDepth([
      { topic: 'values', signal: 'integrative' },
      { topic: 'family', signal: 'incoherent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
