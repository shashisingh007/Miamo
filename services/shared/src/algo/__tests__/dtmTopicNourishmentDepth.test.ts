import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicNourishmentDepth, depletingDtmTopics } from '../dtmTopicNourishmentDepth';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicNourishmentDepth', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicNourishmentDepth([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicNourishmentDepth([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('nourishing => nourishing', () => {
    const r = summarizeDtmTopicNourishmentDepth([{ topic: 'values', signal: 'nourishing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('nourishing');
  });

  it('sustaining => mixed', () => {
    const r = summarizeDtmTopicNourishmentDepth([{ topic: 'values', signal: 'sustaining' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicNourishmentDepth([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('thin => depleting', () => {
    const r = summarizeDtmTopicNourishmentDepth([{ topic: 'values', signal: 'thin' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('depleting');
  });

  it('depleting => depleting', () => {
    const r = summarizeDtmTopicNourishmentDepth([{ topic: 'values', signal: 'depleting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('depleting');
  });

  it('mixed midpoint => thin', () => {
    const r = summarizeDtmTopicNourishmentDepth([
      { topic: 'values', signal: 'nourishing' },
      { topic: 'values', signal: 'depleting' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('thin');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicNourishmentDepth([{ topic: 'x', signal: 'nourishing' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicNourishmentDepth([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicNourishmentDepth([
      { topic: 'values', signal: 'nourishing' },
      { topic: 'values', signal: 'thin' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('depletingDtmTopics filter', () => {
    const r = summarizeDtmTopicNourishmentDepth([
      { topic: 'values', signal: 'depleting' },
      { topic: 'family', signal: 'thin' },
      { topic: 'finance', signal: 'nourishing' },
    ]);
    expect(depletingDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicNourishmentDepth([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicNourishmentDepth([
      { topic: 'values', signal: 'nourishing' },
      { topic: 'family', signal: 'depleting' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
