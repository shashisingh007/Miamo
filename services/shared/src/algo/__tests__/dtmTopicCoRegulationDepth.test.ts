import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicCoRegulationDepth,
  dysregulatedDtmTopics,
} from '../dtmTopicCoRegulationDepth';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCoRegulationDepth', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicCoRegulationDepth([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCoRegulationDepth([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('mutual-soothing => co-regulated', () => {
    const r = summarizeDtmTopicCoRegulationDepth([{ topic: 'intimacy', signal: 'mutual-soothing' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('co-regulated');
  });

  it('one-way-soothing (0.8) => partial', () => {
    const r = summarizeDtmTopicCoRegulationDepth([{ topic: 'intimacy', signal: 'one-way-soothing' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('partial');
  });

  it('partial-presence (0.55) => partial', () => {
    const r = summarizeDtmTopicCoRegulationDepth([{ topic: 'intimacy', signal: 'partial-presence' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('partial');
  });

  it('distracted (0.25) => dysregulated', () => {
    const r = summarizeDtmTopicCoRegulationDepth([{ topic: 'intimacy', signal: 'distracted' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('dysregulated');
  });

  it('dysregulated => dysregulated', () => {
    const r = summarizeDtmTopicCoRegulationDepth([{ topic: 'intimacy', signal: 'dysregulated' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('dysregulated');
  });

  it('mixed (0.5) => distracted', () => {
    const r = summarizeDtmTopicCoRegulationDepth([
      { topic: 'intimacy', signal: 'mutual-soothing' },
      { topic: 'intimacy', signal: 'dysregulated' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('distracted');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicCoRegulationDepth([{ topic: 'x', signal: 'mutual-soothing' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicCoRegulationDepth([{ topic: 'intimacy', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'intimacy')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCoRegulationDepth([
      { topic: 'intimacy', signal: 'mutual-soothing' },
      { topic: 'intimacy', signal: 'one-way-soothing' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.n).toBe(2);
  });

  it('dysregulatedDtmTopics filters', () => {
    const r = summarizeDtmTopicCoRegulationDepth([
      { topic: 'intimacy', signal: 'dysregulated' },
      { topic: 'leisure', signal: 'mutual-soothing' },
    ]);
    expect(dysregulatedDtmTopics(r)).toHaveLength(1);
    expect(dysregulatedDtmTopics(r)[0].topic).toBe('intimacy');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicCoRegulationDepth([
      { topic: 'intimacy', signal: 'mutual-soothing' },
      { topic: 'leisure', signal: 'dysregulated' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicCoRegulationDepth([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
