import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAdaptabilityWeight, inflexibleDtmTopics } from '../dtmTopicAdaptabilityWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAdaptabilityWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAdaptabilityWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAdaptabilityWeight([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('flexible', () => {
    const r = summarizeDtmTopicAdaptabilityWeight([{ topic: 'values', signal: 'flexible' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flexible');
  });

  it('adaptive => mixed', () => {
    const r = summarizeDtmTopicAdaptabilityWeight([{ topic: 'values', signal: 'adaptive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicAdaptabilityWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('rigid => inflexible', () => {
    const r = summarizeDtmTopicAdaptabilityWeight([{ topic: 'values', signal: 'rigid' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('inflexible');
  });

  it('inflexible', () => {
    const r = summarizeDtmTopicAdaptabilityWeight([{ topic: 'values', signal: 'inflexible' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('inflexible');
  });

  it('mid => rigid', () => {
    const r = summarizeDtmTopicAdaptabilityWeight([
      { topic: 'values', signal: 'flexible' },
      { topic: 'values', signal: 'inflexible' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('rigid');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAdaptabilityWeight([{ topic: 'x', signal: 'flexible' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAdaptabilityWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAdaptabilityWeight([
      { topic: 'values', signal: 'flexible' },
      { topic: 'values', signal: 'rigid' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('inflexibleDtmTopics filter', () => {
    const r = summarizeDtmTopicAdaptabilityWeight([
      { topic: 'values', signal: 'inflexible' },
      { topic: 'family', signal: 'rigid' },
      { topic: 'finance', signal: 'flexible' },
    ]);
    expect(inflexibleDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAdaptabilityWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAdaptabilityWeight([
      { topic: 'values', signal: 'flexible' },
      { topic: 'family', signal: 'inflexible' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
