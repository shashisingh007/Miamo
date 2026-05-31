import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicWitnessingDepth, invisibleDtmTopics } from '../dtmTopicWitnessingDepth';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicWitnessingDepth', () => {
  it('returns 16 in canonical order', () => {
    const r = summarizeDtmTopicWitnessingDepth([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicWitnessingDepth([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('fully-witnessed => witnessed', () => {
    const r = summarizeDtmTopicWitnessingDepth([{ topic: 'communication', signal: 'fully-witnessed' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('witnessed');
  });

  it('witnessed (0.8) => partial', () => {
    const r = summarizeDtmTopicWitnessingDepth([{ topic: 'communication', signal: 'witnessed' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('partial');
  });

  it('partially-witnessed => partial', () => {
    const r = summarizeDtmTopicWitnessingDepth([
      { topic: 'communication', signal: 'partially-witnessed' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('partial');
  });

  it('overlooked => invisible', () => {
    const r = summarizeDtmTopicWitnessingDepth([{ topic: 'communication', signal: 'overlooked' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('invisible');
  });

  it('invisible => invisible', () => {
    const r = summarizeDtmTopicWitnessingDepth([{ topic: 'communication', signal: 'invisible' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('invisible');
  });

  it('mixed 0.5 => overlooked', () => {
    const r = summarizeDtmTopicWitnessingDepth([
      { topic: 'communication', signal: 'fully-witnessed' },
      { topic: 'communication', signal: 'invisible' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('overlooked');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicWitnessingDepth([{ topic: 'x', signal: 'fully-witnessed' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicWitnessingDepth([{ topic: 'communication', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicWitnessingDepth([
      { topic: 'communication', signal: 'fully-witnessed' },
      { topic: 'communication', signal: 'witnessed' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(2);
  });

  it('invisibleDtmTopics filters', () => {
    const r = summarizeDtmTopicWitnessingDepth([
      { topic: 'communication', signal: 'invisible' },
      { topic: 'family', signal: 'overlooked' },
      { topic: 'finance', signal: 'fully-witnessed' },
    ]);
    expect(invisibleDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicWitnessingDepth([
      { topic: 'communication', signal: 'fully-witnessed' },
      { topic: 'family', signal: 'invisible' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicWitnessingDepth([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
